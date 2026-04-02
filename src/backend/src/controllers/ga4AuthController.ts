import { Request, Response } from "express";
import { google } from "googleapis";
import prisma from "../db/prisma";
import { AuthRequest } from "../middleware/auth";

// ─── OAuth2 client setup ──────────────────────────────────────────────────────

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GA4_REDIRECT_URI || "http://localhost:5000/api/ga4/auth/callback"
  );
}

const GA4_SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/analytics.manage.users.readonly",
  "email",
  "profile",
];

// ─── Step 1: Generate OAuth URL ───────────────────────────────────────────────
// Frontend calls this to get the URL to redirect user to Google consent screen

export async function getAuthUrl(req: AuthRequest, res: Response): Promise<void> {
  const { clientId } = req.query;

  if (!clientId) {
    res.status(400).json({ error: "clientId is required" });
    return;
  }

  // Verify this client belongs to the requesting user
  const client = await prisma.client.findFirst({
    where: { id: clientId as string, userId: req.user!.userId },
  });

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const oauth2Client = getOAuth2Client();

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: GA4_SCOPES,
    prompt: "consent",           // force consent screen so we always get refresh_token
    state: JSON.stringify({
      clientId,
      userId: req.user!.userId,
    }),
  });

  res.json({ url });
}

// ─── Step 2: OAuth Callback ───────────────────────────────────────────────────
// Google redirects here after user grants consent

export async function handleCallback(req: Request, res: Response): Promise<void> {
  const { code, state, error } = req.query;

  const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

  if (error) {
    res.redirect(`${FRONTEND_URL}/settings?ga4=error&reason=${error}`);
    return;
  }

  if (!code || !state) {
    res.redirect(`${FRONTEND_URL}/settings?ga4=error&reason=missing_params`);
    return;
  }

  let parsedState: { clientId: string; userId: string };
  try {
    parsedState = JSON.parse(state as string);
  } catch {
    res.redirect(`${FRONTEND_URL}/settings?ga4=error&reason=invalid_state`);
    return;
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code as string);

    if (!tokens.refresh_token) {
      // This happens if user already authorised before — revoke and retry
      res.redirect(
        `${FRONTEND_URL}/settings?ga4=error&reason=no_refresh_token&clientId=${parsedState.clientId}`
      );
      return;
    }

    // Get the user's email from token info
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    // Store tokens temporarily — property picker happens next
    // We encode tokens in a short-lived way via a redirect with a temp key
    // For simplicity in dev, we pass them via query params to the property picker
    // In production use a short-lived server-side session or signed JWT instead

    const tempData = Buffer.from(
      JSON.stringify({
        clientId: parsedState.clientId,
        userId: parsedState.userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(tokens.expiry_date || Date.now() + 3600000).toISOString(),
        googleEmail: userInfo.email,
      })
    ).toString("base64");

    // Redirect to frontend with temp data — frontend will show property picker
    res.redirect(`${FRONTEND_URL}/settings?ga4=pick_property&data=${tempData}`);
  } catch (err) {
    console.error("GA4 callback error:", err);
    res.redirect(`${FRONTEND_URL}/settings?ga4=error&reason=token_exchange_failed`);
  }
}

// ─── Step 3: List GA4 Properties ─────────────────────────────────────────────
// After OAuth, fetch all GA4 properties the user has access to

export async function listProperties(req: AuthRequest, res: Response): Promise<void> {
  const { accessToken } = req.body;

  if (!accessToken) {
    res.status(400).json({ error: "accessToken is required" });
    return;
  }

  try {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const analyticsAdmin = google.analyticsadmin({
      version: "v1beta",
      auth: oauth2Client,
    });

    // List all accounts first
    const accountsRes = await analyticsAdmin.accounts.list();
    const accounts = accountsRes.data.accounts || [];

    const properties: {
      propertyId: string;
      propertyName: string;
      accountId: string;
      accountName: string;
    }[] = [];

    // For each account, list its properties
    for (const account of accounts) {
      const propsRes = await analyticsAdmin.properties.list({
        filter: `parent:${account.name}`,
      });

      const props = propsRes.data.properties || [];
      for (const prop of props) {
        properties.push({
          propertyId: prop.name || "",        // "properties/123456789"
          propertyName: prop.displayName || "",
          accountId: account.name || "",
          accountName: account.displayName || "",
        });
      }
    }

    res.json({ properties });
  } catch (err: any) {
    console.error("listProperties error:", err);
    res.status(500).json({ error: "Failed to fetch GA4 properties" });
  }
}

