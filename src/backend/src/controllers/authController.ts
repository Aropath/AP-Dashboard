import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import prisma from "../db/prisma";
import {
  signAccessToken,
  signRefreshToken,
  verifyToken,
  getRefreshExpiryDate,
} from "../services/jwt";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function assignFreePlan(userId: string) {
  const freePlan = await prisma.plan.findUnique({ where: { name: "free" } });
  if (!freePlan) throw new Error("Free plan not found — run db:seed first");

  const now = new Date();
  const periodEnd = new Date();
  periodEnd.setFullYear(periodEnd.getFullYear() + 10); // free plan never expires

  return prisma.subscription.create({
    data: {
      userId,
      planId: freePlan.id,
      status: "ACTIVE",
      billingCycle: "MONTHLY",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });
}

function buildTokens(userId: string, email: string, role: string) {
  const payload = { userId, email, role };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

// ─── Sign Up ──────────────────────────────────────────────────────────────────

export async function signUp(req: Request, res: Response): Promise<void> {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: "name, email and password are required" });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    });

    await assignFreePlan(user.id);

    const { accessToken, refreshToken } = buildTokens(user.id, user.email, user.role);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: getRefreshExpiryDate(),
      },
    });

    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        picture: user.picture,
      },
    });
  } catch (err) {
    console.error("signUp error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Sign In ──────────────────────────────────────────────────────────────────

export async function signIn(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const { accessToken, refreshToken } = buildTokens(user.id, user.email, user.role);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: getRefreshExpiryDate(),
      },
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        picture: user.picture,
      },
    });
  } catch (err) {
    console.error("signIn error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────

export async function googleAuth(req: Request, res: Response): Promise<void> {
  const { idToken } = req.body;

  if (!idToken) {
    res.status(400).json({ error: "idToken is required" });
    return;
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      res.status(400).json({ error: "Invalid Google token" });
      return;
    }

    const { sub: googleId, email, name = "", picture } = payload;

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId }, { email }] },
    });

    if (!user) {
      user = await prisma.user.create({
        data: { googleId, email, name, picture },
      });
      await assignFreePlan(user.id);
    } else if (!user.googleId) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId, picture },
      });
    }

    const { accessToken, refreshToken } = buildTokens(user.id, user.email, user.role);

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: getRefreshExpiryDate(),
      },
    });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        picture: user.picture,
      },
    });
  } catch (err) {
    console.error("googleAuth error:", err);
    res.status(401).json({ error: "Google authentication failed" });
  }
}

// ─── Refresh Token ────────────────────────────────────────────────────────────

export async function refreshAccessToken(
  req: Request,
  res: Response
): Promise<void> {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    res.status(400).json({ error: "refreshToken is required" });
    return;
  }

  try {
    const payload = verifyToken(refreshToken);

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!stored || stored.expiresAt < new Date()) {
      res.status(401).json({ error: "Refresh token expired or invalid" });
      return;
    }

    // Rotate: delete old, issue new
    await prisma.refreshToken.delete({ where: { token: refreshToken } });

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const tokens = buildTokens(user.id, user.email, user.role);

    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: getRefreshExpiryDate(),
      },
    });

    res.json(tokens);
  } catch {
    res.status(401).json({ error: "Invalid refresh token" });
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body;

  if (refreshToken) {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }

  res.json({ message: "Logged out successfully" });
}

// ─── Get Me ───────────────────────────────────────────────────────────────────

export async function getMe(req: Request, res: Response): Promise<void> {
  const authReq = req as any;
  try {
    const user = await prisma.user.findUnique({
      where: { id: authReq.user.userId },
      include: {
        subscription: { include: { plan: true } },
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      picture: user.picture,
      subscription: user.subscription
        ? {
            status: user.subscription.status,
            billingCycle: user.subscription.billingCycle,
            currentPeriodEnd: user.subscription.currentPeriodEnd,
            cancelAtPeriodEnd: user.subscription.cancelAtPeriodEnd,
            plan: {
              name: user.subscription.plan.name,
              displayName: user.subscription.plan.displayName,
              features: user.subscription.plan.features,
              limits: user.subscription.plan.limits,
            },
          }
        : null,
    });
  } catch (err) {
    console.error("getMe error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
