import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../db/prisma";

// ─── Get current subscription ─────────────────────────────────────────────────

export async function getSubscription(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user!.userId },
      include: {
        plan: true,
        history: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    if (!subscription) {
      res.status(404).json({ error: "No subscription found" });
      return;
    }

    res.json(subscription);
  } catch (err) {
    console.error("getSubscription error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Get all plans ────────────────────────────────────────────────────────────

export async function getPlans(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: "asc" },
    });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Change plan ──────────────────────────────────────────────────────────────

export async function changePlan(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const { planName, billingCycle } = req.body;

  if (!planName) {
    res.status(400).json({ error: "planName is required" });
    return;
  }

  try {
    const newPlan = await prisma.plan.findUnique({ where: { name: planName } });
    if (!newPlan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    const existing = await prisma.subscription.findUnique({
      where: { userId: req.user!.userId },
      include: { plan: true },
    });

    if (!existing) {
      res.status(404).json({ error: "No subscription found" });
      return;
    }

    const now = new Date();
    const periodEnd = new Date();
    if (billingCycle === "YEARLY") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else if (planName === "free") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 10);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const action =
      newPlan.priceMonthly > existing.plan.priceMonthly
        ? "upgraded"
        : newPlan.priceMonthly < existing.plan.priceMonthly
        ? "downgraded"
        : "changed";

    const [updated] = await prisma.$transaction([
      prisma.subscription.update({
        where: { id: existing.id },
        data: {
          planId: newPlan.id,
          status: "ACTIVE",
          billingCycle: billingCycle || existing.billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
        include: { plan: true },
      }),
      prisma.subscriptionHistory.create({
        data: {
          subscriptionId: existing.id,
          action,
          fromPlanId: existing.planId,
          toPlanId: newPlan.id,
          note: `Plan ${action} to ${newPlan.displayName}`,
        },
      }),
    ]);

    res.json(updated);
  } catch (err) {
    console.error("changePlan error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Cancel subscription ──────────────────────────────────────────────────────

export async function cancelSubscription(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!subscription) {
      res.status(404).json({ error: "No subscription found" });
      return;
    }

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: true },
      include: { plan: true },
    });

    await prisma.subscriptionHistory.create({
      data: {
        subscriptionId: subscription.id,
        action: "cancelled",
        note: "User requested cancellation at period end",
      },
    });

    res.json({
      message: "Subscription will be cancelled at period end",
      subscription: updated,
    });
  } catch (err) {
    console.error("cancelSubscription error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Reactivate subscription ──────────────────────────────────────────────────

export async function reactivateSubscription(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!subscription) {
      res.status(404).json({ error: "No subscription found" });
      return;
    }

    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: { cancelAtPeriodEnd: false, status: "ACTIVE" },
      include: { plan: true },
    });

    await prisma.subscriptionHistory.create({
      data: {
        subscriptionId: subscription.id,
        action: "renewed",
        note: "User reactivated subscription",
      },
    });

    res.json(updated);
  } catch (err) {
    console.error("reactivateSubscription error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Get subscription history ─────────────────────────────────────────────────

export async function getSubscriptionHistory(
  req: AuthRequest,
  res: Response
): Promise<void> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user!.userId },
    });

    if (!subscription) {
      res.status(404).json({ error: "No subscription found" });
      return;
    }

    const history = await prisma.subscriptionHistory.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { createdAt: "desc" },
    });

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
}
