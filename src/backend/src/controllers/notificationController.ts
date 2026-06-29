import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import prisma from "../db/prisma";

function formatNotification(notification: any) {
  return {
    id: notification.id,
    category: notification.category,
    type: notification.type,
    title: notification.title,
    summary: notification.summary,
    timestamp: notification.created_at,
    unread: notification.unread,
    isNew: notification.is_new,
    priority: notification.priority,
    details: notification.details,
    targetPage: notification.target_page,
    targetWidgetId: notification.target_widget_id,
    source: notification.source,
    createdAt: notification.created_at,
    readAt: notification.read_at,
    dismissedAt: notification.dismissed_at,
    expiresAt: notification.expires_at,
  };
}

async function userHasProjectAccess(projectId: string, userId: string): Promise<boolean> {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [
        { owner_profile_id: userId },
        { members: { some: { userId } } },
      ],
    },
  });

  return !!project;
}

// ─── List notifications ──────────────────────────────────────────────────────

export async function getNotifications(req: AuthRequest, res: Response): Promise<void> {
  const { projectId } = req.query;

  if (!projectId || typeof projectId !== "string") {
    res.status(400).json({ error: "projectId is required" });
    return;
  }

  try {
    const hasAccess = await userHasProjectAccess(projectId, req.user!.userId);

    if (!hasAccess) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const notifications = await prisma.notification.findMany({
      where: {
        project_id: projectId,
        dismissed_at: null,
        OR: [
          { user_id: req.user!.userId },
          { user_id: null },
        ],
      },
      orderBy: { created_at: "desc" },
      take: 50,
    });

    res.json({
      total: notifications.length,
      unread: notifications.filter((n) => n.unread).length,
      notifications: notifications.map(formatNotification),
    });
  } catch (err) {
    console.error("getNotifications error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Create notification ─────────────────────────────────────────────────────

export async function createNotification(req: AuthRequest, res: Response): Promise<void> {
  const {
    projectId,
    userId,
    category,
    type,
    title,
    summary,
    priority = "medium",
    source,
    targetPage,
    targetWidgetId,
    details = {},
    metadata = {},
    expiresAt,
  } = req.body;

  if (!projectId || !category || !type || !title || !summary || !source) {
    res.status(400).json({
      error: "projectId, category, type, title, summary and source are required",
    });
    return;
  }

  try {
    const hasAccess = await userHasProjectAccess(projectId, req.user!.userId);

    if (!hasAccess) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const notification = await prisma.notification.create({
      data: {
        project_id: projectId,
        user_id: userId ?? null,
        category,
        type,
        title,
        summary,
        priority,
        source,
        target_page: targetPage ?? null,
        target_widget_id: targetWidgetId ?? null,
        details,
        metadata,
        expires_at: expiresAt ? new Date(expiresAt) : null,
      },
    });

    res.status(201).json(formatNotification(notification));
  } catch (err) {
    console.error("createNotification error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Mark single notification as read ────────────────────────────────────────

export async function markNotificationRead(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const existing = await prisma.notification.findFirst({
      where: {
        id,
        OR: [
          { user_id: req.user!.userId },
          { user_id: null },
        ],
        project: {
          OR: [
            { owner_profile_id: req.user!.userId },
            { members: { some: { userId: req.user!.userId } } },
          ],
        },
      },
    });

    if (!existing) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        unread: false,
        is_new: false,
        read_at: new Date(),
      },
    });

    res.json(formatNotification(updated));
  } catch (err) {
    console.error("markNotificationRead error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Mark all notifications as read ──────────────────────────────────────────

export async function markAllNotificationsRead(req: AuthRequest, res: Response): Promise<void> {
  const { projectId } = req.query;

  if (!projectId || typeof projectId !== "string") {
    res.status(400).json({ error: "projectId is required" });
    return;
  }

  try {
    const hasAccess = await userHasProjectAccess(projectId, req.user!.userId);

    if (!hasAccess) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    const result = await prisma.notification.updateMany({
      where: {
        project_id: projectId,
        dismissed_at: null,
        OR: [
          { user_id: req.user!.userId },
          { user_id: null },
        ],
      },
      data: {
        unread: false,
        is_new: false,
        read_at: new Date(),
      },
    });

    res.json({ updated: result.count });
  } catch (err) {
    console.error("markAllNotificationsRead error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}

// ─── Delete / dismiss notification ───────────────────────────────────────────

export async function deleteNotification(req: AuthRequest, res: Response): Promise<void> {
  const { id } = req.params;

  try {
    const existing = await prisma.notification.findFirst({
      where: {
        id,
        OR: [
          { user_id: req.user!.userId },
          { user_id: null },
        ],
        project: {
          OR: [
            { owner_profile_id: req.user!.userId },
            { members: { some: { userId: req.user!.userId } } },
          ],
        },
      },
    });

    if (!existing) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }

    await prisma.notification.update({
      where: { id },
      data: {
        dismissed_at: new Date(),
        unread: false,
        is_new: false,
      },
    });

    res.json({ message: "Notification dismissed successfully" });
  } catch (err) {
    console.error("deleteNotification error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}