import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../db/prisma";

// ─── List clients ─────────────────────────────────────────────────────────────

export async function getClients(req: AuthRequest, res: Response): Promise<void> {
  try {
    const clients = await prisma.client.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
    });
    res.json(clients);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Get single client ────────────────────────────────────────────────────────

export async function getClient(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const client = await prisma.client.findFirst({
      where: { id, userId: req.user!.userId },
    });
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }
    res.json(client);
  } catch {
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

    const client = await prisma.client.create({
      data: {
        userId: req.user!.userId,
        name,
        domain,
        industry,
        platform,
      },
    });

    res.status(201).json(client);
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
      where: { id, userId: req.user!.userId },
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
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Delete client ────────────────────────────────────────────────────────────

export async function deleteClient(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const existing = await prisma.client.findFirst({
      where: { id, userId: req.user!.userId },
    });

    if (!existing) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    await prisma.client.delete({ where: { id } });
    res.json({ message: "Client deleted successfully" });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
}
