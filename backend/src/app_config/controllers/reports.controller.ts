import type { Request, Response } from "express";
import prisma from "../../db/prisma.js";

const handleError = (res: Response, error: unknown) => {
  console.error("Reports error:", error);
  return res.status(500).json({ message: "Internal Server Error" });
};

/**
 * GET /api/admin/reports/summary — aggregate stats snapshot for reports page.
 * Uses real database counts and sums.
 */
export const getReportSummary = async (_req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalSpecificGuides,
      totalCommonGuides,
      totalPlaces,
      totalHotels,
      totalRestaurants,
      totalHotelBookings,
      totalRestaurantReservations,
      totalSpecificGuideBookings,
      totalCommonGuideBookings,
      hotelRevenue,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.specific_guide.count(),
      prisma.common_guide.count(),
      prisma.place.count(),
      prisma.hotel.count(),
      prisma.restaurent.count(),
      prisma.hotel_booking.count(),
      prisma.restaurant_reservation.count(),
      prisma.specific_guide_booking.count(),
      prisma.common_guide_booking.count(),
      prisma.hotel_booking.aggregate({ _sum: { totalAmount: true } }),
    ]);

    return res.status(200).json({
      users: totalUsers,
      guides: totalSpecificGuides + totalCommonGuides,
      specificGuides: totalSpecificGuides,
      tourGuides: totalCommonGuides,
      places: totalPlaces,
      hotels: totalHotels,
      restaurants: totalRestaurants,
      bookings: {
        hotel: totalHotelBookings,
        reservation: totalRestaurantReservations,
        specificGuide: totalSpecificGuideBookings,
        commonGuide: totalCommonGuideBookings,
        total:
          totalHotelBookings +
          totalRestaurantReservations +
          totalSpecificGuideBookings +
          totalCommonGuideBookings,
      },
      revenue: {
        hotelTotal: hotelRevenue._sum.totalAmount ?? 0,
      },
    });
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * GET /api/admin/reports/users — exportable user list (CSV-friendly flat rows).
 */
export const getUsersReport = async (_req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phonenumber: true,
        authprovider: true,
        createdAt: true,
        _count: {
          select: {
            hotel_booking: true,
            restaurant_reservation: true,
            specificGuideBookings: true,
            commonGuideBookings: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ users });
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * GET /api/admin/reports/bookings — all booking types in one payload.
 */
export const getBookingsReport = async (_req: Request, res: Response) => {
  try {
    const [hotelBookings, reservations, specificGuideBookings, commonGuideBookings] =
      await Promise.all([
        prisma.hotel_booking.findMany({
          select: {
            id: true,
            status: true,
            totalAmount: true,
            checkIn: true,
            checkOut: true,
            guests: true,
            rooms: true,
            createdAt: true,
            hotel: { select: { id: true, name: true } },
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.restaurant_reservation.findMany({
          select: {
            id: true,
            status: true,
            guests: true,
            reservationDate: true,
            createdAt: true,
            restaurent: { select: { id: true, name: true } },
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.specific_guide_booking.findMany({
          select: {
            id: true,
            status: true,
            bookingDate: true,
            createdAt: true,
            specificGuide: { select: { id: true, full_name: true } },
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.common_guide_booking.findMany({
          select: {
            id: true,
            status: true,
            bookingDate: true,
            createdAt: true,
            commonGuide: { select: { id: true, full_name: true } },
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    return res.status(200).json({
      hotelBookings,
      reservations,
      specificGuideBookings,
      commonGuideBookings,
    });
  } catch (error) {
    return handleError(res, error);
  }
};
