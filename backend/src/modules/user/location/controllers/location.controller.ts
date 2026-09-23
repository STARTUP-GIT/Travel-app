import type { Request, Response } from "express";
import prisma from "../../../../db/prisma.js";

/**
 * Customer-facing geographic availability.
 *
 * These endpoints are the single source of truth for "where can a customer
 * explore" and are driven purely by the admin enable/disable controls:
 *
 * - GET /api/states    -> states where state.isServiceAvailable === true
 * - GET /api/districts -> districts where district.isServiceAvailable === true
 *                          AND parent state.isServiceAvailable === true
 *
 * Availability never depends on approved listings, places, hotels,
 * restaurants or guides. Content counts are reported separately below each
 * record so customers still see what exists inside a location.
 */
export const getCustomerStates = async (_req: Request, res: Response) => {
  try {
    const states = await prisma.state.findMany({
      where: {
        isServiceAvailable: true,
      },
      include: {
        country: true,
        _count: {
          select: { districts: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return res.status(200).json({ states });
  } catch (error) {
    console.error("Get customer states error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getCustomerDistricts = async (_req: Request, res: Response) => {
  try {
    const districts = await prisma.district.findMany({
      where: {
        isServiceAvailable: true,
        state: {
          isServiceAvailable: true,
        },
      },
      include: {
        state: {
          include: {
            country: true,
          },
        },
        _count: {
          select: { places: true, hotels: true, restaurent: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return res.status(200).json({ districts });
  } catch (error) {
    console.error("Get customer districts error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};