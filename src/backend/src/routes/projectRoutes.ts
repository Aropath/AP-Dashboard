import { Router, Response } from "express";
import { randomUUID } from "crypto";
import { prisma } from "../db/prisma";
import { generateApiKey, maskApiKey } from "../lib/apiKeys";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function serializeProject(project: any) {
  const activeKey = project.apiKeys ?? null;
  const currentMember = project.members?.[0] ?? null;

  return {
    id:           project.id,
    clientId:     project.clientid,
    name:         project.name,
    domain:       project.client?.domain ?? "—",
    trackingId:   project.client?.trackingId ?? null,
    isActive:     project.client?.isActive ?? true,
    createdAt:    project.created_at,
    role:         currentMember?.role?.toLowerCase?.() ?? "owner",
    activeApiKey: activeKey
      ? {
          projectId: activeKey.projectId,
          keyPrefix: activeKey.keyPrefix,
          masked:    maskApiKey(activeKey.keyPrefix),
          createdAt: activeKey.createdAt,
          revokedAt: activeKey.revokedAt,
        }
      : null,
  };
}

function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function formatInviteCode(code: string): string {
  return `${code.slice(0, 3)}-${code.slice(3)}`;
}

function generateInviteCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 7; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return formatInviteCode(code);
}

function serializeMember(member: any) {
  return {
    id: member.user.id,
    name: member.user.name,
    email: member.user.email,
    picture: member.user.picture,
    role: member.role.toLowerCase(),
    joinedAt: member.joinedAt,
  };
}

function requestedProjectId(req: AuthRequest): string {
  return (
    (typeof req.params?.id === "string" ? req.params.id : "") ||
    (typeof req.body?.projectId === "string" ? req.body.projectId : "") ||
    (typeof req.query.projectId === "string" ? req.query.projectId : "") ||
    ""
  );
}

function requestedClientId(req: AuthRequest): string {
  return (
    (typeof req.body?.clientId === "string" ? req.body.clientId : "") ||
    (typeof req.query.clientId === "string" ? req.query.clientId : "") ||
    ""
  );
}

async function getAccessibleProject(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { owner_profile_id: userId },
        { client: { userId } },
        { members: { some: { userId } } },
      ],
    },
    include: {
      client: true,
      apiKeys: true,
      members: { where: { userId }, take: 1 },
    },
  });
}

async function getOwnedProject(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { owner_profile_id: userId },
        { client: { userId } },
        { members: { some: { userId, role: "OWNER" } } },
      ],
    },
    include: {
      client: true,
      apiKeys: true,
      members: { where: { userId }, take: 1 },
    },
  });
}

async function resolveProjectId(req: AuthRequest, ownerOnly = false): Promise<string | null> {
  const userId = req.user!.userId;
  const projectId = requestedProjectId(req);

  if (projectId) {
    const project = ownerOnly
      ? await getOwnedProject(projectId, userId)
      : await getAccessibleProject(projectId, userId);
    return project?.id ?? null;
  }

  const clientId = requestedClientId(req);
  if (clientId) {
    const project = await prisma.project.findFirst({
      where: {
        clientid: clientId,
        OR: ownerOnly
          ? [
              { owner_profile_id: userId },
              { client: { userId } },
              { members: { some: { userId, role: "OWNER" } } },
            ]
          : [
              { owner_profile_id: userId },
              { client: { userId } },
              { members: { some: { userId } } },
            ],
      },
      orderBy: { created_at: "desc" },
    });
    return project?.id ?? null;
  }

  const project = await prisma.project.findFirst({
    where: ownerOnly
      ? {
          OR: [
            { owner_profile_id: userId },
            { client: { userId } },
            { members: { some: { userId, role: "OWNER" } } },
          ],
        }
      : {
          OR: [
            { owner_profile_id: userId },
            { client: { userId } },
            { members: { some: { userId } } },
          ],
        },
    orderBy: { created_at: "desc" },
  });

  return project?.id ?? null;
}

