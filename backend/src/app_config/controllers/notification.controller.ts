import type { Request, Response } from "express";
import prisma from "../../db/prisma.js";

const TARGETS = ["ALL", "USERS", "GUIDES"] as const;
type NotifTarget = (typeof TARGETS)[number];

function isTarget(v: unknown): v is NotifTarget {
  return typeof v === "string" && TARGETS.includes(v as NotifTarget);
}

const handleError = (res: Response, error: unknown) => {
  console.error("Notification error:", error);
  return res.status(500).json({ message: "Internal Server Error" });
};

/**
 * GET /api/admin/notifications — list all notifications sent by admin, newest first
 */
export const listNotifications = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(100, parseInt(String(req.query.limit ?? "50"), 10) || 50);
    const skip = parseInt(String(req.query.skip ?? "0"), 10) || 0;
    const [notifications, total] = await Promise.all([
      prisma.admin_notification.findMany({
        orderBy: { sentAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.admin_notification.count(),
    ]);
    return res.status(200).json({ notifications, total });
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * POST /api/admin/notifications — send/record a notification
 * The admin panel records the notification and marks who it was targeted at.
 * Actual push delivery should be wired to your push service of choice via the
 * existing infrastructure (FCM / Expo / etc.) — this controller records the
 * intent and stores the message so the admin has a full send history.
 */
export const sendNotification = async (req: Request, res: Response) => {
  try {
    // adminId is injected by adminAuthMiddleware onto req
    const adminId = (req as any).adminId as string | undefined;
    if (!adminId) return res.status(401).json({ message: "Unauthorized" });

    const { title, body, target, targetId } = req.body ?? {};

    if (typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ message: "title is required" });
    }
    if (typeof body !== "string" || !body.trim()) {
      return res.status(400).json({ message: "body is required" });
    }
    const resolvedTarget: NotifTarget = isTarget(target) ? target : "ALL";

    const notification = await prisma.admin_notification.create({
      data: {
        title: title.trim(),
        body: body.trim(),
        target: resolvedTarget,
        targetId: typeof targetId === "string" && targetId.trim() ? targetId.trim() : null,
        adminId,
      },
    });

    return res.status(201).json({ message: "Notification sent", notification });
  } catch (error) {
    return handleError(res, error);
  }
};

/** DELETE /api/admin/notifications/:id */
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const existing = await prisma.admin_notification.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return res.status(404).json({ message: "Notification not found" });
    await prisma.admin_notification.delete({ where: { id } });
    return res.status(200).json({ message: "Notification deleted" });
  } catch (error) {
    return handleError(res, error);
  }
};
