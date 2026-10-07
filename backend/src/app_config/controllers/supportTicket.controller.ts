import type { Request, Response } from "express";
import prisma from "../../db/prisma.js";

const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;
type TicketStatus = (typeof TICKET_STATUSES)[number];

function isTicketStatus(v: unknown): v is TicketStatus {
  return typeof v === "string" && TICKET_STATUSES.includes(v as TicketStatus);
}

const handleError = (res: Response, error: unknown) => {
  console.error("Support ticket error:", error);
  return res.status(500).json({ message: "Internal Server Error" });
};

/** GET /api/admin/support-tickets — list tickets with optional status filter */
export const listSupportTickets = async (req: Request, res: Response) => {
  try {
    const rawStatus = typeof req.query.status === "string" ? req.query.status : undefined;
    const status = rawStatus && isTicketStatus(rawStatus) ? rawStatus : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;

    const tickets = await prisma.support_ticket.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(search
          ? {
              OR: [
                { subject: { contains: search, mode: "insensitive" } },
                { body: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ tickets });
  } catch (error) {
    return handleError(res, error);
  }
};

/** GET /api/admin/support-tickets/:id — get single ticket */
export const getSupportTicketById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const ticket = await prisma.support_ticket.findUnique({ where: { id } });
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });
    return res.status(200).json({ ticket });
  } catch (error) {
    return handleError(res, error);
  }
};

/** POST /api/admin/support-tickets — create a ticket (admin can raise on behalf of customer) */
export const createSupportTicket = async (req: Request, res: Response) => {
  try {
    const { subject, body, userId, guideEmail } = req.body ?? {};
    if (typeof subject !== "string" || !subject.trim()) {
      return res.status(400).json({ message: "subject is required" });
    }
    if (typeof body !== "string" || !body.trim()) {
      return res.status(400).json({ message: "body is required" });
    }

    const ticket = await prisma.support_ticket.create({
      data: {
        subject: subject.trim(),
        body: body.trim(),
        userId: typeof userId === "string" && userId.trim() ? userId.trim() : null,
        guideEmail: typeof guideEmail === "string" && guideEmail.trim() ? guideEmail.trim() : null,
      },
    });

    return res.status(201).json({ message: "Ticket created", ticket });
  } catch (error) {
    return handleError(res, error);
  }
};

/** PATCH /api/admin/support-tickets/:id — update status, assignedTo, resolution */
export const updateSupportTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { status, assignedTo, resolution } = req.body ?? {};

    const data: Record<string, unknown> = {};
    if (status !== undefined) {
      if (!isTicketStatus(status)) {
        return res.status(400).json({ message: "Invalid ticket status" });
      }
      data.status = status;
    }
    if (assignedTo !== undefined) data.assignedTo = typeof assignedTo === "string" ? assignedTo : null;
    if (resolution !== undefined) data.resolution = typeof resolution === "string" ? resolution : null;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const existing = await prisma.support_ticket.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return res.status(404).json({ message: "Ticket not found" });

    const ticket = await prisma.support_ticket.update({ where: { id }, data });
    return res.status(200).json({ message: "Ticket updated", ticket });
  } catch (error) {
    return handleError(res, error);
  }
};

/** DELETE /api/admin/support-tickets/:id — delete a resolved/closed ticket */
export const deleteSupportTicket = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const existing = await prisma.support_ticket.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return res.status(404).json({ message: "Ticket not found" });
    await prisma.support_ticket.delete({ where: { id } });
    return res.status(200).json({ message: "Ticket deleted" });
  } catch (error) {
    return handleError(res, error);
  }
};
