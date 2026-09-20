import type { Request, Response } from "express";
import { ZodError } from "zod";
import prisma from "../../../../../db/prisma.js";
import { bookingStatusSchema } from "../../../../../services/zod.js";

const userSafeSelect = {
  id: true,
  name: true,
  username: true,
  email: true,
  phonenumber: true,
  profilepic: true,
} as const;

export const getOwnerReservations = async (req: Request, res: Response) => {
  try {
    const ownerId = req.restaurent_owner;

    if (!ownerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const restaurents = await prisma.restaurent.findMany({
      where: { restaurentOwnerId: ownerId },
      select: { id: true },
    });

    const restaurentIds = restaurents.map((restaurent) => restaurent.id);

    const reservations = await prisma.restaurant_reservation.findMany({
      where: { restaurantId: { in: restaurentIds } },
      include: {
        restaurent: true,
        user: { select: userSafeSelect },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(reservations);
  } catch (error) {
    console.error("Get owner reservations error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const getOwnerReservationById = async (req: Request, res: Response) => {
  try {
    const ownerId = req.restaurent_owner;

    if (!ownerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { reservationId } = req.params as { reservationId: string };

    const reservation = await prisma.restaurant_reservation.findUnique({
      where: { id: reservationId },
      include: {
        restaurent: true,
        user: { select: userSafeSelect },
      },
    });

    if (!reservation) {
      return res.status(404).json({
        message: "Reservation not found",
      });
    }

    if (reservation.restaurent.restaurentOwnerId !== ownerId) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    return res.status(200).json(reservation);
  } catch (error) {
    console.error("Get owner reservation by id error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const updateReservationStatus = async (req: Request, res: Response) => {
  try {
    const ownerId = req.restaurent_owner;

    if (!ownerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { reservationId } = req.params as { reservationId: string };

    const status = bookingStatusSchema.parse(req.body);

    const reservation = await prisma.restaurant_reservation.findUnique({
      where: { id: reservationId },
      include: { restaurent: { select: { restaurentOwnerId: true } } },
    });

    if (!reservation) {
      return res.status(404).json({
        message: "Reservation not found",
      });
    }

    if (reservation.restaurent.restaurentOwnerId !== ownerId) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    const updatedReservation = await prisma.restaurant_reservation.update({
      where: { id: reservationId },
      data: { status },
      include: {
        restaurent: true,
        user: { select: userSafeSelect },
      },
    });

    return res.status(200).json({
      message: "Reservation status updated successfully",
      reservation: updatedReservation,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    console.error("Update reservation status error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};