// ─── Step 4: Save selected property ──────────────────────────────────────────
// User picked a property from the dropdown — save everything to DB

export async function saveConnection(req: AuthRequest, res: Response): Promise<void> {
  const {
    clientId,
    propertyId,
    propertyName,
    accountId,
    accessToken,
    refreshToken,
    expiresAt,
    googleEmail,
  } = req.body;

  if (!clientId || !propertyId || !accessToken || !refreshToken) {
    res.status(400).json({ error: "clientId, propertyId, accessToken and refreshToken are required" });
    return;
  }

  // Verify client belongs to user
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: req.user!.userId },
  });

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  try {
    // Upsert — if already connected, update tokens
    const credential = await prisma.gA4Credential.upsert({
      where: { clientId },
      update: {
        propertyId,
        propertyName,
        accountId,
        accessToken,
        refreshToken,
        tokenExpiresAt: new Date(expiresAt),
        googleEmail,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        clientId,
        propertyId,
        propertyName,
        accountId,
        accessToken,
        refreshToken,
        tokenExpiresAt: new Date(expiresAt),
        googleEmail,
      },
    });

    res.json({
      message: "GA4 connected successfully",
      credential: {
        propertyId: credential.propertyId,
        propertyName: credential.propertyName,
        googleEmail: credential.googleEmail,
        connectedAt: credential.connectedAt,
      },
    });
  } catch (err) {
    console.error("saveConnection error:", err);
    res.status(500).json({ error: "Failed to save GA4 connection" });
  }
}

// ─── Get connection status ────────────────────────────────────────────────────

export async function getConnectionStatus(req: AuthRequest, res: Response): Promise<void> {
  const { clientId } = req.params;

  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: req.user!.userId },
    include: { ga4Credential: true },
  });

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  if (!client.ga4Credential || !client.ga4Credential.isActive) {
    res.json({ connected: false });
    return;
  }

  res.json({
    connected: true,
    propertyId: client.ga4Credential.propertyId,
    propertyName: client.ga4Credential.propertyName,
    googleEmail: client.ga4Credential.googleEmail,
    connectedAt: client.ga4Credential.connectedAt,
  });
}

// ─── Disconnect GA4 ───────────────────────────────────────────────────────────

export async function disconnectGA4(req: AuthRequest, res: Response): Promise<void> {
  const { clientId } = req.params;

  const client = await prisma.client.findFirst({
    where: { id: clientId, userId: req.user!.userId },
  });

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  await prisma.gA4Credential.updateMany({
    where: { clientId },
    data: { isActive: false },
  });

  res.json({ message: "GA4 disconnected successfully" });
}

// ─── Internal: Get tokens for a client (called by port 5001) ─────────────────
// Port 5001 calls this to get stored GA4 tokens before making Data API requests.
// Secured by an internal API key, not user JWT.

export async function getTokensForClient(req: Request, res: Response): Promise<void> {
  const internalKey = req.headers["x-internal-key"];

  if (internalKey !== process.env.INTERNAL_API_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { clientId } = req.params;

  try {
    const credential = await prisma.gA4Credential.findUnique({
      where: { clientId },
    });

    if (!credential || !credential.isActive) {
      res.status(404).json({ error: "No active GA4 connection for this client" });
      return;
    }

    // Check if access token is expired — refresh if needed
    if (new Date() >= credential.tokenExpiresAt) {
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials({ refresh_token: credential.refreshToken });

      const { credentials } = await oauth2Client.refreshAccessToken();

      // Update stored tokens
      await prisma.gA4Credential.update({
        where: { clientId },
        data: {
          accessToken: credentials.access_token!,
          tokenExpiresAt: new Date(credentials.expiry_date || Date.now() + 3600000),
        },
      });

      res.json({
        accessToken: credentials.access_token,
        refreshToken: credential.refreshToken,
        propertyId: credential.propertyId,
      });
      return;
    }

    res.json({
      accessToken: credential.accessToken,
      refreshToken: credential.refreshToken,
      propertyId: credential.propertyId,
    });
  } catch (err) {
    console.error("getTokensForClient error:", err);
    res.status(500).json({ error: "Failed to retrieve GA4 tokens" });
  }
}
