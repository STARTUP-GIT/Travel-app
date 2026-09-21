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

export const submitPlace = async (req: Request, res: Response) => {
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

    if (
      typeof name !== "string" ||
      !name ||
      typeof description !== "string" ||
      !description ||
      typeof districtId !== "string" ||
      !districtId ||
      !Array.isArray(images) ||
      typeof entryfee !== "number" ||
      typeof category !== "string" ||
      !category ||
      typeof latitude !== "number" ||
      typeof longitude !== "number"
    ) {
      return res.status(400).json({
        message: "All place fields are required",
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

    const submissionData = {
      name,
      description,
      districtId,
      images,
      entryfee,
      category,
      latitude,
      longitude,
      ...(req.specific_guide ? { specificGuideId: req.specific_guide } : {}),
      ...(req.common_guide ? { commonGuideId: req.common_guide } : {}),
    };

    if (district.autoApprovePlaces) {
      const result = await prisma.$transaction(async (tx) => {
        const newPlace = await tx.place.create({
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

        const submission = await tx.place_submission.create({
          data: {
            ...submissionData,
            placeId: newPlace.id,
            status: "APPROVED",
          },
        });

        return { newPlace, submission };
      });

      return res.status(201).json({
        message: "Place added and approved successfully",
        place: result.newPlace,
        submission: result.submission,
      });
    }

    const submission = await prisma.place_submission.create({
      data: {
        ...submissionData,
        status: "PENDING",
      },
    });

    return res.status(201).json({
      message: "Place submitted for approval",
      submission,
    });
  } catch (error) {
    console.error("Submit place error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const submitPlaceEdit = async (req: Request, res: Response) => {
  try {
    const { placeId } = req.params as { placeId: string };
    const {
      name,
      description,
      images,
      entryfee,
      category,
      latitude,
      longitude,
    } = req.body;

    const place = await prisma.place.findUnique({
      where: {
        id: placeId,
      },
      include: {
        district: true,
      },
    });

    if (!place) {
      return res.status(404).json({
        message: "Place not found",
      });
    }

    const data: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name) {
        return res.status(400).json({
          message: "name must be a non-empty string",
        });
      }
      data.name = name;
    }

    if (description !== undefined) {
      if (typeof description !== "string" || !description) {
        return res.status(400).json({
          message: "description must be a non-empty string",
        });
      }
      data.description = description;
    }

    if (images !== undefined) {
      if (!Array.isArray(images)) {
        return res.status(400).json({
          message: "images must be an array",
        });
      }
      data.images = images;
    }

    if (entryfee !== undefined) {
      if (typeof entryfee !== "number") {
        return res.status(400).json({
          message: "entryfee must be a number",
        });
      }
      data.entryfee = entryfee;
    }

    if (category !== undefined) {
      if (typeof category !== "string" || !category) {
        return res.status(400).json({
          message: "category must be a non-empty string",
        });
      }
      data.category = category;
    }

    if (latitude !== undefined) {
      if (typeof latitude !== "number") {
        return res.status(400).json({
          message: "latitude must be a number",
        });
      }
      data.latitude = latitude;
    }

    if (longitude !== undefined) {
      if (typeof longitude !== "number") {
        return res.status(400).json({
          message: "longitude must be a number",
        });
      }
      data.longitude = longitude;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        message: "At least one place field must be provided",
      });
    }

    const pendingData = {
      name: (data.name as string) ?? place.name,
      description: (data.description as string) ?? place.description,
      images: (data.images as string[]) ?? place.images,
      entryfee: (data.entryfee as number) ?? place.entryfee,
      category: (data.category as string) ?? place.category,
      latitude: (data.latitude as number) ?? place.latitude,
      longitude: (data.longitude as number) ?? place.longitude,
    };

    if (place.district.autoApprovePlaces) {
      const result = await prisma.$transaction(async (tx) => {
        const updatedPlace = await tx.place.update({
          where: {
            id: placeId,
          },
          data: { ...data },
        });

        const submission = await tx.place_submission.create({
          data: {
            ...pendingData,
            districtId: place.districtId,
            placeId: updatedPlace.id,
            status: "APPROVED",
            ...(req.specific_guide ? { specificGuideId: req.specific_guide } : {}),
            ...(req.common_guide ? { commonGuideId: req.common_guide } : {}),
          },
        });

        return { updatedPlace, submission };
      });

      return res.status(200).json({
        message: "Place updated and approved successfully",
        place: result.updatedPlace,
        submission: result.submission,
      });
    }

    const submission = await prisma.place_submission.create({
      data: {
        ...pendingData,
        districtId: place.districtId,
        placeId,
        status: "PENDING",
        ...(req.specific_guide ? { specificGuideId: req.specific_guide } : {}),
        ...(req.common_guide ? { commonGuideId: req.common_guide } : {}),
      },
    });

    return res.status(201).json({
      message: "Place edit submitted for approval",
      submission,
    });
  } catch (error) {
    console.error("Submit place edit error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const editPlace = async (req: Request, res: Response) => {
  try {
    const { placeId } = req.params as { placeId: string };
    const {
      name,
      description,
      images,
      entryfee,
      category,
      latitude,
      longitude,
    } = req.body;

    const place = await prisma.place.findUnique({
      where: {
        id: placeId,
      },
    });

    if (!place) {
      return res.status(404).json({
        message: "Place not found",
      });
    }

    const updatedPlace = await prisma.place.update({
      where: {
        id: placeId,
      },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(images !== undefined ? { images } : {}),
        ...(entryfee !== undefined ? { entryfee } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(latitude !== undefined ? { latitude } : {}),
        ...(longitude !== undefined ? { longitude } : {}),
      },
    });

    return res.status(200).json({
      message: "Place updated successfully",
      place: updatedPlace,
    });
  } catch (error) {
    console.error("Edit place error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const getPendingPlaceSubmissions = async (req: Request, res: Response) => {
  try {
    const submissions = await prisma.place_submission.findMany({
      where: {
        status: "PENDING",
      },
      include: {
        place: true,
        district: true,
        specificGuide: true,
        commonGuide: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json(submissions);
  } catch (error) {
    console.error("Get pending place submissions error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const approvePlaceSubmission = async (req: Request, res: Response) => {
  try {
    const { submissionId } = req.params as { submissionId: string };

    const submission = await prisma.place_submission.findUnique({
      where: {
        id: submissionId,
      },
    });

    if (!submission) {
      return res.status(404).json({
        message: "Place submission not found",
      });
    }

    if (submission.status !== "PENDING") {
      return res.status(400).json({
        message: `Submission has already been ${submission.status.toLowerCase()}`,
      });
    }

    if (submission.placeId) {
      const placeId = submission.placeId;

      const place = await prisma.place.findUnique({
        where: {
          id: placeId,
        },
      });

      if (!place) {
        return res.status(404).json({
          message: "Place not found",
        });
      }

      const updatedPlace = await prisma.$transaction(async (tx) => {
        const updated = await tx.place.update({
          where: {
            id: placeId,
          },
          data: {
            name: submission.name,
            description: submission.description,
            images: submission.images,
            entryfee: submission.entryfee,
            category: submission.category,
            latitude: submission.latitude,
            longitude: submission.longitude,
          },
        });

        await tx.place_submission.update({
          where: {
            id: submissionId,
          },
          data: {
            status: "APPROVED",
          },
        });

        return updated;
      });

      return res.status(200).json({
        message: "Place submission approved and applied",
        place: updatedPlace,
      });
    }

    const newPlace = await prisma.$transaction(async (tx) => {
      const created = await tx.place.create({
        data: {
          name: submission.name,
          description: submission.description,
          districtId: submission.districtId,
          images: submission.images,
          entryfee: submission.entryfee,
          category: submission.category,
          latitude: submission.latitude,
          longitude: submission.longitude,
        },
      });

      await tx.place_submission.update({
        where: {
          id: submissionId,
        },
        data: {
          status: "APPROVED",
          placeId: created.id,
        },
      });

      return created;
    });

    return res.status(200).json({
      message: "Place submission approved and place created",
      place: newPlace,
    });
  } catch (error) {
    console.error("Approve place submission error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const rejectPlaceSubmission = async (req: Request, res: Response) => {
  try {
    const { submissionId } = req.params as { submissionId: string };
    const { rejectionReason } = req.body;

    const submission = await prisma.place_submission.findUnique({
      where: {
        id: submissionId,
      },
    });

    if (!submission) {
      return res.status(404).json({
        message: "Place submission not found",
      });
    }

    if (submission.status !== "PENDING") {
      return res.status(400).json({
        message: `Submission has already been ${submission.status.toLowerCase()}`,
      });
    }

    const rejectedSubmission = await prisma.place_submission.update({
      where: {
        id: submissionId,
      },
      data: {
        status: "REJECTED",
        ...(rejectionReason !== undefined ? { rejectionReason } : {}),
      },
    });

    return res.status(200).json({
      message: "Place submission rejected",
      submission: rejectedSubmission,
    });
  } catch (error) {
    console.error("Reject place submission error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};