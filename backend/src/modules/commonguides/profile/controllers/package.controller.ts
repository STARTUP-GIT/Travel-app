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
  description: true,
  images: true,
  category: true,
  entryfee: true,
  district: { select: { id: true, name: true } },
  pricing: {
    select: {
      id: true,
      visitor: true,
      ageGroup: true,
      amount: true,
    },
  },
};

/**
 * The shape every package is read with, so the service profile manager and the
 * public place detail route see the same fields.
 */
const packageInclude = {
  places: {
    include: { place: { select: packagePlaceSelect } },
    orderBy: { place: { name: "asc" as const } },
  },
};

type PackagePlace = {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  category: string;
  entryfee: number | null;
  district: { id: string; name: string } | null;
  pricing: {
    id: string;
    visitor: "DOMESTIC" | "FOREIGN";
    ageGroup: string;
    amount: number;
  }[];
};

/**
 * Flattens the membership join into the `places` array the clients expect, so
 * no consumer has to know that a package's places are stored in a join table.
 */
const serialize = (pkg: any) => ({
  id: pkg.id,
  name: pkg.name,
  description: pkg.description,
  pricingMode: pkg.pricingMode ?? "WHOLE_TOUR",
  pricingUnit: pkg.pricingUnit ?? "PER_TOUR",
  price: pkg.price ?? 0,
  allowCustomerPlaceSelection: pkg.allowCustomerPlaceSelection ?? true,
  cancellationPolicy: pkg.cancellationPolicy ?? null,
  foodStatus: pkg.foodStatus ?? "EXCLUDED",
  foodDetails: pkg.foodDetails ?? null,
  transportStatus: pkg.transportStatus ?? "EXCLUDED",
  transportDetails: pkg.transportDetails ?? null,
  entryFeeStatus: pkg.entryFeeStatus ?? "EXCLUDED",
  entryFeeDetails: pkg.entryFeeDetails ?? null,
  additionalCostsDetails: pkg.additionalCostsDetails ?? null,
  tripStartTime: pkg.tripStartTime ?? null,
  pickupName: pkg.pickupName ?? null,
  pickupAddress: pkg.pickupAddress ?? null,
  pickupLat: pkg.pickupLat ?? null,
  pickupLng: pkg.pickupLng ?? null,
  pickupMapsUrl: pkg.pickupMapsUrl ?? null,
  createdAt: pkg.createdAt,
  updatedAt: pkg.updatedAt,
  places: (pkg.places ?? []).map((entry: any) => ({
    ...entry.place,
    price: entry.price ?? null,
  })),
});

type ResolvedPlaces =
  | { ok: true; places: PackagePlace[] }
  | { ok: false; unavailable: string[] };

/**
 * Every place a package uses has to exist, and be either approved or the
 * session guide's own awaiting approval.
 *
 * Approved places are the normal case, and a missing place is still rejected
 * outright: a package pointing at a place that does not exist would look fine in
 * the manager and be broken for customers.
 *
 * A place the guide submitted and that is still PENDING is allowed, and only for
 * the guide who submitted it. That is what lets a guide create a place from the
 * package form and put it in the package straight away instead of being blocked
 * until an admin acts. Ownership is read from the submission that created the
 * place rather than from the place row, so a pending place belonging to another
 * guide is still rejected — no guide can attach anyone else's unapproved place
 * to their package. The package itself stays invisible to customers until the
 * place is approved, because packages are discovered through the public place
 * routes, which filter on APPROVED.
 *
 * The ids are also checked against the *session* guide, not the body: the guide
 * is never taken from the payload, so there is no id in the request that could
 * point a write at another guide's data.
 */
async function resolveApprovedPlaceIds(
  placeIds: string[],
  commonGuideId: string
): Promise<ResolvedPlaces> {
  const places = await prisma.place.findMany({
    where: {
      id: { in: placeIds },
      OR: [
        { status: "APPROVED" },
        { placeSubmissions: { some: { commonGuideId } } },
      ],
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
  const byId = new Map<string, PackagePlace>(
    places.map((place) => [place.id, place as PackagePlace])
  );
  return { ok: true, places: placeIds.map((id) => byId.get(id)!) };
}

/**
 * The tour package tables are missing, which is a deployment fault rather than
 * anything the guide did.
 *
 * The cause is logged, not returned: "run the latest database migration" is an
 * instruction for whoever deploys the backend, and a guide reading it on their
 * packages screen learns nothing they can act on.
 */
const tableMissing = (res: Response) => {
  console.error(
    "Tour package tables are missing from the database this API is connected to."
  );

  return res.status(503).json({
    message:
      "Tour packages are not available right now. Please try again later.",
  });
};

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
    const resolved = await resolveApprovedPlaceIds(data.placeIds, commonGuideId);

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
          pricingMode: data.pricingMode ?? "WHOLE_TOUR",
          pricingUnit: data.pricingUnit ?? "PER_TOUR",
          price: data.price ?? 0,
          allowCustomerPlaceSelection: data.allowCustomerPlaceSelection ?? true,
          cancellationPolicy: data.cancellationPolicy ?? null,
          foodStatus: data.foodStatus ?? "EXCLUDED",
          foodDetails: data.foodDetails ?? null,
          transportStatus: data.transportStatus ?? "EXCLUDED",
          transportDetails: data.transportDetails ?? null,
          entryFeeStatus: data.entryFeeStatus ?? "EXCLUDED",
          entryFeeDetails: data.entryFeeDetails ?? null,
          additionalCostsDetails: data.additionalCostsDetails ?? null,
          tripStartTime: data.tripStartTime ?? null,
          pickupName: data.pickupName ?? null,
          pickupAddress: data.pickupAddress ?? null,
          pickupLat: data.pickupLat ?? null,
          pickupLng: data.pickupLng ?? null,
          pickupMapsUrl: data.pickupMapsUrl ?? null,
        },
      });

      await tx.common_guide_package_places.createMany({
        data: places.map((place) => ({
          packageId: pkg.id,
          placeId: place.id,
          price: data.placePrices?.[place.id] ?? null,
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

    const resolved = await resolveApprovedPlaceIds(data.placeIds, commonGuideId);

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
          pricingMode: data.pricingMode ?? "WHOLE_TOUR",
          pricingUnit: data.pricingUnit ?? "PER_TOUR",
          price: data.price ?? 0,
          allowCustomerPlaceSelection: data.allowCustomerPlaceSelection ?? true,
          cancellationPolicy: data.cancellationPolicy ?? null,
          foodStatus: data.foodStatus ?? "EXCLUDED",
          foodDetails: data.foodDetails ?? null,
          transportStatus: data.transportStatus ?? "EXCLUDED",
          transportDetails: data.transportDetails ?? null,
          entryFeeStatus: data.entryFeeStatus ?? "EXCLUDED",
          entryFeeDetails: data.entryFeeDetails ?? null,
          additionalCostsDetails: data.additionalCostsDetails ?? null,
          tripStartTime: data.tripStartTime ?? null,
          pickupName: data.pickupName ?? null,
          pickupAddress: data.pickupAddress ?? null,
          pickupLat: data.pickupLat ?? null,
          pickupLng: data.pickupLng ?? null,
          pickupMapsUrl: data.pickupMapsUrl ?? null,
        },
      });

      await tx.common_guide_package_places.deleteMany({
        where: { packageId },
      });

      await tx.common_guide_package_places.createMany({
        data: places.map((place) => ({
          packageId,
          placeId: place.id,
          price: data.placePrices?.[place.id] ?? null,
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
