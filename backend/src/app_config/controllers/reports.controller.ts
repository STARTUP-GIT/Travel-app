import type { Request, Response } from "express";
import prisma from "../../db/prisma.js";

const handleError = (res: Response, error: unknown) => {
  console.error("Reports error:", error);
  return res.status(500).json({ message: "Unable to process reports right now. Please try again." });
};

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * GET /api/admin/reports — unified reports & payments payload consumed by /reports and /payments pages.
 */
export const getReports = async (_req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalSpecificGuides,
      totalCommonGuides,
      totalPlaces,
      totalHotels,
      totalRestaurants,
      hotelRevenueSum,
      hotelBookings,
      specificGuideBookings,
      commonGuideBookings,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.specific_guide.count(),
      prisma.common_guide.count(),
      prisma.place.count(),
      prisma.hotel.count(),
      prisma.restaurent.count(),
      prisma.hotel_booking.aggregate({ _sum: { totalAmount: true } }),
      prisma.hotel_booking.findMany({
        select: {
          id: true,
          totalAmount: true,
          status: true,
          createdAt: true,
          hotel: { select: { name: true } },
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.specific_guide_booking.findMany({
        select: {
          id: true,
          status: true,
          createdAt: true,
          specificGuide: { select: { full_name: true, cost: true } },
          user: { select: { name: true, email: true } },
          place: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.common_guide_booking.findMany({
        select: {
          id: true,
          status: true,
          createdAt: true,
          commonGuide: { select: { full_name: true, cost: true } },
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
    ]);

    const hotelRevenue = hotelRevenueSum._sum.totalAmount ?? 0;
    const specificGuideRev = specificGuideBookings.reduce(
      (sum, b) => sum + (b.specificGuide?.cost ?? 0),
      0
    );
    const commonGuideRev = commonGuideBookings.reduce(
      (sum, b) => sum + (b.commonGuide?.cost ?? 0),
      0
    );
    const guideRevenue = specificGuideRev + commonGuideRev;
    const totalRevenue = hotelRevenue + guideRevenue;

    const formattedHotelBookings = hotelBookings.map((b) => ({
      id: b.id,
      type: "HOTEL" as const,
      title: b.hotel?.name ?? "Hotel Booking",
      user: b.user?.name ?? b.user?.email ?? "Customer",
      amount: b.totalAmount ?? 0,
      status: String(b.status),
      date: b.createdAt.toISOString(),
    }));

    const formattedSpecificBookings = specificGuideBookings.map((b) => ({
      id: b.id,
      type: "GUIDE" as const,
      title: `${b.specificGuide?.full_name ?? "Specific Guide"}${
        b.place?.name ? ` (${b.place.name})` : ""
      }`,
      user: b.user?.name ?? b.user?.email ?? "Customer",
      amount: b.specificGuide?.cost ?? 0,
      status: String(b.status),
      date: b.createdAt.toISOString(),
    }));

    const formattedCommonBookings = commonGuideBookings.map((b) => ({
      id: b.id,
      type: "GUIDE" as const,
      title: b.commonGuide?.full_name ?? "Common Guide",
      user: b.user?.name ?? b.user?.email ?? "Customer",
      amount: b.commonGuide?.cost ?? 0,
      status: String(b.status),
      date: b.createdAt.toISOString(),
    }));

    const recentBookings = [
      ...formattedHotelBookings,
      ...formattedSpecificBookings,
      ...formattedCommonBookings,
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 50);

    return res.status(200).json({
      counts: {
        users: totalUsers,
        guides: totalSpecificGuides + totalCommonGuides,
        places: totalPlaces,
        hotels: totalHotels,
        restaurants: totalRestaurants,
      },
      revenue: {
        totalRevenue,
        hotelRevenue,
        guideRevenue,
      },
      recentBookings,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * GET /api/admin/reports/export?type=users|bookings|places|revenue
 */
export const exportReportsCsv = async (req: Request, res: Response) => {
  try {
    const type = String(req.query.type ?? "users").toLowerCase();
    let rows: string[][] = [];

    if (type === "users") {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          phonenumber: true,
          authprovider: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
      rows = [
        ["User ID", "Name", "Username", "Email", "Phone Number", "Auth Provider", "Created At"],
        ...users.map((u) => [
          u.id,
          u.name,
          u.username,
          u.email,
          u.phonenumber,
          u.authprovider ?? "EMAIL",
          u.createdAt.toISOString(),
        ]),
      ];
    } else if (type === "bookings") {
      const [hotelBookings, specificGuideBookings, commonGuideBookings] = await Promise.all([
        prisma.hotel_booking.findMany({
          select: {
            id: true,
            totalAmount: true,
            status: true,
            createdAt: true,
            hotel: { select: { name: true } },
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.specific_guide_booking.findMany({
          select: {
            id: true,
            status: true,
            createdAt: true,
            specificGuide: { select: { full_name: true, cost: true } },
            user: { select: { name: true, email: true } },
            place: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.common_guide_booking.findMany({
          select: {
            id: true,
            status: true,
            createdAt: true,
            commonGuide: { select: { full_name: true, cost: true } },
            user: { select: { name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

      const all = [
        ...hotelBookings.map((b) => ({
          id: b.id,
          type: "HOTEL",
          title: b.hotel?.name ?? "Hotel Booking",
          userName: b.user?.name ?? "",
          userEmail: b.user?.email ?? "",
          amount: b.totalAmount ?? 0,
          status: b.status,
          date: b.createdAt.toISOString(),
        })),
        ...specificGuideBookings.map((b) => ({
          id: b.id,
          type: "GUIDE",
          title: `${b.specificGuide?.full_name ?? "Specific Guide"}${
            b.place?.name ? ` (${b.place.name})` : ""
          }`,
          userName: b.user?.name ?? "",
          userEmail: b.user?.email ?? "",
          amount: b.specificGuide?.cost ?? 0,
          status: b.status,
          date: b.createdAt.toISOString(),
        })),
        ...commonGuideBookings.map((b) => ({
          id: b.id,
          type: "GUIDE",
          title: b.commonGuide?.full_name ?? "Common Guide",
          userName: b.user?.name ?? "",
          userEmail: b.user?.email ?? "",
          amount: b.commonGuide?.cost ?? 0,
          status: b.status,
          date: b.createdAt.toISOString(),
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      rows = [
        [
          "Booking ID",
          "Type",
          "Service Name",
          "Customer Name",
          "Customer Email",
          "Amount",
          "Status",
          "Created At",
        ],
        ...all.map((b) => [
          b.id,
          b.type,
          b.title,
          b.userName,
          b.userEmail,
          String(b.amount),
          String(b.status),
          b.date,
        ]),
      ];
    } else if (type === "places") {
      const places = await prisma.place.findMany({
        select: {
          id: true,
          name: true,
          category: true,
          entryfee: true,
          status: true,
          createdAt: true,
          district: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      rows = [
        ["Place ID", "Name", "Category", "District", "Entry Fee", "Status", "Created At"],
        ...places.map((p) => [
          p.id,
          p.name,
          p.category,
          p.district?.name ?? "",
          String(p.entryfee ?? 0),
          String(p.status),
          p.createdAt.toISOString(),
        ]),
      ];
    } else if (type === "revenue") {
      const hotelBookings = await prisma.hotel_booking.findMany({
        select: {
          id: true,
          totalAmount: true,
          status: true,
          createdAt: true,
          hotel: { select: { name: true } },
          user: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      rows = [
        [
          "Transaction ID",
          "Type",
          "Service Name",
          "Customer Name",
          "Customer Email",
          "Amount",
          "Status",
          "Created At",
        ],
        ...hotelBookings.map((b) => [
          b.id,
          "HOTEL_BOOKING",
          b.hotel?.name ?? "Hotel Stay",
          b.user?.name ?? "",
          b.user?.email ?? "",
          String(b.totalAmount ?? 0),
          String(b.status),
          b.createdAt.toISOString(),
        ]),
      ];
    } else {
      return res.status(400).json({ message: "Invalid report type" });
    }

    const csvText = rows.map((row) => row.map(escapeCsvField).join(",")).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${type}_export_${new Date().toISOString().slice(0, 10)}.csv"`
    );
    return res.status(200).send(csvText);
  } catch (error) {
    return handleError(res, error);
  }
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