// ─── GET /api/sdk/projects ────────────────────────────────────────────────────
// List projects the user owns or has joined.

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { owner_profile_id: req.user!.userId },
          { client: { userId: req.user!.userId } },
          { members: { some: { userId: req.user!.userId } } },
        ],
      },
      orderBy: { created_at: "desc" },
      include: {
        client: true,
        apiKeys: true,
        members: {
          where: { userId: req.user!.userId },
          take: 1,
        },
      },
    });

    return res.json(projects.map(serializeProject));
  } catch (err: any) {
    console.error("[SDK] Failed to list projects:", err.message);
    return res.status(500).json({ error: "Failed to load projects" });
  }
});

// ─── POST /api/sdk/projects ───────────────────────────────────────────────────
// Create a client, app.projects row, first API key, and owner membership row.

router.post("/", async (req: AuthRequest, res: Response) => {
  const name   = typeof req.body?.name   === "string" ? req.body.name.trim()   : "";
  const domain = typeof req.body?.domain === "string" ? req.body.domain.trim() : "";

  if (!name) return res.status(400).json({ error: "Project name is required" });
  if (name.length > 80) return res.status(400).json({ error: "Project name must be 80 characters or fewer" });

  const { rawKey, keyPrefix, keyHash } = generateApiKey();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          userId: req.user!.userId,
          name,
          domain: domain || "—",
        },
      });

      const project = await tx.project.create({
        data: {
          id: randomUUID(),
          name,
          clientid: client.id,
          owner_profile_id: req.user!.userId,
        },
      });

      const [apiKey, member] = await Promise.all([
        tx.projectApiKey.create({
          data: { projectId: project.id, keyPrefix, keyHash },
        }),
        tx.projectMember.create({
          data: { projectId: project.id, userId: req.user!.userId, role: "OWNER" },
        }),
      ]);

      return { client, project, apiKey, member };
    });

    return res.status(201).json({
      project: serializeProject({
        ...result.project,
        client: result.client,
        apiKeys: result.apiKey,
        members: [result.member],
      }),
      apiKey: rawKey,
    });
  } catch (err: any) {
    console.error("[SDK] Failed to create project:", err.message);
    return res.status(500).json({ error: "Failed to create project" });
  }
});

// ─── POST /api/sdk/projects/invite ────────────────────────────────────────────
// Owner generates a short invite code for the selected project.

