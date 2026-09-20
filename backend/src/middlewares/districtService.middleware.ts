import type { Request, Response, NextFunction } from "express";
import prisma from "../db/prisma.js";

export const districtServiceMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const districtId = req.params.districtId ?? req.body.districtId;

    if (!districtId) {
      return res.status(400).json({
        message: "District ID is required",
      });
    }

    const district = await prisma.district.findUnique({
      where: {
        id: districtId,
      },
      include: {
        state: {
          include: {
            country: true,
          },
        },
      },
    });

    if (!district) {
      return res.status(404).json({
        message: "District not found",
      });
    }

    const isServiceAvailable =
      district.isServiceAvailable &&
      district.state.isServiceAvailable &&
      district.state.country.isServiceAvailable;

    if (!isServiceAvailable) {
      return res.status(403).json({
        message: "Service is not available in this district",
      });
    }

    next();
  } catch (error) {
    console.error("District service middleware error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};