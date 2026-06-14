import { Router, Response } from "express";
import { prisma } from "../db/prisma";
import { generateApiKey, maskApiKey } from "../lib/apiKeys";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function serializeClient(client: any) {
  const activeKey = client.projectApiKeys?.[0] ?? null;
  const currentMember = client.projectMembers?.[0] ?? null;

  return {
    id:           client.id,
    name:         client.name,
    domain:       client.domain,
    trackingId:   client.trackingId,
    isActive:     client.isActive,
    createdAt:    client.createdAt,
    role:         currentMember?.role?.toLowerCase?.() ?? "owner",
    activeApiKey: activeKey
      ? {
          id:        activeKey.id,
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

async function getAccessibleClient(clientId: string, userId: string) {
  return prisma.client.findFirst({
    where: {
      id: clientId,
      OR: [
        { userId },
        { projectMembers: { some: { userId } } },
      ],
    },
    include: {
      projectMembers: {
        where: { userId },
        take: 1,
      },
    },
  });
}

async function getOwnedClient(clientId: string, userId: string) {
  return prisma.client.findFirst({
    where: {
      id: clientId,
      OR: [
        { userId },
        { projectMembers: { some: { userId, role: "OWNER" } } },
      ],
    },
  });
}

async function resolveClientId(req: AuthRequest, ownerOnly = false): Promise<string | null> {
  const requestedClientId =
    typeof req.body?.projectId === "string" ? req.body.projectId :
    typeof req.body?.clientId === "string" ? req.body.clientId :
    typeof req.query.projectId === "string" ? req.query.projectId :
    typeof req.query.clientId === "string" ? req.query.clientId :
    "";

  if (requestedClientId) {
    const client = ownerOnly
      ? await getOwnedClient(requestedClientId, req.user!.userId)
      : await getAccessibleClient(requestedClientId, req.user!.userId);
    return client?.id ?? null;
  }

  const client = await prisma.client.findFirst({
    where: ownerOnly
      ? {
          OR: [
            { userId: req.user!.userId },
            { projectMembers: { some: { userId: req.user!.userId, role: "OWNER" } } },
          ],
        }
      : {
          OR: [
            { userId: req.user!.userId },
            { projectMembers: { some: { userId: req.user!.userId } } },
          ],
        },
    orderBy: { createdAt: "desc" },
  });

  return client?.id ?? null;
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

// ─── GET /api/sdk/projects ────────────────────────────────────────────────────
// List projects the user owns or has joined.

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { userId: req.user!.userId },
          { projectMembers: { some: { userId: req.user!.userId } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        projectApiKeys: {
          where:   { revokedAt: null },
          orderBy: { createdAt: "desc" },
          take:    1,
        },
        projectMembers: {
          where: { userId: req.user!.userId },
          take: 1,
        },
      },
    });

    return res.json(clients.map(serializeClient));
  } catch (err: any) {
    console.error("[SDK] Failed to list projects:", err.message);
    return res.status(500).json({ error: "Failed to load projects" });
  }
});

// ─── POST /api/sdk/projects ───────────────────────────────────────────────────
// Create a new client/project, first API key, and owner membership row.

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

      const [apiKey, member] = await Promise.all([
        tx.projectApiKey.create({
          data: { clientId: client.id, keyPrefix, keyHash },
        }),
        tx.projectMember.create({
          data: { clientId: client.id, userId: req.user!.userId, role: "OWNER" },
        }),
      ]);

      return { client, apiKey, member };
    });

    return res.status(201).json({
      project: serializeClient({
        ...result.client,
        projectApiKeys: [result.apiKey],
        projectMembers: [result.member],
      }),
      apiKey: rawKey,
    });
  } catch (err: any) {
    console.error("[SDK] Failed to create project:", err.message);
    return res.status(500).json({ error: "Failed to create project" });
  }
});

// ─── POST /api/sdk/projects/invite ────────────────────────────────────────────
// Owner generates a short invite code for the selected project/client.

router.post("/invite", async (req: AuthRequest, res: Response) => {
  try {
    const clientId = await resolveClientId(req, true);
    if (!clientId) return res.status(404).json({ error: "Project not found or owner access required" });

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
        clientId,
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
// Authenticated user joins a project/client by invite code.

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
      include: { client: true },
    });

    if (!invite) return res.status(404).json({ error: "Invalid or expired invite code" });

    const member = await prisma.projectMember.upsert({
      where: { clientId_userId: { clientId: invite.clientId, userId: req.user!.userId } },
      update: {},
      create: { clientId: invite.clientId, userId: req.user!.userId, role: "MEMBER" },
      include: { user: true },
    });

    return res.status(201).json({
      project: {
        id: invite.client.id,
        name: invite.client.name,
        domain: invite.client.domain,
        trackingId: invite.client.trackingId,
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
// List members for selected project/client. Supports ?projectId= or ?clientId=.

router.get("/members", async (req: AuthRequest, res: Response) => {
  try {
    const clientId = await resolveClientId(req, false);
    if (!clientId) return res.status(404).json({ error: "Project not found" });

    const members = await prisma.projectMember.findMany({
      where: { clientId },
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
// Owner removes a member from selected project/client. Supports ?projectId=.

router.delete("/members/:userId", async (req: AuthRequest, res: Response) => {
  try {
    const clientId = await resolveClientId(req, true);
    if (!clientId) return res.status(404).json({ error: "Project not found or owner access required" });

    if (req.params.userId === req.user!.userId) {
      return res.status(400).json({ error: "Owner cannot remove themselves" });
    }

    const member = await prisma.projectMember.findUnique({
      where: { clientId_userId: { clientId, userId: req.params.userId } },
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
// Owner only.

router.post("/:id/api-key/regenerate", async (req: AuthRequest, res: Response) => {
  try {
    const client = await getOwnedClient(req.params.id, req.user!.userId);
    if (!client) return res.status(404).json({ error: "Project not found or owner access required" });

    const { rawKey, keyPrefix, keyHash } = generateApiKey();
    const revokedAt = new Date();

    const apiKey = await prisma.$transaction(async (tx) => {
      await tx.projectApiKey.updateMany({
        where: { clientId: client.id, revokedAt: null },
        data:  { revokedAt },
      });

      return tx.projectApiKey.create({
        data: { clientId: client.id, keyPrefix, keyHash },
      });
    });

    return res.json({
      project: serializeClient({ ...client, projectApiKeys: [apiKey], projectMembers: [{ role: "OWNER" }] }),
      apiKey:  rawKey,
    });
  } catch (err: any) {
    console.error("[SDK] Failed to regenerate API key:", err.message);
    return res.status(500).json({ error: "Failed to regenerate API key" });
  }
});

// ─── DELETE /api/sdk/projects/:id ────────────────────────────────────────────
// Owner only.

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const client = await getOwnedClient(req.params.id, req.user!.userId);
    if (!client) return res.status(404).json({ error: "Project not found or owner access required" });

    await prisma.client.delete({ where: { id: client.id } });

    return res.json({ success: true });
  } catch (err: any) {
    console.error("[SDK] Failed to delete project:", err.message);
    return res.status(500).json({ error: "Failed to delete project" });
  }
});

export default router;
