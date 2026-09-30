import type { Request, Response } from "express";
import { ZodError } from "zod";
import prisma from "../../../../db/prisma.js";
import { guidePackageTableExists } from "../../../../services/guidePackageTable.js";
import {
  commonGuidePackageSchema,
  commonGuidePackageUpdateSchema,
} from "../../../../services/zod.js";

/**
 * The place fields a package exposes. Shared by the package reads and the
 * approval check so a place can never be accepted into a package with a
 * narrower set of fields than it is later read with.
 *
 * `district` comes along because a package is built from places that can sit in
 * different districts and both UIs show which district a place is in.
 */
const packagePlaceSelect = {
  id: true,
  name: true,
  images: true,
  category: true,
  district: { select: { id: true, name: true } },
} as const;

/**
 * The shape every package is read with, so the service profile manager and the
 * public place detail route see the same fields.
 */
const packageInclude = {
  places: {
    include: { place: { select: packagePlaceSelect } },
    orderBy: { place: { name: "asc" } },
  },
} as const;

type PackagePlace = {
  id: string;
  name: string;
  images: string[];
  category: string;
  district: { id: string; name: string } | null;
};

/**
 * Flattens the membership join into the `places` array the clients expect, so
 * no consumer has to know that a package's places are stored in a join table.
 */
const serialize = (pkg: {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  places: { place: PackagePlace }[];
}) => ({
  id: pkg.id,
  name: pkg.name,
  description: pkg.description,
  createdAt: pkg.createdAt,
  updatedAt: pkg.updatedAt,
  places: pkg.places.map((entry) => entry.place),
});

type ResolvedPlaces =
  | { ok: true; places: PackagePlace[] }
  | { ok: false; unavailable: string[] };

/**
 * Every place a package uses has to exist and be approved.
 *
 * Packages are only ever discovered through the places they contain (the public
 * place detail route carries them), so a package pointing at a pending or
 * missing place would be invisible or broken for customers while looking fine
 * in the manager. Rejecting it here is what keeps a package always bookable.
 *
 * The ids are also checked against the *session* guide, not the body: the guide
 * is never taken from the payload, so there is no id in the request that could
 * point a write at another guide's data.
 */
async function resolveApprovedPlaceIds(
  placeIds: string[]
): Promise<ResolvedPlaces> {
  const places = await prisma.place.findMany({
    where: {
      id: { in: placeIds },
      status: "APPROVED",
    },
    select: packagePlaceSelect,
  });

  if (places.length !== placeIds.length) {
    const found = new Set(places.map((place) => place.id));
    return {
      ok: false,
      unavailable: placeIds.filter((id) => !found.has(id)),
    };
  }

  // Keep the guide's own ordering (the order the picker sent) rather than
  // whatever order the database happened to return the rows in.
  const byId = new Map(places.map((place) => [place.id, place]));
  return { ok: true, places: placeIds.map((id) => byId.get(id)!) };
}

const tableMissing = (res: Response) =>
  res.status(503).json({
    message:
      "Tour packages are not available yet. Please run the latest database migration.",
  });

