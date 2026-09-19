import type { Request, Response } from "express";
import prisma from "../../../../db/prisma.js";

export const updateStateService = async (req: Request, res: Response) => {
  try {
    const { id } = req.params as { id: string };
    const { isServiceAvailable } = req.body;

    if (typeof isServiceAvailable !== "boolean") {
      return res.status(400).json({
        message: "isServiceAvailable must be a boolean",
      });
    }

    const state = await prisma.state.findUnique({
      where: {
        id,
      },
    });

    if (!state) {
      return res.status(404).json({
        message: "State not found",
      });
    }

    const updatedState = await prisma.state.update({
      where: {
        id,
      },
      data: {
        isServiceAvailable,
      },
    });

    return res.status(200).json({
      message: "State service availability updated successfully",
      state: updatedState,
    });
  } catch (error) {
    console.error("Update state service error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};