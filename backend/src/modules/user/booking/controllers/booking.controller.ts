import type { Request, Response } from "express";
import { ZodError } from "zod";
import prisma from "../../../../db/prisma.js";
import { ownerPrisma } from "../../../../services/ownerPrisma.js";
import {
  findDistrictWithHierarchy,
  isDistrictAvailable,
} from "../../../../services/locationAvailability.js";
import {
  hotelBookingSchema,
  restaurantReservationSchema,
  specificGuideBookingSchema,
  commonGuideBookingSchema,
} from "../../../../services/zod.js";

export const createHotelBooking = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const data = hotelBookingSchema.parse(req.body);

    const hotel = await ownerPrisma.hotel.findUnique({
      where: { id: data.hotelId },
    });

    if (!hotel) {
      return res.status(404).json({ message: "Hotel not found" });
    }

    if (!hotel.booking_enabled) {
      return res.status(400).json({
        message: "Booking is not available for this hotel",
      });
    }

    const district = await findDistrictWithHierarchy(hotel.districtId);

    if (!district || !isDistrictAvailable(district)) {
      return res.status(400).json({
        message: "Booking is not available for this location",
      });
    }

    if (data.checkOut <= data.checkIn) {
      return res.status(400).json({
        message: "Check-out date must be after check-in date",
      });
    }

    const nights = Math.max(
      1,
      Math.round(
        (new Date(data.checkOut).getTime() -
          new Date(data.checkIn).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );

    const totalAmount = hotel.cost_per_night * nights * data.rooms;

    const booking = await ownerPrisma.hotel_booking.create({
      data: {
        hotelId: data.hotelId,
        userId,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        guests: data.guests,
        rooms: data.rooms,
        totalAmount,
      },
      include: { hotel: true, user: true },
    });

    return res.status(201).json({
      message: "Hotel booking created successfully",
      booking,
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

    console.error("Create hotel booking error:", error);

    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getUserHotelBookings = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    const bookings = await ownerPrisma.hotel_booking.findMany({
      where: { userId },
      include: { hotel: true },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(bookings);
  } catch (error) {
    console.error("Get user hotel bookings error:", error);

    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createRestaurantReservation = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const data = restaurantReservationSchema.parse(req.body);

    const restaurent = await ownerPrisma.restaurent.findUnique({
      where: { id: data.restaurantId },
    });

    if (!restaurent) {
      return res.status(404).json({ message: "Restaurent not found" });
    }

    if (!restaurent.booking_enabled) {
      return res.status(400).json({
        message: "Reservation is not available for this restaurent",
      });
    }

    const district = await findDistrictWithHierarchy(restaurent.districtId);

    if (!district || !isDistrictAvailable(district)) {
      return res.status(400).json({
        message: "Reservation is not available for this location",
      });
    }

    const reservation = await ownerPrisma.restaurant_reservation.create({
      data: {
        restaurantId: data.restaurantId,
        userId,
        reservationDate: data.reservationDate,
        guests: data.guests,
      },
      include: { restaurent: true, user: true },
    });

    return res.status(201).json({
      message: "Restaurant reservation created successfully",
      reservation,
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

    console.error("Create restaurant reservation error:", error);

    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getUserRestaurantReservations = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    const reservations = await ownerPrisma.restaurant_reservation.findMany({
      where: { userId },
      include: { restaurent: true },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(reservations);
  } catch (error) {
    console.error("Get user restaurant reservations error:", error);

    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createSpecificGuideBooking = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = specificGuideBookingSchema.parse(req.body);

    const guide = await prisma.specific_guide.findUnique({
      where: { id: data.specificGuideId },
      include: { place: true },
    });

    if (!guide) {
      return res.status(404).json({ message: "Specific guide not found" });
    }

    const district = await findDistrictWithHierarchy(guide.place.districtId);

    if (!district || !isDistrictAvailable(district)) {
      return res.status(400).json({
        message: "Booking is not available for this location",
      });
    }

    const booking = await prisma.specific_guide_booking.create({
      data: {
        userId,
        specificGuideId: guide.id,
        placeId: guide.placeid,
        bookingDate: data.bookingDate,
        ...(data.bookingTime !== undefined ? { bookingTime: data.bookingTime } : {}),
      },
      include: { specificGuide: true, place: true, user: true },
    });

    return res.status(201).json({
      message: "Specific guide booking created successfully",
      booking,
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

    console.error("Create specific guide booking error:", error);

    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getUserSpecificGuideBookings = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const bookings = await prisma.specific_guide_booking.findMany({
      where: { userId },
      include: { specificGuide: true, place: true },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(bookings);
  } catch (error) {
    console.error("Get user specific guide bookings error:", error);

    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const createCommonGuideBooking = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const data = commonGuideBookingSchema.parse(req.body);

    const guide = await prisma.common_guide.findUnique({
      where: { id: data.commonGuideId },
      include: { places: { include: { place: true } } },
    });

    if (!guide) {
      return res.status(404).json({ message: "Common guide not found" });
    }

    const uniquePlaceIds = [...new Set(data.placeIds)];

    if (uniquePlaceIds.length !== data.placeIds.length) {
      return res.status(400).json({
        message: "Duplicate place IDs are not allowed",
      });
    }

    const associatedPlaceIds = guide.places.map((guidePlace) => guidePlace.placeId);

    const invalidPlaceIds = uniquePlaceIds.filter(
      (placeId) => !associatedPlaceIds.includes(placeId)
    );

    if (invalidPlaceIds.length > 0) {
      return res.status(400).json({
        message: "One or more selected places are not associated with this common guide",
        invalidPlaceIds,
      });
    }

    const districtIds = [
      ...new Set(
        guide.places
          .filter((guidePlace) => uniquePlaceIds.includes(guidePlace.placeId))
          .map((guidePlace) => guidePlace.place.districtId)
      ),
    ];

    for (const districtId of districtIds) {
      const district = await findDistrictWithHierarchy(districtId);

      if (!district || !isDistrictAvailable(district)) {
        return res.status(400).json({
          message: "Booking is not available for this location",
        });
      }
    }

    const booking = await prisma.common_guide_booking.create({
      data: {
        userId,
        commonGuideId: guide.id,
        bookingDate: data.bookingDate,
        ...(data.bookingTime !== undefined ? { bookingTime: data.bookingTime } : {}),
        selectedPlaces: {
          create: uniquePlaceIds.map((placeId) => ({ placeId })),
        },
      },
      include: {
        commonGuide: true,
        user: true,
        selectedPlaces: { include: { place: true } },
      },
    });

    return res.status(201).json({
      message: "Common guide booking created successfully",
      numberOfPlaces: booking.selectedPlaces.length,
      booking,
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

    console.error("Create common guide booking error:", error);

    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getUserCommonGuideBookings = async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const bookings = await prisma.common_guide_booking.findMany({
      where: { userId },
      include: {
        commonGuide: true,
        selectedPlaces: { include: { place: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(bookings);
  } catch (error) {
    console.error("Get user common guide bookings error:", error);

    return res.status(500).json({ message: "Internal Server Error" });
  }
};