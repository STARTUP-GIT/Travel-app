import type { Request, Response } from "express";
import prisma from "../../../../db/prisma.js";

export const updateCountryService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { isServiceAvailable } = req.body;

    if (typeof isServiceAvailable !== "boolean") {
      return res.status(400).json({
        message: "isServiceAvailable must be a boolean",
      });
    }

    const country = await prisma.country.findUnique({
      where: {
        id,
      },
    });

    if (!country) {
      return res.status(404).json({
        message: "Country not found",
      });
    }

    const updatedCountry = await prisma.country.update({
      where: {
        id,
      },
      data: {
        isServiceAvailable,
      },
    });

    return res.status(200).json({
      message: "Country service availability updated successfully",
      country: updatedCountry,
    });
  } catch (error) {
    console.error("Update country service error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};