router.post("/invite", async (req: AuthRequest, res: Response) => {
  try {
    const projectId = await resolveProjectId(req, true);
    if (!projectId) return res.status(404).json({ error: "Project not found or owner access required" });

    let code = generateInviteCode();
    for (let i = 0; i < 5; i += 1) {
      const exists = await prisma.projectInvite.findUnique({ where: { code } });
      if (!exists) break;
      code = generateInviteCode();
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await prisma.projectInvite.create({
      data: {
        code,
        projectId,
        createdBy: req.user!.userId,
        expiresAt,
      },
    });

    return res.status(201).json({ code: invite.code, expiresAt: invite.expiresAt });
  } catch (err: any) {
    console.error("[SDK] Failed to create invite:", err.message);
    return res.status(500).json({ error: "Failed to generate invite code" });
  }
});

// ─── POST /api/sdk/projects/join ──────────────────────────────────────────────
// Authenticated user joins a project by invite code.

router.post("/join", async (req: AuthRequest, res: Response) => {
  const rawCode = typeof req.body?.code === "string" ? req.body.code : "";
  const normalized = normalizeInviteCode(rawCode);
  const code = normalized.length === 7 ? formatInviteCode(normalized) : rawCode.trim().toUpperCase();

  if (!code) return res.status(400).json({ error: "Invite code is required" });

  try {
    const invite = await prisma.projectInvite.findFirst({
      where: {
        code,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: { projects: { include: { client: true } } },
    });

    if (!invite) return res.status(404).json({ error: "Invalid or expired invite code" });

    const member = await prisma.projectMember.upsert({
      where: { projectId_userId: { projectId: invite.projectId, userId: req.user!.userId } },
      update: {},
      create: { projectId: invite.projectId, userId: req.user!.userId, role: "MEMBER" },
      include: { user: true },
    });

    return res.status(201).json({
      project: {
        id: invite.projects.id,
        clientId: invite.projects.clientid,
        name: invite.projects.name,
        domain: invite.projects.client.domain,
        trackingId: invite.projects.client.trackingId,
        role: member.role.toLowerCase(),
      },
      member: serializeMember(member),
    });
  } catch (err: any) {
    console.error("[SDK] Failed to join project:", err.message);
    return res.status(500).json({ error: "Failed to join project" });
  }
});

// ─── GET /api/sdk/projects/members ────────────────────────────────────────────
// List members for selected project. Supports ?projectId= or ?clientId=.

router.get("/members", async (req: AuthRequest, res: Response) => {
  try {
    const projectId = await resolveProjectId(req, false);
    if (!projectId) return res.status(404).json({ error: "Project not found" });

    const members = await prisma.projectMember.findMany({
      where: { projectId },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      include: { user: true },
    });

    return res.json(members.map(serializeMember));
  } catch (err: any) {
    console.error("[SDK] Failed to list members:", err.message);
    return res.status(500).json({ error: "Failed to load members" });
  }
});

// ─── DELETE /api/sdk/projects/members/:userId ────────────────────────────────
// Owner removes a member from selected project. Supports ?projectId=.

router.delete("/members/:userId", async (req: AuthRequest, res: Response) => {
  try {
    const projectId = await resolveProjectId(req, true);
    if (!projectId) return res.status(404).json({ error: "Project not found or owner access required" });

    if (req.params.userId === req.user!.userId) {
      return res.status(400).json({ error: "Owner cannot remove themselves" });
    }

    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.params.userId } },
    });

    if (!member) return res.status(404).json({ error: "Member not found" });
    if (member.role === "OWNER") return res.status(400).json({ error: "Cannot remove project owner" });

    await prisma.projectMember.delete({ where: { id: member.id } });

    return res.json({ success: true });
  } catch (err: any) {
    console.error("[SDK] Failed to remove member:", err.message);
    return res.status(500).json({ error: "Failed to remove member" });
  }
});

// ─── POST /api/sdk/projects/:id/api-key/regenerate ───────────────────────────
// Owner only. :id is project id.

router.post("/:id/api-key/regenerate", async (req: AuthRequest, res: Response) => {
  try {
    const project = await getOwnedProject(req.params.id, req.user!.userId);
    if (!project) return res.status(404).json({ error: "Project not found or owner access required" });

    const { rawKey, keyPrefix, keyHash } = generateApiKey();

    const apiKey = await prisma.projectApiKey.upsert({
      where: { projectId: project.id },
      update: { keyPrefix, keyHash, createdAt: new Date(), revokedAt: null },
      create: { projectId: project.id, keyPrefix, keyHash },
    });

    return res.json({
      project: serializeProject({ ...project, apiKeys: apiKey, members: [{ role: "OWNER" }] }),
      apiKey: rawKey,
    });
  } catch (err: any) {
    console.error("[SDK] Failed to regenerate API key:", err.message);
    return res.status(500).json({ error: "Failed to regenerate API key" });
  }
});

// ─── DELETE /api/sdk/projects/:id ────────────────────────────────────────────
// Owner only. :id is project id.

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const project = await getOwnedProject(req.params.id, req.user!.userId);
    if (!project) return res.status(404).json({ error: "Project not found or owner access required" });

    await prisma.project.delete({ where: { id: project.id } });

    return res.json({ success: true });
  } catch (err: any) {
    console.error("[SDK] Failed to delete project:", err.message);
    return res.status(500).json({ error: "Failed to delete project" });
  }
});

export default router;
