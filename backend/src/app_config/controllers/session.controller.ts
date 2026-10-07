import type { Request, Response } from "express";
import prisma from "../../db/prisma.js";

const handleError = (res: Response, error: unknown) => {
  console.error("Session error:", error);
  return res.status(500).json({ message: "Internal Server Error" });
};

/**
 * GET /api/admin/sessions — list active (non-revoked) sessions, newest first.
 * An optional adminId query param filters to one admin's sessions.
 */
export const listSessions = async (req: Request, res: Response) => {
  try {
    const adminId = typeof req.query.adminId === "string" ? req.query.adminId : undefined;
    const sessions = await prisma.admin_session.findMany({
      where: {
        isRevoked: false,
        ...(adminId ? { adminId } : {}),
      },
      include: { admin: { select: { id: true, name: true, username: true, email: true } } },
      orderBy: { lastSeenAt: "desc" },
    });
    return res.status(200).json({ sessions });
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * DELETE /api/admin/sessions/:id — revoke a session (force logout).
 * Does not delete the row so the audit trail is preserved.
 */
export const revokeSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const existing = await prisma.admin_session.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return res.status(404).json({ message: "Session not found" });
    await prisma.admin_session.update({ where: { id }, data: { isRevoked: true } });
    return res.status(200).json({ message: "Session revoked" });
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * POST /api/admin/sessions — called internally by the admin auth login handler
 * to record a new session. Not exposed to the admin UI directly.
 */
export async function recordSession(adminId: string, userAgent: string, ipAddress: string): Promise<string> {
  const session = await prisma.admin_session.create({
    data: { adminId, userAgent, ipAddress },
  });
  return session.id;
}

/**
 * Called by the admin middleware on each authenticated request to keep
 * lastSeenAt current. Fire-and-forget — failure does not block the request.
 */
export async function touchSession(sessionId: string): Promise<void> {
  try {
    await prisma.admin_session.update({
      where: { id: sessionId, isRevoked: false },
      data: { lastSeenAt: new Date() },
    });
  } catch {
    // Non-fatal: the session might have been revoked concurrently.
  }
}
