import { Request, Response } from "express";
import crypto from "crypto";
import axios from "axios";
import { AuthRequest } from "../middleware/auth";
import { prisma } from "../db/prisma";

const BREVO_CLIENT_ID     = process.env.BREVO_CLIENT_ID!;
const BREVO_CLIENT_SECRET = process.env.BREVO_CLIENT_SECRET!;
const BREVO_REDIRECT_URI  = process.env.BREVO_REDIRECT_URI!;
const FRONTEND_URL        = process.env.FRONTEND_URL || "http://localhost:3000";

// ── In-memory state store (CSRF protection) ───────────────────────────────────
// Maps state token → userId. Safe for single-process Node; swap for Redis
// if you run multiple instances later.
const pendingStates = new Map<string, string>();

// ── GET /api/brevo/url ────────────────────────────────────────────────────────
export async function getBrevoAuthUrl(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const state = crypto.randomBytes(16).toString("hex");
  pendingStates.set(state, userId);
  setTimeout(() => pendingStates.delete(state), 10 * 60 * 1000); // expire after 10 min

  const params = new URLSearchParams({
    response_type: "code",
    client_id: BREVO_CLIENT_ID,
    redirect_uri: BREVO_REDIRECT_URI,
    state,
  });

  res.json({ url: `https://app.brevo.com/oauth2/authorize?${params.toString()}` });
}

// ── GET /api/brevo/callback ───────────────────────────────────────────────────
// Brevo redirects here after the user authorises.
export async function handleBrevoCallback(
  req: Request,
  res: Response
): Promise<void> {
  const { code, state, error } = req.query as Record<string, string>;

  if (error) {
    res.redirect(`${FRONTEND_URL}/settings?brevo=error&reason=access_denied`);
    return;
  }

  const userId = pendingStates.get(state);
  if (!userId || !code) {
    res.redirect(`${FRONTEND_URL}/settings?brevo=error&reason=invalid_state`);
    return;
  }
  pendingStates.delete(state);

  try {
    // Exchange code for access token
    const tokenRes = await axios.post(
      "https://api.brevo.com/v3/oauth2/token",
      new URLSearchParams({
        grant_type:    "authorization_code",
        client_id:     BREVO_CLIENT_ID,
        client_secret: BREVO_CLIENT_SECRET,
        redirect_uri:  BREVO_REDIRECT_URI,
        code,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token, refresh_token, expires_in } = tokenRes.data as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };

    // Fetch the connected Brevo account email
    const accountRes = await axios.get("https://api.brevo.com/v3/account", {
      headers: { "api-key": access_token },
    });

    const accountEmail: string = accountRes.data?.email ?? "";

    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : null;

    // Upsert — one Brevo connection per user
    await prisma.brevoToken.upsert({
      where:  { userId },
      create: {
        userId,
        accessToken:  access_token,
        refreshToken: refresh_token ?? null,
        expiresAt,
        accountEmail,
      },
      update: {
        accessToken:  access_token,
        refreshToken: refresh_token ?? null,
        expiresAt,
        accountEmail,
        updatedAt: new Date(),
      },
    });

    res.redirect(`${FRONTEND_URL}/settings?brevo=connected`);
  } catch (err) {
    console.error("Brevo OAuth callback error:", err);
    res.redirect(`${FRONTEND_URL}/settings?brevo=error&reason=token_exchange`);
  }
}

// ── GET /api/brevo/status ─────────────────────────────────────────────────────
export async function getBrevoStatus(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const token = await prisma.brevoToken.findUnique({
    where:  { userId },
    select: { accountEmail: true, createdAt: true },
  });

  res.json({
    connected: !!token,
    ...(token && {
      accountEmail: token.accountEmail,
      connectedAt:  token.createdAt,
    }),
  });
}

// ── DELETE /api/brevo/disconnect ──────────────────────────────────────────────
export async function disconnectBrevo(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    await prisma.brevoToken.delete({ where: { userId } });
  } catch {
    // Already gone — treat as success
  }

  res.json({ success: true });
}
