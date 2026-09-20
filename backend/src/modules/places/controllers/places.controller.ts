import type { Request, Response } from "express";
import prisma from "../../../db/prisma.js";

export const getPlacesByDistrict = async (req: Request, res: Response) => {
  try {
    const { districtId } = req.params as { districtId: string };

    const places = await prisma.place.findMany({
      where: {
        districtId,
      },

      include: {
        district: {
          include: {
            state: {
              include: {
                country: true,
              },
            },
          },
        },
      },
    });

    return res.status(200).json(places);
  } catch (error) {
    console.error("Get places by district error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const addPlace = async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      districtId,
      images,
      entryfee,
      category,
      latitude,
      longitude,
    } = req.body;

    const newPlace = await prisma.place.create({
      data: {
        name,
        description,
        districtId,
        images,
        entryfee,
        category,
        latitude,
        longitude,
      },
    });

    return res.status(201).json({
      message: "Place added successfully",
      place: newPlace,
    });
  } catch (error) {
    console.error("Add place error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const getPlaceById = async (req: Request, res: Response) => {
  try {
    const { placeId } = req.params as { placeId: string };

    const place = await prisma.place.findUnique({
      where: {
        id: placeId,
      },

      include: {
        specificguide: true,

        commonGuidePlaces: {
          include: {
            commonGuide: true,
          },
        },

        district: {
          include: {
            state: {
              include: {
                country: true,
              },
            },
          },
        },
      },
    });

    if (!place) {
      return res.status(404).json({
        message: "Place not found",
      });
    }

    return res.status(200).json(place);
  } catch (error) {
    console.error("Get place error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};