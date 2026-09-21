import type { Request, Response } from "express";
import prisma from "../../../../../db/prisma.js";

export const updateDistrictService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { isServiceAvailable } = req.body;

    if (typeof isServiceAvailable !== "boolean") {
      return res.status(400).json({
        message: "isServiceAvailable must be a boolean",
      });
    }

    const district = await prisma.district.findUnique({
      where: {
        id,
      },
    });

    if (!district) {
      return res.status(404).json({
        message: "District not found",
      });
    }

    const updatedDistrict = await prisma.district.update({
      where: {
        id,
      },
      data: {
        isServiceAvailable,
      },
    });

    return res.status(200).json({
      message: "District service availability updated successfully",
      district: updatedDistrict,
    });
  } catch (error) {
    console.error("Update district service error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const updateDistrictAutoApprove = async (req: Request, res: Response) => {
  try {
    const { districtId } = req.params as { districtId: string };
    const { autoApprovePlaces } = req.body;

    if (typeof autoApprovePlaces !== "boolean") {
      return res.status(400).json({
        message: "autoApprovePlaces must be a boolean",
      });
    }

    const district = await prisma.district.findUnique({
      where: {
        id: districtId,
      },
    });

    if (!district) {
      return res.status(404).json({
        message: "District not found",
      });
    }

    const updatedDistrict = await prisma.district.update({
      where: {
        id: districtId,
      },
      data: {
        autoApprovePlaces,
      },
    });

    return res.status(200).json({
      message: "District place auto-approval updated successfully",
      district: updatedDistrict,
    });
  } catch (error) {
    console.error("Update district auto-approval error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};