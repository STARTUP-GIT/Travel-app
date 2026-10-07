import type { Request, Response } from "express";
import { Prisma } from "../../generated/client/client.js";
import prisma from "../../db/prisma.js";

const handleError = (res: Response, error: unknown) => {
  console.error("Audit log error:", error);
  return res.status(500).json({ message: "Internal Server Error" });
};

/**
 * GET /api/admin/audit-logs
 * Returns paginated audit log entries. Optional filters: entity, entityId, adminId.
 */
export const listAuditLogs = async (req: Request, res: Response) => {
  try {
    const entity = typeof req.query.entity === "string" ? req.query.entity : undefined;
    const entityId = typeof req.query.entityId === "string" ? req.query.entityId : undefined;
    const adminId = typeof req.query.adminId === "string" ? req.query.adminId : undefined;
    const limit = Math.min(100, parseInt(String(req.query.limit ?? "50"), 10) || 50);
    const skip = parseInt(String(req.query.skip ?? "0"), 10) || 0;

    const where = {
      ...(entity ? { entity } : {}),
      ...(entityId ? { entityId } : {}),
      ...(adminId ? { adminId } : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.audit_log.findMany({
        where,
        include: { admin: { select: { id: true, name: true, username: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.audit_log.count({ where }),
    ]);

    return res.status(200).json({ logs, total, limit, skip });
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * Internal helper — other controllers call this to record an audit entry.
 * It never throws so an audit failure never blocks the actual operation.
 */
export async function recordAuditLog(entry: {
  adminId: string;
  action: string;
  entity: string;
  entityId: string;
  detail: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  try {
    await prisma.audit_log.create({
      data: {
        adminId: entry.adminId,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        detail: entry.detail,
        before: entry.before === null ? Prisma.JsonNull : entry.before === undefined ? Prisma.DbNull : (entry.before as unknown as Prisma.InputJsonValue),
        after: entry.after === null ? Prisma.JsonNull : entry.after === undefined ? Prisma.DbNull : (entry.after as unknown as Prisma.InputJsonValue),
      },
    });
  } catch (err) {
    console.error("Failed to write audit log:", err);
  }
}