export const getPackages = async (req: Request, res: Response) => {
  try {
    const commonGuideId = req.common_guide;

    if (!commonGuideId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!(await guidePackageTableExists())) {
      return tableMissing(res);
    }

    const packages = await prisma.common_guide_package.findMany({
      where: { commonGuideId },
      include: packageInclude,
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(packages.map(serialize));
  } catch (error) {
    console.error("Get common guide packages error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

/**
 * Saving a package also adds its places to the guide's coverage in
 * `common_guide_places`, and that is a *union* — it only ever adds rows, it is
 * never recomputed. That is deliberate on both sides.
 *
 * On the way in, coverage is what the public guide list and the booking
 * validation read, so a package's places have to be in it for the package to be
 * bookable at all. `skipDuplicates` then makes a re-save a no-op rather than a
 * constraint error, because the (placeId, commonGuideId) unique index already
 * holds the guide's existing coverage.
 *
 * On the way out, removing rows would be wrong: a place covered by two packages
 * must stay covered when one is deleted, and a place covered by hand before
 * packages existed must not disappear because a package was edited. A guide's
 * coverage is therefore only ever narrowed by the places themselves going away,
 * which the admin place DELETE already guards.
 */
export const createPackage = async (req: Request, res: Response) => {
  try {
    const commonGuideId = req.common_guide;

    if (!commonGuideId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!(await guidePackageTableExists())) {
      return tableMissing(res);
    }

    const data = commonGuidePackageSchema.parse(req.body);
    const resolved = await resolveApprovedPlaceIds(data.placeIds);

    if (!resolved.ok) {
      return res.status(400).json({
        message: "One or more selected places are unavailable",
        unavailable: resolved.unavailable,
      });
    }

    const places = resolved.places;

    const created = await prisma.$transaction(async (tx) => {
      const pkg = await tx.common_guide_package.create({
        data: {
          commonGuideId,
          name: data.name,
          description: data.description ?? null,
        },
      });

      await tx.common_guide_package_places.createMany({
        data: places.map((place) => ({
          packageId: pkg.id,
          placeId: place.id,
        })),
      });

      await tx.common_guide_places.createMany({
        data: places.map((place) => ({ placeId: place.id, commonGuideId })),
        skipDuplicates: true,
      });

      return tx.common_guide_package.findUniqueOrThrow({
        where: { id: pkg.id },
        include: packageInclude,
      });
    });

    return res.status(201).json(serialize(created));
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    console.error("Create common guide package error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const updatePackage = async (req: Request, res: Response) => {
  try {
    const commonGuideId = req.common_guide;

    if (!commonGuideId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!(await guidePackageTableExists())) {
      return tableMissing(res);
    }

    const { packageId } = req.params as { packageId: string };
    const data = commonGuidePackageUpdateSchema.parse(req.body);

    // Scoped by `commonGuideId` in the lookup, so a package belonging to
    // another guide is simply not found — there is no path from this request to
    // someone else's package.
    const existing = await prisma.common_guide_package.findFirst({
      where: { id: packageId, commonGuideId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ message: "Package not found" });
    }

    const resolved = await resolveApprovedPlaceIds(data.placeIds);

    if (!resolved.ok) {
      return res.status(400).json({
        message: "One or more selected places are unavailable",
        unavailable: resolved.unavailable,
      });
    }

    const places = resolved.places;

    const updated = await prisma.$transaction(async (tx) => {
      await tx.common_guide_package.update({
        where: { id: packageId },
        data: {
          name: data.name,
          description: data.description ?? null,
        },
      });

      // Replace rather than diff: the saved package is exactly the submitted
      // list, so a place removed in the editor really leaves the package. The
      // join rows cascade with the package itself, so this is a plain delete of
      // the rows that are going away.
      await tx.common_guide_package_places.deleteMany({
        where: { packageId },
      });

      await tx.common_guide_package_places.createMany({
        data: places.map((place) => ({
          packageId,
          placeId: place.id,
        })),
      });

      // Coverage only grows, see the note on this handler.
      await tx.common_guide_places.createMany({
        data: places.map((place) => ({ placeId: place.id, commonGuideId })),
        skipDuplicates: true,
      });

      return tx.common_guide_package.findUniqueOrThrow({
        where: { id: packageId },
        include: packageInclude,
      });
    });

    return res.status(200).json(serialize(updated));
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    console.error("Update common guide package error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const deletePackage = async (req: Request, res: Response) => {
  try {
    const commonGuideId = req.common_guide;

    if (!commonGuideId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!(await guidePackageTableExists())) {
      return tableMissing(res);
    }

    const { packageId } = req.params as { packageId: string };

    const existing = await prisma.common_guide_package.findFirst({
      where: { id: packageId, commonGuideId },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ message: "Package not found" });
    }

    // `common_guide_package_places.packageId` cascades, so the membership rows
    // go with the package. Coverage in `common_guide_places` is intentionally
    // left alone.
    await prisma.common_guide_package.delete({ where: { id: packageId } });

    return res.status(200).json({ message: "Package deleted successfully" });
  } catch (error) {
    console.error("Delete common guide package error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};
