import cron from "node-cron";
import prisma from "../db/prisma";

/**
 * Runs daily at midnight:
 * 1. Expires subscriptions that have passed their period end
 * 2. Downgrades cancelled subscriptions to free plan
 */
export function startSubscriptionCron() {
  cron.schedule("0 0 * * *", async () => {
    console.log("[CRON] Running subscription expiry check...");

    const now = new Date();

    try {
      // 1. Find active subscriptions past their end date
      const expired = await prisma.subscription.findMany({
        where: {
          status: { in: ["ACTIVE", "TRIALING"] },
          currentPeriodEnd: { lt: now },
        },
        include: { plan: true },
      });

      for (const sub of expired) {
        if (sub.cancelAtPeriodEnd || sub.plan.name === "free") {
          // Downgrade to free
          const freePlan = await prisma.plan.findUnique({ where: { name: "free" } });
          if (freePlan) {
            await prisma.subscription.update({
              where: { id: sub.id },
              data: {
                status: "ACTIVE",
                planId: freePlan.id,
                cancelAtPeriodEnd: false,
                currentPeriodStart: now,
                currentPeriodEnd: new Date(now.getFullYear() + 10, now.getMonth(), now.getDate()),
              },
            });

            await prisma.subscriptionHistory.create({
              data: {
                subscriptionId: sub.id,
                action: "expired",
                fromPlanId: sub.planId,
                toPlanId: freePlan.id,
                note: "Subscription expired — downgraded to Free plan",
              },
            });

            console.log(`  ↓ Subscription ${sub.id} downgraded to Free`);
          }
        } else {
          // Mark as expired (paid plan, no cancellation)
          await prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "EXPIRED" },
          });

          await prisma.subscriptionHistory.create({
            data: {
              subscriptionId: sub.id,
              action: "expired",
              note: "Subscription expired — pending renewal",
            },
          });

          console.log(`  ⚠ Subscription ${sub.id} marked EXPIRED`);
        }
      }

      console.log(`[CRON] Done. Processed ${expired.length} expired subscription(s).`);
    } catch (err) {
      console.error("[CRON] Subscription expiry error:", err);
    }
  });

  console.log("✅ Subscription expiry cron scheduled (daily at midnight)");
}
