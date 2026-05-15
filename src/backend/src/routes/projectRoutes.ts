import { Router, Response } from "express";
import { prisma } from "../db/prisma";
import { generateApiKey, maskApiKey } from "../lib/apiKeys";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(requireAuth);

// ─── Serialize ────────────────────────────────────────────────────────────────
// Maps your existing Client model + its active ProjectApiKey into the shape
// the SettingsPage frontend expects.

function serializeClient(client: any) {
  const activeKey = client.projectApiKeys?.[0] ?? null;

  return {
    id:           client.id,
    name:         client.name,
    domain:       client.domain,
    trackingId:   client.trackingId,
    isActive:     client.isActive,
    createdAt:    client.createdAt,
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

// ─── GET /api/sdk/projects ────────────────────────────────────────────────────
// List all clients belonging to the authenticated user, with their active key.

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const clients = await prisma.client.findMany({
      where:   { userId: req.user!.userId },
      orderBy: { createdAt: "desc" },
      include: {
        projectApiKeys: {
          where:   { revokedAt: null },
          orderBy: { createdAt: "desc" },
          take:    1,
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
// Create a new client + its first API key.
// Returns the project and the raw key (shown once only).

router.post("/", async (req: AuthRequest, res: Response) => {
  const name   = typeof req.body?.name   === "string" ? req.body.name.trim()   : "";
  const domain = typeof req.body?.domain === "string" ? req.body.domain.trim() : "";

  if (!name) {
    return res.status(400).json({ error: "Project name is required" });
  }
  if (name.length > 80) {
    return res.status(400).json({ error: "Project name must be 80 characters or fewer" });
  }

  const { rawKey, keyPrefix, keyHash } = generateApiKey();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: {
          userId: req.user!.userId,
          name,
          domain: domain || "—",   // domain is required in schema; use placeholder if omitted
        },
      });

      const apiKey = await tx.projectApiKey.create({
        data: {
          clientId:  client.id,
          keyPrefix,
          keyHash,
        },
      });

      return { client, apiKey };
    });

    return res.status(201).json({
      project: serializeClient({
        ...result.client,
        projectApiKeys: [result.apiKey],
      }),
      apiKey: rawKey,  // raw key returned once — not stored
    });
  } catch (err: any) {
    console.error("[SDK] Failed to create project:", err.message);
    return res.status(500).json({ error: "Failed to create project" });
  }
});

// ─── POST /api/sdk/projects/:id/api-key/regenerate ───────────────────────────
// Revoke the current active key and issue a new one.

router.post("/:id/api-key/regenerate", async (req: AuthRequest, res: Response) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!client) {
      return res.status(404).json({ error: "Project not found" });
    }

    const { rawKey, keyPrefix, keyHash } = generateApiKey();
    const revokedAt = new Date();

    const apiKey = await prisma.$transaction(async (tx) => {
      // Revoke all active keys for this client
      await tx.projectApiKey.updateMany({
        where: { clientId: client.id, revokedAt: null },
        data:  { revokedAt },
      });

      // Issue new key
      return tx.projectApiKey.create({
        data: { clientId: client.id, keyPrefix, keyHash },
      });
    });

    return res.json({
      project: serializeClient({ ...client, projectApiKeys: [apiKey] }),
      apiKey:  rawKey,
    });
  } catch (err: any) {
    console.error("[SDK] Failed to regenerate API key:", err.message);
    return res.status(500).json({ error: "Failed to regenerate API key" });
  }
});

// ─── DELETE /api/sdk/projects/:id ────────────────────────────────────────────
// Delete a client and cascade-delete its API keys.

router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, userId: req.user!.userId },
    });

    if (!client) {
      return res.status(404).json({ error: "Project not found" });
    }

    await prisma.client.delete({ where: { id: client.id } });

    return res.json({ success: true });
  } catch (err: any) {
    console.error("[SDK] Failed to delete project:", err.message);
    return res.status(500).json({ error: "Failed to delete project" });
  }
});

export default router;
