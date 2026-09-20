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

export const getOwnerBookings = async (req: Request, res: Response) => {
  try {
    const ownerId = req.hotel_owner;

    if (!ownerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const hotels = await prisma.hotel.findMany({
      where: { hotelOwnerId: ownerId },
      select: { id: true },
    });

    const hotelIds = hotels.map((hotel) => hotel.id);

    const bookings = await prisma.hotel_booking.findMany({
      where: { hotelId: { in: hotelIds } },
      include: {
        hotel: true,
        user: { select: userSafeSelect },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(bookings);
  } catch (error) {
    console.error("Get owner hotel bookings error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const getOwnerBookingById = async (req: Request, res: Response) => {
  try {
    const ownerId = req.hotel_owner;

    if (!ownerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { bookingId } = req.params as { bookingId: string };

    const booking = await prisma.hotel_booking.findUnique({
      where: { id: bookingId },
      include: {
        hotel: true,
        user: { select: userSafeSelect },
      },
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    if (booking.hotel.hotelOwnerId !== ownerId) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    return res.status(200).json(booking);
  } catch (error) {
    console.error("Get owner booking by id error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const updateBookingStatus = async (req: Request, res: Response) => {
  try {
    const ownerId = req.hotel_owner;

    if (!ownerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { bookingId } = req.params as { bookingId: string };

    const status = bookingStatusSchema.parse(req.body);

    const booking = await prisma.hotel_booking.findUnique({
      where: { id: bookingId },
      include: { hotel: { select: { hotelOwnerId: true } } },
    });

    if (!booking) {
      return res.status(404).json({
        message: "Booking not found",
      });
    }

    if (booking.hotel.hotelOwnerId !== ownerId) {
      return res.status(403).json({
        message: "Forbidden",
      });
    }

    const updatedBooking = await prisma.hotel_booking.update({
      where: { id: bookingId },
      data: { status },
      include: {
        hotel: true,
        user: { select: userSafeSelect },
      },
    });

    return res.status(200).json({
      message: "Booking status updated successfully",
      booking: updatedBooking,
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

    console.error("Update booking status error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};