import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../db/prisma";

// ─── Period helper ────────────────────────────────────────────────────────────

function getPeriodStart(period: string): Date {
  const now = new Date();
  switch (period) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "7d":
      return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
}

function getClientIdFilter(req: AuthRequest) {
  const clientId = req.query.clientId as string | undefined;
  return clientId ? { clientId } : {};
}

async function getUserClientIds(userId: string): Promise<string[]> {
  const clients = await prisma.client.findMany({
    where: { userId, isActive: true },
    select: { id: true },
  });
  return clients.map((c) => c.id);
}

// ─── Dashboard overview ────────────────────────────────────────────────────────

export async function getDashboard(req: AuthRequest, res: Response): Promise<void> {
  const period = (req.query.period as string) || "today";
  const since = getPeriodStart(period);

  try {
    const clientIds = await getUserClientIds(req.user!.userId);
    if (clientIds.length === 0) {
      res.json(emptyDashboard());
      return;
    }

    const [sessions, events] = await Promise.all([
      prisma.session.findMany({
        where: { clientId: { in: clientIds }, startedAt: { gte: since } },
      }),
      prisma.analyticsEvent.findMany({
        where: {
          clientId: { in: clientIds },
          occurredAt: { gte: since },
        },
      }),
    ]);

    const uniqueUserIds = new Set(sessions.filter((s) => s.userId).map((s) => s.userId!));
    const visitors = sessions.length;
    const uniqueVisitors = uniqueUserIds.size;
    const revenue = events
      .filter((e) => e.eventType === "purchase" && e.revenue)
      .reduce((sum, e) => sum + (e.revenue || 0), 0);

    const bouncedSessions = sessions.filter((s) => s.bounced).length;
    const bounceRate = visitors > 0 ? (bouncedSessions / visitors) * 100 : 0;

    const durations = sessions.filter((s) => s.duration).map((s) => s.duration!);
    const avgSessionDuration =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

    const purchases = events.filter((e) => e.eventType === "purchase").length;
    const conversionRate = visitors > 0 ? (purchases / visitors) * 100 : 0;

    const mobileSessions = sessions.filter((s) => s.device === "mobile").length;
    const desktopSessions = sessions.filter((s) => s.device === "desktop").length;
    const tabletSessions = sessions.filter((s) => s.device === "tablet").length;

    const productViewSessions = sessions.filter((s) =>
      events.some((e) => e.sessionId === s.id && e.eventType === "product_view")
    ).length;
    const addToCartSessions = sessions.filter((s) =>
      events.some((e) => e.sessionId === s.id && e.eventType === "add_to_cart")
    ).length;
    const checkoutSessions = sessions.filter((s) =>
      events.some((e) => e.sessionId === s.id && e.eventType === "checkout")
    ).length;
    const purchaseSessions = sessions.filter((s) =>
      events.some((e) => e.sessionId === s.id && e.eventType === "purchase")
    ).length;

    const engagedSessions = sessions.filter(
      (s) => !s.bounced && (s.duration || 0) > 10
    ).length;
    const engagementRate = visitors > 0 ? (engagedSessions / visitors) * 100 : 0;

    res.json({
      visitors,
      unique_visitors: uniqueVisitors,
      sessions: visitors,
      revenue: Math.round(revenue * 100) / 100,
      bounce_rate: Math.round(bounceRate * 10) / 10,
      avg_session_duration: Math.round(avgSessionDuration),
      conversion_rate: Math.round(conversionRate * 10) / 10,
      engagement_rate: Math.round(engagementRate * 10) / 10,
      mobile_sessions: mobileSessions,
      desktop_sessions: desktopSessions,
      tablet_sessions: tabletSessions,
      product_view_sessions: productViewSessions,
      add_to_cart_sessions: addToCartSessions,
      checkout_sessions: checkoutSessions,
      purchase_sessions: purchaseSessions,
    });
  } catch (err) {
    console.error("getDashboard error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Latest metrics (sparklines) ──────────────────────────────────────────────

export async function getLatestMetrics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const clientIds = await getUserClientIds(req.user!.userId);
    const since = getPeriodStart("30d");

    const sessions = await prisma.session.findMany({
      where: { clientId: { in: clientIds }, startedAt: { gte: since } },
      orderBy: { startedAt: "asc" },
    });

    // Group by day
    const byDay: Record<string, number> = {};
    sessions.forEach((s) => {
      const day = s.startedAt.toISOString().split("T")[0];
      byDay[day] = (byDay[day] || 0) + 1;
    });

    const sparkline = Object.values(byDay).slice(-14);
    res.json({ sparkline, totalSessions: sessions.length });
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Traffic analysis ─────────────────────────────────────────────────────────

export async function getTrafficAnalysis(req: AuthRequest, res: Response): Promise<void> {
  const period = (req.query.period as string) || "30d";
  const since = getPeriodStart(period);

  try {
    const clientIds = await getUserClientIds(req.user!.userId);
    const sessions = await prisma.session.findMany({
      where: { clientId: { in: clientIds }, startedAt: { gte: since } },
      orderBy: { startedAt: "asc" },
    });

    // Group by date
    const byDate: Record<string, { sessions: number; bounces: number }> = {};
    sessions.forEach((s) => {
      const date = s.startedAt.toISOString().split("T")[0];
      if (!byDate[date]) byDate[date] = { sessions: 0, bounces: 0 };
      byDate[date].sessions++;
      if (s.bounced) byDate[date].bounces++;
    });

    const result = Object.entries(byDate).map(([date, data]) => ({
      date: { value: date },
      sessions: data.sessions,
      bounce_rate: data.sessions > 0
        ? Math.round((data.bounces / data.sessions) * 1000) / 10
        : 0,
    }));

    res.json(result);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Top countries ────────────────────────────────────────────────────────────

export async function getTopCountries(req: AuthRequest, res: Response): Promise<void> {
  const period = (req.query.period as string) || "30d";
  const since = getPeriodStart(period);

  try {
    const clientIds = await getUserClientIds(req.user!.userId);
    const sessions = await prisma.session.findMany({
      where: {
        clientId: { in: clientIds },
        startedAt: { gte: since },
        country: { not: null },
      },
    });

    const countryMap: Record<string, number> = {};
    sessions.forEach((s) => {
      if (s.country) countryMap[s.country] = (countryMap[s.country] || 0) + 1;
    });

    const result = Object.entries(countryMap)
      .map(([country, users]) => ({ country, users }))
      .sort((a, b) => b.users - a.users)
      .slice(0, 10);

    res.json(result);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Acquisition channels ─────────────────────────────────────────────────────

export async function getAcquisitionChannels(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const period = (req.query.period as string) || "30d";
  const since = getPeriodStart(period);

  try {
    const clientIds = await getUserClientIds(req.user!.userId);
    const sessions = await prisma.session.findMany({
      where: { clientId: { in: clientIds }, startedAt: { gte: since } },
      include: { events: { where: { eventType: "purchase" } } },
    });

    const sourceMap: Record<
      string,
      { sessions: number; conversions: number; revenue: number }
    > = {};

    sessions.forEach((s) => {
      const src = s.source || "direct";
      if (!sourceMap[src]) sourceMap[src] = { sessions: 0, conversions: 0, revenue: 0 };
      sourceMap[src].sessions++;
      if (s.converted) {
        sourceMap[src].conversions++;
        sourceMap[src].revenue += s.events.reduce(
          (sum, e) => sum + (e.revenue || 0),
          0
        );
      }
    });

    const result = Object.entries(sourceMap).map(([source, data]) => ({
      source,
      sessions: data.sessions,
      conversions: data.conversions,
      conversion_rate:
        data.sessions > 0
          ? Math.round((data.conversions / data.sessions) * 1000) / 10
          : 0,
      revenue: Math.round(data.revenue * 100) / 100,
    }));

    res.json(result.sort((a, b) => b.sessions - a.sessions));
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Page performance ─────────────────────────────────────────────────────────

export async function getPagePerformance(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const period = (req.query.period as string) || "30d";
  const since = getPeriodStart(period);

  try {
    const clientIds = await getUserClientIds(req.user!.userId);
    const events = await prisma.analyticsEvent.findMany({
      where: {
        clientId: { in: clientIds },
        eventType: "page_view",
        occurredAt: { gte: since },
        page: { not: null },
      },
    });

    const pageMap: Record<
      string,
      { views: number; users: Set<string>; durations: number[]; bounces: number; conversions: number }
    > = {};

    events.forEach((e) => {
      const page = e.page!;
      if (!pageMap[page]) {
        pageMap[page] = { views: 0, users: new Set(), durations: [], bounces: 0, conversions: 0 };
      }
      pageMap[page].views++;
      if (e.userId) pageMap[page].users.add(e.userId);
      const props = e.properties as any;
      if (props?.duration) pageMap[page].durations.push(props.duration);
      if (props?.bounced) pageMap[page].bounces++;
      if (props?.converted) pageMap[page].conversions++;
    });

    const result = Object.entries(pageMap).map(([page, data]) => ({
      page_location: page,
      views: data.views,
      users: data.users.size,
      avg_time_seconds:
        data.durations.length > 0
          ? Math.round(data.durations.reduce((a, b) => a + b, 0) / data.durations.length)
          : 0,
      engagement_rate: data.views > 0
        ? Math.round(((data.views - data.bounces) / data.views) * 1000) / 10
        : 0,
      bounce_rate: data.views > 0
        ? Math.round((data.bounces / data.views) * 1000) / 10
        : 0,
      conversions: data.conversions,
    }));

    res.json(result.sort((a, b) => b.views - a.views).slice(0, 20));
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Product revenue ──────────────────────────────────────────────────────────

export async function getProductRevenue(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const period = (req.query.period as string) || "30d";
  const since = getPeriodStart(period);

  try {
    const clientIds = await getUserClientIds(req.user!.userId);
    const events = await prisma.analyticsEvent.findMany({
      where: {
        clientId: { in: clientIds },
        eventType: "purchase",
        occurredAt: { gte: since },
      },
    });

    const productMap: Record<
      string,
      { item_name: string; item_brand: string; item_category: string; units: number; revenue: number; transactions: number }
    > = {};

    events.forEach((e) => {
      const props = e.properties as any;
      const items: any[] = props?.items || [];
      items.forEach((item: any) => {
        const id = item.item_id || "unknown";
        if (!productMap[id]) {
          productMap[id] = {
            item_name: item.item_name || id,
            item_brand: item.item_brand || "",
            item_category: item.item_category || "",
            units: 0,
            revenue: 0,
            transactions: 0,
          };
        }
        productMap[id].units += item.quantity || 1;
        productMap[id].revenue += (item.price || 0) * (item.quantity || 1);
        productMap[id].transactions++;
      });
    });

    const result = Object.entries(productMap).map(([item_id, data]) => ({
      item_id,
      item_name: data.item_name,
      item_brand: data.item_brand,
      item_category: data.item_category,
      units_sold: data.units,
      revenue: Math.round(data.revenue * 100) / 100,
      transactions: data.transactions,
    }));

    res.json(result.sort((a, b) => b.revenue - a.revenue));
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Cohort retention ─────────────────────────────────────────────────────────

export async function getCohortRetention(
  req: AuthRequest,
  res: Response
): Promise<void> {
  const period = (req.query.period as string) || "90d";
  const since = getPeriodStart(period);

  try {
    const clientIds = await getUserClientIds(req.user!.userId);
    const sessions = await prisma.session.findMany({
      where: {
        clientId: { in: clientIds },
        startedAt: { gte: since },
        userId: { not: null },
      },
      orderBy: { startedAt: "asc" },
    });

    // Build cohort by first-seen month
    const firstSeen: Record<string, Date> = {};
    sessions.forEach((s) => {
      if (s.userId && !firstSeen[s.userId]) {
        firstSeen[s.userId] = s.startedAt;
      }
    });

    const cohortMap: Record<string, Record<number, Set<string>>> = {};
    sessions.forEach((s) => {
      if (!s.userId) return;
      const cohortMonth = firstSeen[s.userId].toISOString().slice(0, 7);
      const cohortDate = new Date(firstSeen[s.userId]);
      const sessionDate = new Date(s.startedAt);
      const monthDiff =
        (sessionDate.getFullYear() - cohortDate.getFullYear()) * 12 +
        (sessionDate.getMonth() - cohortDate.getMonth());

      if (!cohortMap[cohortMonth]) cohortMap[cohortMonth] = {};
      if (!cohortMap[cohortMonth][monthDiff]) cohortMap[cohortMonth][monthDiff] = new Set();
      cohortMap[cohortMonth][monthDiff].add(s.userId);
    });

    const result: any[] = [];
    Object.entries(cohortMap).forEach(([cohortMonth, months]) => {
      const cohortSize = months[0]?.size || 0;
      Object.entries(months).forEach(([monthNum, users]) => {
        result.push({
          cohort_month: cohortMonth,
          month_number: parseInt(monthNum),
          users_retained: users.size,
          cohort_users: cohortSize,
          retention_rate:
            cohortSize > 0
              ? Math.round((users.size / cohortSize) * 1000) / 10
              : 0,
        });
      });
    });

    res.json(result.sort((a, b) => a.cohort_month.localeCompare(b.cohort_month)));
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Ingest event (called by tracking snippet) ────────────────────────────────

export async function ingestEvent(req: AuthRequest, res: Response): Promise<void> {
  const { trackingId, sessionId, eventType, page, properties, revenue, currency, userId } =
    req.body;

  if (!trackingId || !eventType) {
    res.status(400).json({ error: "trackingId and eventType are required" });
    return;
  }

  try {
    const client = await prisma.client.findUnique({ where: { trackingId } });
    if (!client) {
      res.status(404).json({ error: "Client not found" });
      return;
    }

    let session = sessionId
      ? await prisma.session.findUnique({ where: { sessionId } })
      : null;

    if (!session && sessionId) {
      const body = req.body;
      session = await prisma.session.create({
        data: {
          clientId: client.id,
          sessionId,
          userId,
          device: body.device,
          browser: body.browser,
          os: body.os,
          country: body.country,
          city: body.city,
          source: body.source,
          medium: body.medium,
          campaign: body.campaign,
        },
      });
    }

    await prisma.analyticsEvent.create({
      data: {
        clientId: client.id,
        sessionId: session?.id,
        eventType,
        page,
        properties,
        revenue,
        currency,
        userId,
      },
    });

    if (session) {
      await prisma.session.update({
        where: { id: session.id },
        data: { pageViews: { increment: eventType === "page_view" ? 1 : 0 } },
      });
    }

    res.status(201).json({ ok: true });
  } catch (err) {
    console.error("ingestEvent error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Fallback empty dashboard ─────────────────────────────────────────────────

function emptyDashboard() {
  return {
    visitors: 0, unique_visitors: 0, sessions: 0, revenue: 0,
    bounce_rate: 0, avg_session_duration: 0, conversion_rate: 0,
    engagement_rate: 0, mobile_sessions: 0, desktop_sessions: 0,
    tablet_sessions: 0, product_view_sessions: 0, add_to_cart_sessions: 0,
    checkout_sessions: 0, purchase_sessions: 0,
  };
}
