import type { Request, Response } from "express";
import prisma from "../../../db/prisma.js";
import { getAutoApprovalSettings } from "../../../services/approvalSettings.js";
import { guideStatusColumnExists } from "../../../services/guideStatusColumn.js";
import { guidePackageTableExists } from "../../../services/guidePackageTable.js";

/**
 * Whether a submitted place should be created as an approved `place` straight
 * away, or held as a PENDING `place_submission` for the admin queue.
 *
 * Two switches, both honoured: the global `placesAutoApproval` flag the admin
 * panel toggles, and the per-district `autoApprovePlaces` flag that already
 * existed on the Districts page. Either one being on approves immediately, so
 * the existing per-district behaviour is preserved rather than replaced.
 */
async function shouldAutoApprovePlaces(districtAutoApproves: boolean): Promise<boolean> {
  try {
    const settings = await getAutoApprovalSettings();
    return settings.placesAutoApproval || districtAutoApproves;
  } catch (error) {
    console.error("Read places auto-approval setting failed:", error);
    return districtAutoApproves;
  }
}

export const getPlacesByDistrict = async (req: Request, res: Response) => {
  try {
    const { districtId } = req.params as { districtId: string };

    const places = await prisma.place.findMany({
      where: {
        districtId,
        status: "APPROVED",
        district: {
          isServiceAvailable: true,
          state: { isServiceAvailable: true },
        },
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
        status: "APPROVED",
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

/**
 * `specific_guide.status` / `common_guide.status` are added by the
 * auto-approval migration. Prisma selects every scalar of a related model, so
 * including `specificguide` asks for a column that does not exist until that
 * migration is deployed — and the database rejects the *whole* query. Because
 * this endpoint is the place detail route, that turned a missing guide column
 * into a 500 on the place page, and because the customer guide list is
 * aggregated from these place responses it also emptied the guides page.
 *
 * The place is always served; guides are narrowed by approval only once the
 * column is actually present, so an unapproved guide can never be published
 * through this path either way.
 *
 * The same applies one level deeper to tour packages: including
 * `commonGuidePackages` reads `common_guide_package`, so it is only asked for
 * once the table has actually been created *and* the status column is there to
 * filter on. Packages ride along with the place rather than getting their own
 * public route, which is what lets the customer package list be aggregated from
 * these same responses.
 */
export const getPlaceById = async (req: Request, res: Response) => {
  try {
    const { placeId } = req.params as { placeId: string };

    const hasGuideStatus = await guideStatusColumnExists();
    const hasPackages =
      hasGuideStatus && (await guidePackageTableExists());

    const place = await prisma.place.findUnique({
      where: {
        id: placeId,
      },

      include: {
        // Only asked for when the column is really there; see above.
        ...(hasGuideStatus
          ? {
              specificguide: true,
              commonGuidePlaces: {
                include: {
                  commonGuide: true,
                },
              },
            }
          : {}),

        ...(hasPackages
          ? {
              commonGuidePackages: {
                include: {
                  package: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      createdAt: true,
                      updatedAt: true,
                      // The real number of places in the package, which a
                      // package spanning several districts cannot be read off a
                      // single place response. Without it a customer would be
                      // shown a price based on only the places of the district
                      // they happen to be browsing.
                      _count: { select: { places: true } },
                      // Read only to decide approval below; stripped from the
                      // response so the client sees the same package shape as
                      // the service profile API.
                      commonGuide: { select: { id: true, status: true } },
                    },
                  },
                },
              },
            }
          : {}),

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

    if (!place || place.status !== "APPROVED") {
      return res.status(404).json({
        message: "Place not found",
      });
    }

    // Prisma cannot filter a relation inside `include`, so the guides that
    // belong to this place are narrowed here. A guide still awaiting admin
    // approval must not be offered on the place page alongside approved ones.
    // The response keeps the same shape either way, so the existing client
    // keeps working.
    //
    // Read through an explicit type rather than the inferred one: the `include`
    // above is conditional, so Prisma's return type is the shape *without* the
    // guide relations and they are not on it. `unknown` is stepped through
    // because intersecting with the inferred type collapses back to that same
    // relation-less shape, which is what dropped `commonGuide` before.
    const relations = place as unknown as {
      specificguide?: { status?: string | null }[];
      commonGuidePlaces?: { commonGuide?: { status?: string | null } | null }[];
      commonGuidePackages?: {
        package: {
          id: string;
          name: string;
          description: string | null;
          createdAt: Date;
          updatedAt: Date;
          _count: { places: number };
          commonGuide: { id: string; status?: string | null } | null;
        } | null;
      }[];
    };

    const specificguide = hasGuideStatus
      ? (relations.specificguide ?? []).filter((guide) => guide?.status === "APPROVED")
      : [];
    const commonGuidePlaces = hasGuideStatus
      ? (relations.commonGuidePlaces ?? []).filter(
          (entry) => entry.commonGuide?.status === "APPROVED"
        )
      : [];

    // A package is published by exactly the same rule as the guide it belongs
    // to: it appears only while that guide is approved. The place link row
    // carries no guide of its own, so the owning guide is read through the
    // package and then dropped again.
    //
    // `commonGuideId` rides along so the customer side can group packages under
    // the guide without a second lookup, and the membership row count is
    // flattened to a plain `placeCount`.
    const commonGuidePackages = hasPackages
      ? (relations.commonGuidePackages ?? [])
          .filter((entry) => entry.package?.commonGuide?.status === "APPROVED")
          .map((entry) => {
            const { commonGuide, _count, ...pkg } = entry.package!;
            return {
              ...pkg,
              commonGuideId: commonGuide!.id,
              placeCount: _count.places,
            };
          })
      : [];

    return res.status(200).json({
      ...place,
      specificguide,
      commonGuidePlaces,
      commonGuidePackages,
    });
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
      (entryfee !== undefined && entryfee !== null && (typeof entryfee !== "number" || !Number.isFinite(entryfee) || entryfee < 0)) ||
      typeof category !== "string" ||
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
      entryfee: typeof entryfee === "number" ? entryfee : null,
      category,
      latitude,
      longitude,
      ...(req.specific_guide ? { specificGuideId: req.specific_guide } : {}),
      ...(req.common_guide ? { commonGuideId: req.common_guide } : {}),
    };

    if (await shouldAutoApprovePlaces(district.autoApprovePlaces)) {
      const result = await prisma.$transaction(async (tx) => {
        const newPlace = await tx.place.create({
          data: {
            name,
            description,
            districtId,
            images,
            entryfee: typeof entryfee === "number" ? entryfee : null,
            category,
            latitude,
            longitude,
            // The place schema defaults to PENDING, so it has to be marked
            // APPROVED explicitly here. Without it an "auto-approved" place
            // stayed invisible to travellers, because every public place query
            // filters on status APPROVED.
            status: "APPROVED",
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
      if (entryfee !== null && (typeof entryfee !== "number" || !Number.isFinite(entryfee) || entryfee < 0)) {
        return res.status(400).json({
          message: "entryfee must be a non-negative number or null",
        });
      }
      data.entryfee = entryfee;
    }

    if (category !== undefined) {
      if (typeof category !== "string") {
        return res.status(400).json({
          message: "category must be a string",
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
      entryfee: data.entryfee !== undefined ? data.entryfee as number | null : place.entryfee,
      category: (data.category as string) ?? place.category,
      latitude: (data.latitude as number) ?? place.latitude,
      longitude: (data.longitude as number) ?? place.longitude,
    };

    if (await shouldAutoApprovePlaces(place.district.autoApprovePlaces)) {
      const result = await prisma.$transaction(async (tx) => {
        const updatedPlace = await tx.place.update({
          where: {
            id: placeId,
          },
          data: { ...data, status: "APPROVED" },
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
        status: "APPROVED",
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
            status: "APPROVED",
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
          status: "APPROVED",
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

    if (submission.placeId) {
      await prisma.place.update({
        where: { id: submission.placeId },
        data: { status: "REJECTED" },
      });
    }

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