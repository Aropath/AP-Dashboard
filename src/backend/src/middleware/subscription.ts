import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import prisma from "../db/prisma";

/**
 * Middleware factory: checks if the authenticated user's active plan
 * includes the given feature key. Returns 403 if not.
 *
 * Usage: router.get("/reports", requireAuth, requireFeature("reports_page"), handler)
 */
export function requireFeature(featureKey: string) {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: req.user.userId },
        include: { plan: true },
      });

      if (!subscription) {
        res.status(403).json({
          error: "No active subscription",
          code: "NO_SUBSCRIPTION",
        });
        return;
      }

      if (
        subscription.status !== "ACTIVE" &&
        subscription.status !== "TRIALING"
      ) {
        res.status(403).json({
          error: "Subscription is not active",
          code: "SUBSCRIPTION_INACTIVE",
          status: subscription.status,
        });
        return;
      }

      // Check expiry
      if (new Date() > subscription.currentPeriodEnd) {
        // Mark as expired
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: "EXPIRED" },
        });
        res.status(403).json({
          error: "Subscription has expired",
          code: "SUBSCRIPTION_EXPIRED",
        });
        return;
      }

      const features = subscription.plan.features as string[];

      if (!features.includes(featureKey)) {
        res.status(403).json({
          error: `Feature "${featureKey}" is not available on your current plan`,
          code: "FEATURE_NOT_AVAILABLE",
          currentPlan: subscription.plan.name,
          requiredFeature: featureKey,
        });
        return;
      }

      next();
    } catch (err) {
      console.error("Feature gate error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  };
}

/**
 * Attach subscription info to req for downstream use
 */
export async function attachSubscription(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) return next();

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user.userId },
      include: { plan: true },
    });

    (req as any).subscription = subscription;
    next();
  } catch {
    next();
  }
}
