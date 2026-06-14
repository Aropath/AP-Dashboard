import { Response } from "express";
import { randomUUID } from "crypto";
import { AuthRequest } from "../middleware/auth";
import prisma from "../db/prisma";

function clientRole(client: any): "owner" | "member" {
  const project = client.projects?.[0];
  const membership = project?.members?.[0];

  if (client.userId && project?.owner_profile_id && client.userId === project.owner_profile_id) {
    return "owner";
  }

  return membership?.role?.toLowerCase?.() === "owner" ? "owner" : "member";
}

// ─── List clients ─────────────────────────────────────────────────────────────

export async function getClients(req: AuthRequest, res: Response): Promise<void> {
  try {
    const clients = await prisma.client.findMany({
      where: {
        OR: [
          { userId: req.user!.userId },
          { projects: { some: { owner_profile_id: req.user!.userId } } },
          { projects: { some: { members: { some: { userId: req.user!.userId } } } } },
        ],
      },
      orderBy: { createdAt: "desc" },
      include: {
        projects: {
          where: {
            OR: [
              { owner_profile_id: req.user!.userId },
              { members: { some: { userId: req.user!.userId } } },
            ],
          },
          orderBy: { created_at: "desc" },
          take: 1,
          include: {
            members: {
              where: { userId: req.user!.userId },
              take: 1,
            },
          },
        },
      },
    });

    res.json(clients.map((client: any) => ({
      ...client,
      activeProjectId: client.projects?.[0]?.id ?? null,
      role: client.userId === req.user!.userId ? "owner" : clientRole(client),
    })));
  } catch (err) {
    console.error("getClients error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Get single client ────────────────────────────────────────────────────────

export async function getClient(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const client = await prisma.client.findFirst({
      where: {
        id,
        OR: [
          { userId: req.user!.userId },
          { projects: { some: { owner_profile_id: req.user!.userId } } },
          { projects: { some: { members: { some: { userId: req.user!.userId } } } } },
        ],
      },
      include: {
        projects: {
          where: {
            OR: [
              { owner_profile_id: req.user!.userId },
              { members: { some: { userId: req.user!.userId } } },
            ],
          },
          orderBy: { created_at: "desc" },
          take: 1,
          include: {
            members: {
              where: { userId: req.user!.userId },
              take: 1,
            },
          },
        },
      },
    });

    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    res.json({
      ...client,
      activeProjectId: (client as any).projects?.[0]?.id ?? null,
      role: client.userId === req.user!.userId ? "owner" : clientRole(client),
    });
  } catch (err) {
    console.error("getClient error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Create client ────────────────────────────────────────────────────────────

export async function createClient(req: AuthRequest, res: Response): Promise<void> {
  const { name, domain, industry, platform } = req.body;

  if (!name || !domain) {
    res.status(400).json({ error: "name and domain are required" });
    return;
  }

  try {
    // Check plan limit
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user!.userId },
      include: { plan: true },
    });

    if (subscription) {
      const limits = subscription.plan.limits as any;
      if (limits.maxClients !== -1) {
        const count = await prisma.client.count({
          where: { userId: req.user!.userId, isActive: true },
        });
        if (count >= limits.maxClients) {
          res.status(403).json({
            error: `Your ${subscription.plan.displayName} plan allows a maximum of ${limits.maxClients} client(s). Upgrade to add more.`,
            code: "CLIENT_LIMIT_REACHED",
            currentPlan: subscription.plan.name,
          });
          return;
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          userId: req.user!.userId,
          name,
          domain,
          industry,
          platform,
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

      const member = await tx.projectMember.create({
        data: {
          projectId: project.id,
          userId: req.user!.userId,
          role: "OWNER",
        },
      });

      return { client, project, member };
    });

    res.status(201).json({
      ...result.client,
      activeProjectId: result.project.id,
      role: result.member.role.toLowerCase(),
    });
  } catch (err) {
    console.error("createClient error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Update client ────────────────────────────────────────────────────────────

export async function updateClient(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const { name, domain, industry, platform, isActive } = req.body;

  try {
    const existing = await prisma.client.findFirst({
      where: {
        id,
        OR: [
          { userId: req.user!.userId },
          { projects: { some: { owner_profile_id: req.user!.userId } } },
          { projects: { some: { members: { some: { userId: req.user!.userId, role: "OWNER" } } } } },
        ],
      },
    });

    if (!existing) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    const updated = await prisma.client.update({
      where: { id },
      data: { name, domain, industry, platform, isActive },
    });

    res.json(updated);
  } catch (err) {
    console.error("updateClient error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Delete client ────────────────────────────────────────────────────────────

export async function deleteClient(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const existing = await prisma.client.findFirst({
      where: {
        id,
        OR: [
          { userId: req.user!.userId },
          { projects: { some: { owner_profile_id: req.user!.userId } } },
          { projects: { some: { members: { some: { userId: req.user!.userId, role: "OWNER" } } } } },
        ],
      },
    });

    if (!existing) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    await prisma.client.delete({ where: { id } });
    res.json({ message: "Client deleted successfully" });
  } catch (err) {
    console.error("deleteClient error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
