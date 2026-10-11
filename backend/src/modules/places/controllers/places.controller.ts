import type { Request, Response } from "express";
import crypto from "crypto";
import type { Prisma } from "../../../generated/client/client.js";
import prisma from "../../../db/prisma.js";
import { getAutoApprovalSettings } from "../../../services/approvalSettings.js";
import { guideStatusColumnExists } from "../../../services/guideStatusColumn.js";
import { guidePackageTableExists } from "../../../services/guidePackageTable.js";
import { profileSaveFailed } from "../../../services/userFacingError.js";
import type { PlacePricingInput } from "../../../services/placePricing.js";
import {
  applySubmittedPricing,
  parsePlacePricing,
  placePricingInclude,
  pricingFromBody,
  replacePlacePricing,
} from "../../../services/placePricing.js";

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

function parseCategories(body: any): { categories: string[]; primaryCategory: string } | { error: string } {
  let categories: string[] = [];
  if (Array.isArray(body.categories)) {
    categories = Array.from(
      new Set(
        body.categories
          .map((c: any) => (typeof c === "string" ? c.trim() : ""))
          .filter(Boolean)
      )
    );
  } else if (typeof body.category === "string" && body.category.trim()) {
    categories = [body.category.trim()];
  }

  if (categories.length === 0 || !categories[0]) {
    return { error: "At least one category is required" };
  }
  return { categories, primaryCategory: categories[0] };
}

function parseFeeFields(body: any): {
  entryFeeType: string;
  entryfee: number | null;
  childEntryFee: number | null;
  childMaxAge: number;
  entryFeeConditions: string | null;
  hasForeignPricing: boolean;
  foreignEntryFeeType: string | null;
  foreignAdultFee: number | null;
  foreignChildFee: number | null;
  foreignChildMaxAge: number;
  foreignEntryFeeConditions: string | null;
  pricingRows: PlacePricingInput[];
} | { error: string } {
  const rawType = typeof body.entryFeeType === "string" ? body.entryFeeType.toUpperCase() : undefined;
  let entryFeeType = "FREE";
  if (rawType === "PAID" || rawType === "FREE" || rawType === "UNKNOWN") {
    entryFeeType = rawType;
  } else if (body.entryfee !== undefined && body.entryfee !== null && body.entryfee !== "") {
    entryFeeType = "PAID";
  }

  let entryfee: number | null = null;
  let childEntryFee: number | null = null;
  let childMaxAge = 12;
  const entryFeeConditions = typeof body.entryFeeConditions === "string" && body.entryFeeConditions.trim() ? body.entryFeeConditions.trim() : null;

  if (entryFeeType === "PAID") {
    if (body.entryfee !== undefined && body.entryfee !== null && body.entryfee !== "") {
      const num = Number(body.entryfee);
      if (!Number.isFinite(num) || num < 0) {
        return { error: "Adult entry fee must be a valid non-negative number" };
      }
      entryfee = num;
    } else {
      return { error: "Adult entry fee is required for paid entry" };
    }

    if (body.childEntryFee !== undefined && body.childEntryFee !== null && body.childEntryFee !== "") {
      const childNum = Number(body.childEntryFee);
      if (!Number.isFinite(childNum) || childNum < 0) {
        return { error: "Child entry fee must be a valid non-negative number" };
      }
      childEntryFee = childNum;
    }
  } else if (entryFeeType === "FREE") {
    entryfee = 0;
    childEntryFee = 0;
  } else if (entryFeeType === "UNKNOWN") {
    entryfee = null;
    childEntryFee = null;
  }

  if (body.childMaxAge !== undefined && body.childMaxAge !== null && body.childMaxAge !== "") {
    const age = parseInt(String(body.childMaxAge), 10);
    if (!Number.isFinite(age) || age < 0 || age > 12) {
      return { error: "Maximum child age must be between 0 and 12 years" };
    }
    childMaxAge = age;
  }

  const hasForeignPricing = Boolean(body.hasForeignPricing);
  let foreignEntryFeeType: string | null = null;
  let foreignAdultFee: number | null = null;
  let foreignChildFee: number | null = null;
  let foreignChildMaxAge = 12;
  const foreignEntryFeeConditions = typeof body.foreignEntryFeeConditions === "string" && body.foreignEntryFeeConditions.trim() ? body.foreignEntryFeeConditions.trim() : null;

  if (hasForeignPricing) {
    const rawFType = typeof body.foreignEntryFeeType === "string" ? body.foreignEntryFeeType.toUpperCase() : undefined;
    foreignEntryFeeType = rawFType === "PAID" || rawFType === "FREE" || rawFType === "UNKNOWN" ? rawFType : "PAID";

    if (foreignEntryFeeType === "PAID") {
      if (body.foreignAdultFee !== undefined && body.foreignAdultFee !== null && body.foreignAdultFee !== "") {
        const fNum = Number(body.foreignAdultFee);
        if (!Number.isFinite(fNum) || fNum < 0) {
          return { error: "Foreign adult entry fee must be a valid non-negative number" };
        }
        foreignAdultFee = fNum;
      } else {
        return { error: "Foreign adult fee is required when separate foreign pricing is enabled and paid" };
      }

      if (body.foreignChildFee !== undefined && body.foreignChildFee !== null && body.foreignChildFee !== "") {
        const fcNum = Number(body.foreignChildFee);
        if (!Number.isFinite(fcNum) || fcNum < 0) {
          return { error: "Foreign child entry fee must be a valid non-negative number" };
        }
        foreignChildFee = fcNum;
      }
    } else if (foreignEntryFeeType === "FREE") {
      foreignAdultFee = 0;
      foreignChildFee = 0;
    } else if (foreignEntryFeeType === "UNKNOWN") {
      foreignAdultFee = null;
      foreignChildFee = null;
    }

    if (body.foreignChildMaxAge !== undefined && body.foreignChildMaxAge !== null && body.foreignChildMaxAge !== "") {
      const fAge = parseInt(String(body.foreignChildMaxAge), 10);
      if (!Number.isFinite(fAge) || fAge < 0 || fAge > 12) {
        return { error: "Foreign maximum child age must be between 0 and 12 years" };
      }
      foreignChildMaxAge = fAge;
    }
  } else {
    if (body.foreignAdultFee !== undefined && body.foreignAdultFee !== null && body.foreignAdultFee !== "") {
      const num = Number(body.foreignAdultFee);
      if (Number.isFinite(num) && num >= 0) foreignAdultFee = num;
    }
    if (body.foreignChildFee !== undefined && body.foreignChildFee !== null && body.foreignChildFee !== "") {
      const num = Number(body.foreignChildFee);
      if (Number.isFinite(num) && num >= 0) foreignChildFee = num;
    }
    if (body.foreignEntryFeeType) foreignEntryFeeType = String(body.foreignEntryFeeType);
  }

  const pricingRows: PlacePricingInput[] = [];
  if (entryFeeType === "PAID" && entryfee !== null) {
    pricingRows.push({ visitor: "DOMESTIC", ageGroup: "Adult", amount: entryfee });
    if (childEntryFee !== null) {
      pricingRows.push({ visitor: "DOMESTIC", ageGroup: "Child", amount: childEntryFee });
    }
  } else if (entryFeeType === "FREE") {
    pricingRows.push({ visitor: "DOMESTIC", ageGroup: "Adult", amount: 0 });
    pricingRows.push({ visitor: "DOMESTIC", ageGroup: "Child", amount: 0 });
  }

  if (hasForeignPricing) {
    if (foreignEntryFeeType === "PAID" && foreignAdultFee !== null) {
      pricingRows.push({ visitor: "FOREIGN", ageGroup: "Adult", amount: foreignAdultFee });
      if (foreignChildFee !== null) {
        pricingRows.push({ visitor: "FOREIGN", ageGroup: "Child", amount: foreignChildFee });
      }
    } else if (foreignEntryFeeType === "FREE") {
      pricingRows.push({ visitor: "FOREIGN", ageGroup: "Adult", amount: 0 });
      pricingRows.push({ visitor: "FOREIGN", ageGroup: "Child", amount: 0 });
    }
  }

  return {
    entryFeeType,
    entryfee,
    childEntryFee,
    childMaxAge,
    entryFeeConditions,
    hasForeignPricing,
    foreignEntryFeeType,
    foreignAdultFee,
    foreignChildFee,
    foreignChildMaxAge,
    foreignEntryFeeConditions,
    pricingRows,
  };
}

function parseAdditionalFees(body: any): {
  hasAdditionalFees: boolean;
  additionalFees: any;
} | { error: string } {
  const hasAdditionalFees = Boolean(body.hasAdditionalFees);
  if (!hasAdditionalFees) {
    return {
      hasAdditionalFees: false,
      additionalFees: null,
    };
  }

  if (!Array.isArray(body.additionalFees)) {
    return {
      hasAdditionalFees: true,
      additionalFees: [],
    };
  }

  const cleanedFees = [];
  for (const fee of body.additionalFees) {
    if (!fee || typeof fee !== "object") continue;
    const category = typeof fee.category === "string" ? fee.category.trim() : "OTHER";
    const name = typeof fee.name === "string" ? fee.name.trim() : "";
    if (category === "OTHER" && !name) {
      return { error: "Custom fee name is required when 'Other' category is selected." };
    }
    const displayName = name || category;
    const status = ["PAID", "FREE", "UNKNOWN"].includes(fee.status) ? fee.status : "PAID";
    let amount: number | null = null;
    if (status === "PAID") {
      const num = Number(fee.amount);
      if (!Number.isFinite(num) || num < 0) {
        return { error: `Amount for ${displayName} must be a valid non-negative number.` };
      }
      amount = num;
    } else if (status === "FREE") {
      amount = 0;
    } else {
      amount = null;
    }
    const visitor = ["ALL", "DOMESTIC", "FOREIGN"].includes(fee.visitor) ? fee.visitor : "ALL";
    const conditions = typeof fee.conditions === "string" && fee.conditions.trim() ? fee.conditions.trim() : null;

    cleanedFees.push({
      id: typeof fee.id === "string" && fee.id ? fee.id : crypto.randomUUID(),
      category,
      name: displayName,
      amount,
      status,
      visitor,
      conditions,
    });
  }

  return {
    hasAdditionalFees: true,
    additionalFees: cleanedFees,
  };
}

function parseAddressAndLocation(body: any): {
  addressLine: string | null;
  locality: string | null;
  pincode: string | null;
  mapsUrl: string | null;
  latitude: number;
  longitude: number;
} | { error: string } {
  const addressLine = typeof body.addressLine === "string" && body.addressLine.trim() ? body.addressLine.trim() : null;
  const locality = typeof body.locality === "string" && body.locality.trim() ? body.locality.trim() : null;
  const pincode = typeof body.pincode === "string" && body.pincode.trim() ? body.pincode.trim() : null;
  const mapsUrl = typeof body.mapsUrl === "string" && body.mapsUrl.trim() ? body.mapsUrl.trim() : null;

  if (mapsUrl) {
    try {
      const parsed = new URL(mapsUrl);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return { error: "Google Maps link must be a valid URL" };
      }
    } catch {
      return { error: "Invalid Google Maps link format" };
    }
  }

  let latitude = 0;
  let longitude = 0;
  if (typeof body.latitude === "number" && Number.isFinite(body.latitude)) {
    latitude = body.latitude;
  }
  if (typeof body.longitude === "number" && Number.isFinite(body.longitude)) {
    longitude = body.longitude;
  }

  return { addressLine, locality, pincode, mapsUrl, latitude, longitude };
}

async function validateStateAndDistrict(districtId: string, stateId?: string): Promise<
  | { ok: true; district: any }
  | { ok: false; status: number; message: string }
> {
  const district = await prisma.district.findUnique({
    where: { id: districtId },
    include: {
      state: {
        include: { country: true },
      },
    },
  });

  if (!district) {
    return { ok: false, status: 404, message: "District not found" };
  }

  if (stateId && district.stateId !== stateId) {
    return {
      ok: false,
      status: 400,
      message: "The selected district does not belong to the selected state",
    };
  }

  if (
    !district.isServiceAvailable ||
    !district.state.isServiceAvailable ||
    (district.state.country && !district.state.country.isServiceAvailable)
  ) {
    return {
      ok: false,
      status: 400,
      message: "Places cannot be added in disabled states or districts",
    };
  }

  return { ok: true, district };
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
        // Bands travel with the place so the customer list, the place page, the
        // guide's package form and the admin screens all read one source.
        ...placePricingInclude,
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
      stateId,
      images,
    } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Place name is required" });
    }
    if (typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ message: "Place description is required" });
    }
    if (typeof districtId !== "string" || !districtId.trim()) {
      return res.status(400).json({ message: "District ID is required" });
    }
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ message: "At least one image is required" });
    }

    const locValidation = await validateStateAndDistrict(districtId, stateId);
    if (!locValidation.ok) {
      return res.status(locValidation.status).json({ message: locValidation.message });
    }

    const catResult = parseCategories(req.body);
    if ("error" in catResult) {
      return res.status(400).json({ message: catResult.error });
    }

    const feeResult = parseFeeFields(req.body);
    if ("error" in feeResult) {
      return res.status(400).json({ message: feeResult.error });
    }

    const addFeeResult = parseAdditionalFees(req.body);
    if ("error" in addFeeResult) {
      return res.status(400).json({ message: addFeeResult.error });
    }

    const addrResult = parseAddressAndLocation(req.body);
    if ("error" in addrResult) {
      return res.status(400).json({ message: addrResult.error });
    }

    const pricing = parsePlacePricing(pricingFromBody(req.body));
    const finalPricingRows = pricing.ok && pricing.rows.length > 0 ? pricing.rows : feeResult.pricingRows;

    const newPlace = await prisma.$transaction(async (tx) => {
      const created = await tx.place.create({
        data: {
          name: name.trim(),
          description: description.trim(),
          districtId,
          images,
          entryfee: feeResult.entryfee,
          category: catResult.primaryCategory,
          categories: catResult.categories,
          entryFeeType: feeResult.entryFeeType,
          childEntryFee: feeResult.childEntryFee,
          childMaxAge: feeResult.childMaxAge,
          entryFeeConditions: feeResult.entryFeeConditions,
          hasForeignPricing: feeResult.hasForeignPricing,
          foreignEntryFeeType: feeResult.foreignEntryFeeType,
          foreignAdultFee: feeResult.foreignAdultFee,
          foreignChildFee: feeResult.foreignChildFee,
          foreignChildMaxAge: feeResult.foreignChildMaxAge,
          foreignEntryFeeConditions: feeResult.foreignEntryFeeConditions,
          hasAdditionalFees: addFeeResult.hasAdditionalFees,
          additionalFees: addFeeResult.additionalFees as unknown as Prisma.InputJsonValue,
          addressLine: addrResult.addressLine,
          locality: addrResult.locality,
          pincode: addrResult.pincode,
          mapsUrl: addrResult.mapsUrl,
          latitude: addrResult.latitude,
          longitude: addrResult.longitude,
          status: "APPROVED",
        },
      });

      await replacePlacePricing(tx, created.id, finalPricingRows);

      return tx.place.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          district: {
            include: {
              state: {
                include: { country: true },
              },
            },
          },
          ...placePricingInclude,
        },
      });
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
/**
 * The places a signed-in guide may view and manage across districts, or filtered by district.
 */
export const getManageablePlaces = async (req: Request, res: Response) => {
  try {
    const guideId = req.common_guide ?? req.specific_guide;

    if (!guideId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const isCommonGuide = Boolean(req.common_guide);
    const districtId = req.query.districtId as string | undefined;

    const places = await prisma.place.findMany({
      where: {
        ...(districtId ? { districtId } : {}),
        OR: [
          { status: "APPROVED" },
          isCommonGuide
            ? { placeSubmissions: { some: { commonGuideId: guideId } } }
            : { specificguide: { some: { id: guideId } } },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        images: true,
        category: true,
        categories: true,
        entryfee: true,
        entryFeeType: true,
        childEntryFee: true,
        childMaxAge: true,
        entryFeeConditions: true,
        hasAdditionalFees: true,
        additionalFees: true,
        hasForeignPricing: true,
        foreignEntryFeeType: true,
        foreignAdultFee: true,
        foreignChildFee: true,
        foreignChildMaxAge: true,
        foreignEntryFeeConditions: true,
        addressLine: true,
        locality: true,
        pincode: true,
        mapsUrl: true,
        latitude: true,
        longitude: true,
        status: true,
        districtId: true,
        district: {
          select: {
            id: true,
            name: true,
            stateId: true,
            state: { select: { id: true, name: true, isServiceAvailable: true } },
          },
        },
        ...placePricingInclude,
      },
      orderBy: { name: "asc" },
    });

    return res.status(200).json(places);
  } catch (error) {
    console.error("Get manageable places error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

/**
 * The places a signed-in guide may put in a tour package, for one district.
 *
 * A guide needs the district's approved places, which is what the public
 * district list returns, *and* their own places that are still awaiting review,
 * because a guide is allowed to build a package from a place they just created.
 * Mixing the two here rather than in the client is what keeps the two rules in
 * one place: approved places are offered to any guide, an unapproved place only
 * ever to the guide who submitted it.
 *
 * `status` rides along so the picker can label an unapproved place instead of
 * silently presenting it as live. This route is guide-authenticated; the public
 * district list above is unchanged and still serves approved places only.
 */
export const getManageablePlacesByDistrict = async (req: Request, res: Response) => {
  try {
    const { districtId } = req.params as { districtId: string };
    const guideId = req.common_guide ?? req.specific_guide;

    if (!guideId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const isCommonGuide = Boolean(req.common_guide);

    const places = await prisma.place.findMany({
      where: {
        districtId,
        OR: [
          { status: "APPROVED" },
          // The submission that created the place is what ties it to the guide,
          // so a place awaiting review is only ever visible to its own author.
          isCommonGuide
            ? { placeSubmissions: { some: { commonGuideId: guideId } } }
            : { specificguide: { some: { id: guideId } } },
        ],
      },
      select: {
        id: true,
        name: true,
        description: true,
        images: true,
        category: true,
        categories: true,
        entryfee: true,
        entryFeeType: true,
        childEntryFee: true,
        childMaxAge: true,
        entryFeeConditions: true,
        hasAdditionalFees: true,
        additionalFees: true,
        hasForeignPricing: true,
        foreignEntryFeeType: true,
        foreignAdultFee: true,
        foreignChildFee: true,
        foreignChildMaxAge: true,
        foreignEntryFeeConditions: true,
        addressLine: true,
        locality: true,
        pincode: true,
        mapsUrl: true,
        latitude: true,
        longitude: true,
        status: true,
        districtId: true,
        district: {
          select: {
            id: true,
            name: true,
            stateId: true,
            state: { select: { id: true, name: true, isServiceAvailable: true } },
          },
        },
        ...placePricingInclude,
      },
      orderBy: { name: "asc" },
    });

    return res.status(200).json(places);
  } catch (error) {
    console.error("Get manageable places by district error:", error);

    return res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

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
                  /*
                   * An explicit list rather than `commonGuide: true`.
                   *
                   * This is a public route, and `true` returns every scalar of
                   * the guide — including the password hash. The fields below are
                   * the ones the customer guide surfaces actually read, plus
                   * `agencyName` so a package and its guide can be attributed to
                   * the agency rather than to an individual. Adding a column to
                   * `common_guide` therefore cannot accidentally start leaking it
                   * here, which is the whole reason the list is maintained
                   * instead of spread-open.
                   */
                  commonGuide: {
                    select: {
                      id: true,
                      full_name: true,
                      username: true,
                      email: true,
                      phonenumber: true,
                      profile_pic: true,
                      tagline: true,
                      agencyName: true,
                      agencyAddress: true,
                      agencyBanner: true,
                      agencyMapsUrl: true,
                      rating: true,
                      review: true,
                      description: true,
                      experience: true,
                      cost: true,
                      language: true,
                      isReported: true,
                      status: true,
                      createdAt: true,
                    },
                  },
                },
              },
            }
          : {}),

        ...(hasPackages
          ? {
              commonGuidePackagePlaces: {
                include: {
                  package: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      duration: true,
                      maxGroupSize: true,
                      packageImages: true,
                      pricingMode: true,
                      pricingUnit: true,
                      price: true,
                      allowCustomerPlaceSelection: true,
                      cancellationPolicy: true,
                      foodStatus: true,
                      foodDetails: true,
                      mealsService: true,
                      includedMeals: true,
                      mealDetails: true,
                      transportStatus: true,
                      transportDetails: true,
                      transportService: true,
                      transportVehicles: true,
                      entryFeeStatus: true,
                      entryFeeDetails: true,
                      additionalCostsDetails: true,
                      hasSpecificGuide: true,
                      specificGuideId: true,
                      specificGuide: {
                        select: {
                          id: true,
                          full_name: true,
                          username: true,
                          profile_pic: true,
                          tagline: true,
                          rating: true,
                          experience: true,
                          cost: true,
                          language: true,
                          canPurchaseEntryTickets: true,
                          ticketPurchasingConditions: true,
                        },
                      },
                      childrenAllowed: true,
                      childMaxAge: true,
                      maxChildren: true,
                      childrenCountTowardCapacity: true,
                      childPrice: true,
                      childDiscountType: true,
                      childDiscountPercent: true,
                      childConditions: true,
                      tripStartTime: true,
                      pickupName: true,
                      pickupAddress: true,
                      pickupLat: true,
                      pickupLng: true,
                      pickupMapsUrl: true,
                      createdAt: true,
                      updatedAt: true,
                      places: {
                        include: {
                          place: {
                            select: {
                              id: true,
                              name: true,
                              description: true,
                              images: true,
                              category: true,
                              entryfee: true,
                              district: { select: { id: true, name: true } },
                            },
                          },
                        },
                        orderBy: { itineraryOrder: "asc" },
                      },
                      _count: { select: { places: true } },
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
        // The customer's place page prices from these rows, with `entryfee` as
        // the fallback for a place that has no bands.
        ...placePricingInclude,
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
      commonGuidePackagePlaces?: {
        package: {
          id: string;
          name: string;
          description: string | null;
          pricingMode?: string;
          pricingUnit?: string;
          price?: number;
          allowCustomerPlaceSelection?: boolean;
          cancellationPolicy?: string | null;
          foodStatus?: string;
          foodDetails?: string | null;
          transportStatus?: string;
          transportDetails?: string | null;
          entryFeeStatus?: string;
          entryFeeDetails?: string | null;
          additionalCostsDetails?: string | null;
          tripStartTime?: string | null;
          pickupName?: string | null;
          pickupAddress?: string | null;
          pickupLat?: number | null;
          pickupLng?: number | null;
          pickupMapsUrl?: string | null;
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
      ? (relations.commonGuidePackagePlaces ?? [])
          .filter((entry) => (entry as any).package?.commonGuide?.status === "APPROVED")
          .map((entry) => {
            const rawPkg = (entry as any).package;
            const { commonGuide, _count, places: rawPlaces, ...pkg } = rawPkg;
            return {
              ...pkg,
              commonGuideId: commonGuide?.id,
              placeCount: _count?.places ?? (rawPlaces?.length || 0),
              places: (rawPlaces ?? []).map((p: any) => ({
                ...(p.place || {}),
                price: p.price ?? null,
                itineraryOrder: p.itineraryOrder ?? 1,
                visitArrangement: p.visitArrangement ?? "GUIDED",
                expectedDuration: p.expectedDuration ?? null,
                entryFeeStatus: p.entryFeeStatus ?? "EXCLUDED",
                entryFeeAmount: p.entryFeeAmount ?? null,
              })),
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
      stateId,
      images,
    } = req.body;

    if (typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ message: "Place name is required" });
    }
    if (typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ message: "Place description is required" });
    }
    if (typeof districtId !== "string" || !districtId.trim()) {
      return res.status(400).json({ message: "District ID is required" });
    }
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ message: "At least one image is required" });
    }

    const locValidation = await validateStateAndDistrict(districtId, stateId);
    if (!locValidation.ok) {
      return res.status(locValidation.status).json({ message: locValidation.message });
    }
    const district = locValidation.district;

    const catResult = parseCategories(req.body);
    if ("error" in catResult) {
      return res.status(400).json({ message: catResult.error });
    }

    const feeResult = parseFeeFields(req.body);
    if ("error" in feeResult) {
      return res.status(400).json({ message: feeResult.error });
    }

    const addrResult = parseAddressAndLocation(req.body);
    if ("error" in addrResult) {
      return res.status(400).json({ message: addrResult.error });
    }

    const pricingSnapshot = pricingFromBody(req.body);
    let finalPricingRows: PlacePricingInput[] = [];
    if (pricingSnapshot !== undefined) {
      const parsed = parsePlacePricing(pricingSnapshot);
      if (!parsed.ok) return res.status(400).json({ message: parsed.message });
      finalPricingRows = parsed.rows;
    } else {
      finalPricingRows = feeResult.pricingRows;
    }

    const addFeeResult = parseAdditionalFees(req.body);
    if ("error" in addFeeResult) {
      return res.status(400).json({ message: addFeeResult.error });
    }

    const submissionData: Prisma.place_submissionUncheckedCreateInput = {
      name: name.trim(),
      description: description.trim(),
      districtId,
      images,
      entryfee: feeResult.entryfee,
      category: catResult.primaryCategory,
      categories: catResult.categories,
      entryFeeType: feeResult.entryFeeType,
      childEntryFee: feeResult.childEntryFee,
      childMaxAge: feeResult.childMaxAge,
      entryFeeConditions: feeResult.entryFeeConditions,
      hasForeignPricing: feeResult.hasForeignPricing,
      foreignEntryFeeType: feeResult.foreignEntryFeeType,
      foreignAdultFee: feeResult.foreignAdultFee,
      foreignChildFee: feeResult.foreignChildFee,
      foreignChildMaxAge: feeResult.foreignChildMaxAge,
      foreignEntryFeeConditions: feeResult.foreignEntryFeeConditions,
      hasAdditionalFees: addFeeResult.hasAdditionalFees,
      additionalFees: addFeeResult.additionalFees as unknown as Prisma.InputJsonValue,
      addressLine: addrResult.addressLine,
      locality: addrResult.locality,
      pincode: addrResult.pincode,
      mapsUrl: addrResult.mapsUrl,
      latitude: addrResult.latitude,
      longitude: addrResult.longitude,
      ...(finalPricingRows.length > 0
        ? { pricing: finalPricingRows as unknown as Prisma.InputJsonValue }
        : {}),
      ...(req.specific_guide ? { specificGuideId: req.specific_guide } : {}),
      ...(req.common_guide ? { commonGuideId: req.common_guide } : {}),
    };

    if (await shouldAutoApprovePlaces(district.autoApprovePlaces)) {
      const result = await prisma.$transaction(async (tx) => {
        const newPlace = await tx.place.create({
          data: {
            name: name.trim(),
            description: description.trim(),
            districtId,
            images,
            entryfee: feeResult.entryfee,
            category: catResult.primaryCategory,
            categories: catResult.categories,
            entryFeeType: feeResult.entryFeeType,
            childEntryFee: feeResult.childEntryFee,
            childMaxAge: feeResult.childMaxAge,
            entryFeeConditions: feeResult.entryFeeConditions,
            hasForeignPricing: feeResult.hasForeignPricing,
            foreignEntryFeeType: feeResult.foreignEntryFeeType,
            foreignAdultFee: feeResult.foreignAdultFee,
            foreignChildFee: feeResult.foreignChildFee,
            foreignChildMaxAge: feeResult.foreignChildMaxAge,
            foreignEntryFeeConditions: feeResult.foreignEntryFeeConditions,
            hasAdditionalFees: addFeeResult.hasAdditionalFees,
            additionalFees: addFeeResult.additionalFees as unknown as Prisma.InputJsonValue,
            addressLine: addrResult.addressLine,
            locality: addrResult.locality,
            pincode: addrResult.pincode,
            mapsUrl: addrResult.mapsUrl,
            latitude: addrResult.latitude,
            longitude: addrResult.longitude,
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

        await replacePlacePricing(tx, newPlace.id, finalPricingRows);

        return { newPlace, submission };
      });

      return res.status(201).json({
        message: "Place added and approved successfully",
        place: result.newPlace,
        submission: result.submission,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const pendingPlace = await tx.place.create({
        data: {
          name: name.trim(),
          description: description.trim(),
          districtId,
          images,
          entryfee: feeResult.entryfee,
          category: catResult.primaryCategory,
          categories: catResult.categories,
          entryFeeType: feeResult.entryFeeType,
          childEntryFee: feeResult.childEntryFee,
          childMaxAge: feeResult.childMaxAge,
          entryFeeConditions: feeResult.entryFeeConditions,
          hasForeignPricing: feeResult.hasForeignPricing,
          foreignEntryFeeType: feeResult.foreignEntryFeeType,
          foreignAdultFee: feeResult.foreignAdultFee,
          foreignChildFee: feeResult.foreignChildFee,
          foreignChildMaxAge: feeResult.foreignChildMaxAge,
          foreignEntryFeeConditions: feeResult.foreignEntryFeeConditions,
          hasAdditionalFees: addFeeResult.hasAdditionalFees,
          additionalFees: addFeeResult.additionalFees as unknown as Prisma.InputJsonValue,
          addressLine: addrResult.addressLine,
          locality: addrResult.locality,
          pincode: addrResult.pincode,
          mapsUrl: addrResult.mapsUrl,
          latitude: addrResult.latitude,
          longitude: addrResult.longitude,
          status: "PENDING",
        },
      });

      const submission = await tx.place_submission.create({
        data: {
          ...submissionData,
          placeId: pendingPlace.id,
          status: "PENDING",
        },
      });

      await replacePlacePricing(tx, pendingPlace.id, finalPricingRows);

      return { place: pendingPlace, submission };
    });

    return res.status(201).json({
      message: "Place submitted for approval",
      place: { ...result.place, status: "PENDING" },
      submission: result.submission,
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
      districtId,
      stateId,
      images,
    } = req.body;

    const place = await prisma.place.findUnique({
      where: {
        id: placeId,
      },
      include: {
        district: {
          include: { state: { include: { country: true } } },
        },
      },
    });

    if (!place) {
      return res.status(404).json({
        message: "Place not found",
      });
    }

    const guideId = req.common_guide ?? req.specific_guide;
    if (!guideId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const isCommonGuide = Boolean(req.common_guide);

    if (place.status !== "APPROVED") {
      const isAuthor = await prisma.place_submission.findFirst({
        where: {
          placeId: place.id,
          ...(isCommonGuide ? { commonGuideId: guideId } : { specificGuideId: guideId }),
        },
      });
      if (!isAuthor) {
        return res.status(403).json({
          message: "You do not have permission to edit this place",
        });
      }
    }

    if (districtId) {
      const locValidation = await validateStateAndDistrict(districtId, stateId);
      if (!locValidation.ok) {
        return res.status(locValidation.status).json({ message: locValidation.message });
      }
    }

    const pricingSnapshot = pricingFromBody(req.body);
    let pricingRows: PlacePricingInput[] | undefined = undefined;

    if (pricingSnapshot !== undefined) {
      const pricing = parsePlacePricing(pricingSnapshot);
      if (!pricing.ok) {
        return res.status(400).json({ message: pricing.message });
      }
      pricingRows = pricing.rows;
    }

    const data: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "name must be a non-empty string" });
      }
      data.name = name.trim();
    }

    if (description !== undefined) {
      if (typeof description !== "string" || !description.trim()) {
        return res.status(400).json({ message: "description must be a non-empty string" });
      }
      data.description = description.trim();
    }

    if (districtId !== undefined) {
      data.districtId = districtId;
    }

    if (images !== undefined) {
      if (!Array.isArray(images)) {
        return res.status(400).json({ message: "images must be an array" });
      }
      data.images = images;
    }

    if (req.body.category !== undefined || req.body.categories !== undefined) {
      const catResult = parseCategories(req.body);
      if ("error" in catResult) {
        return res.status(400).json({ message: catResult.error });
      }
      data.category = catResult.primaryCategory;
      data.categories = catResult.categories;
    }

    if (
      req.body.entryfee !== undefined ||
      req.body.entryFeeType !== undefined ||
      req.body.childEntryFee !== undefined ||
      req.body.childMaxAge !== undefined ||
      req.body.hasForeignPricing !== undefined
    ) {
      const feeResult = parseFeeFields({
        ...place,
        ...req.body,
      });
      if ("error" in feeResult) {
        return res.status(400).json({ message: feeResult.error });
      }
      data.entryfee = feeResult.entryfee;
      data.entryFeeType = feeResult.entryFeeType;
      data.childEntryFee = feeResult.childEntryFee;
      data.childMaxAge = feeResult.childMaxAge;
      data.entryFeeConditions = feeResult.entryFeeConditions;
      data.hasForeignPricing = feeResult.hasForeignPricing;
      data.foreignEntryFeeType = feeResult.foreignEntryFeeType;
      data.foreignAdultFee = feeResult.foreignAdultFee;
      data.foreignChildFee = feeResult.foreignChildFee;
      data.foreignChildMaxAge = feeResult.foreignChildMaxAge;
      data.foreignEntryFeeConditions = feeResult.foreignEntryFeeConditions;
      if (pricingRows === undefined) {
        pricingRows = feeResult.pricingRows;
      }
    }

    if (
      req.body.addressLine !== undefined ||
      req.body.locality !== undefined ||
      req.body.pincode !== undefined ||
      req.body.mapsUrl !== undefined ||
      req.body.latitude !== undefined ||
      req.body.longitude !== undefined
    ) {
      const addrResult = parseAddressAndLocation({
        ...place,
        ...req.body,
      });
      if ("error" in addrResult) {
        return res.status(400).json({ message: addrResult.error });
      }
      data.addressLine = addrResult.addressLine;
      data.locality = addrResult.locality;
      data.pincode = addrResult.pincode;
      data.mapsUrl = addrResult.mapsUrl;
      data.latitude = addrResult.latitude;
      data.longitude = addrResult.longitude;
    }

    if (req.body.hasAdditionalFees !== undefined || req.body.additionalFees !== undefined) {
      const addFeeResult = parseAdditionalFees(req.body);
      if ("error" in addFeeResult) {
        return res.status(400).json({ message: addFeeResult.error });
      }
      data.hasAdditionalFees = addFeeResult.hasAdditionalFees;
      data.additionalFees = addFeeResult.additionalFees as unknown as Prisma.InputJsonValue;
    }

    if (Object.keys(data).length === 0 && pricingRows === undefined) {
      return res.status(400).json({
        message: "At least one place field must be provided",
      });
    }

    const pendingData = {
      name: (data.name as string) ?? place.name,
      description: (data.description as string) ?? place.description,
      districtId: (data.districtId as string) ?? place.districtId,
      images: (data.images as string[]) ?? place.images,
      entryfee: data.entryfee !== undefined ? (data.entryfee as number | null) : place.entryfee,
      category: (data.category as string) ?? place.category,
      categories: (data.categories as string[]) ?? place.categories,
      entryFeeType: (data.entryFeeType as string) ?? place.entryFeeType,
      childEntryFee: data.childEntryFee !== undefined ? (data.childEntryFee as number | null) : place.childEntryFee,
      childMaxAge: data.childMaxAge !== undefined ? (data.childMaxAge as number | null) : place.childMaxAge,
      entryFeeConditions: data.entryFeeConditions !== undefined ? (data.entryFeeConditions as string | null) : place.entryFeeConditions,
      hasForeignPricing: data.hasForeignPricing !== undefined ? Boolean(data.hasForeignPricing) : place.hasForeignPricing,
      foreignEntryFeeType: data.foreignEntryFeeType !== undefined ? (data.foreignEntryFeeType as string | null) : place.foreignEntryFeeType,
      foreignAdultFee: data.foreignAdultFee !== undefined ? (data.foreignAdultFee as number | null) : place.foreignAdultFee,
      foreignChildFee: data.foreignChildFee !== undefined ? (data.foreignChildFee as number | null) : place.foreignChildFee,
      foreignChildMaxAge: data.foreignChildMaxAge !== undefined ? (data.foreignChildMaxAge as number | null) : place.foreignChildMaxAge,
      foreignEntryFeeConditions: data.foreignEntryFeeConditions !== undefined ? (data.foreignEntryFeeConditions as string | null) : place.foreignEntryFeeConditions,
      hasAdditionalFees: data.hasAdditionalFees !== undefined ? Boolean(data.hasAdditionalFees) : place.hasAdditionalFees,
      additionalFees: data.additionalFees !== undefined ? (data.additionalFees as Prisma.InputJsonValue) : (place.additionalFees as Prisma.InputJsonValue),
      addressLine: data.addressLine !== undefined ? (data.addressLine as string | null) : place.addressLine,
      locality: data.locality !== undefined ? (data.locality as string | null) : place.locality,
      pincode: data.pincode !== undefined ? (data.pincode as string | null) : place.pincode,
      mapsUrl: data.mapsUrl !== undefined ? (data.mapsUrl as string | null) : place.mapsUrl,
      latitude: (data.latitude as number) ?? place.latitude,
      longitude: (data.longitude as number) ?? place.longitude,
      ...(pricingRows !== undefined
        ? { pricing: pricingRows as unknown as Prisma.InputJsonValue }
        : {}),
    };

    if (await shouldAutoApprovePlaces(place.district.autoApprovePlaces)) {
      const result = await prisma.$transaction(async (tx) => {
        const updatedPlace = await tx.place.update({
          where: {
            id: placeId,
          },
          data: { ...data, status: "APPROVED" },
        });

        if (pricingRows !== undefined) {
          await replacePlacePricing(tx, placeId, pricingRows);
        }

        const submission = await tx.place_submission.create({
          data: {
            ...pendingData,
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
      districtId,
      stateId,
      images,
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

    if (districtId) {
      const locValidation = await validateStateAndDistrict(districtId, stateId);
      if (!locValidation.ok) {
        return res.status(locValidation.status).json({ message: locValidation.message });
      }
    }

    const pricingSnapshot = pricingFromBody(req.body);
    let pricingRows: PlacePricingInput[] | undefined = undefined;

    if (pricingSnapshot !== undefined) {
      const pricing = parsePlacePricing(pricingSnapshot);
      if (!pricing.ok) {
        return res.status(400).json({ message: pricing.message });
      }
      pricingRows = pricing.rows;
    }

    const data: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ message: "name must be a non-empty string" });
      }
      data.name = name.trim();
    }

    if (description !== undefined) {
      if (typeof description !== "string" || !description.trim()) {
        return res.status(400).json({ message: "description must be a non-empty string" });
      }
      data.description = description.trim();
    }

    if (districtId !== undefined) {
      data.districtId = districtId;
    }

    if (images !== undefined) {
      if (!Array.isArray(images)) {
        return res.status(400).json({ message: "images must be an array" });
      }
      data.images = images;
    }

    if (req.body.category !== undefined || req.body.categories !== undefined) {
      const catResult = parseCategories(req.body);
      if ("error" in catResult) {
        return res.status(400).json({ message: catResult.error });
      }
      data.category = catResult.primaryCategory;
      data.categories = catResult.categories;
    }

    if (
      req.body.entryfee !== undefined ||
      req.body.entryFeeType !== undefined ||
      req.body.childEntryFee !== undefined ||
      req.body.childMaxAge !== undefined ||
      req.body.hasForeignPricing !== undefined
    ) {
      const feeResult = parseFeeFields({
        ...place,
        ...req.body,
      });
      if ("error" in feeResult) {
        return res.status(400).json({ message: feeResult.error });
      }
      data.entryfee = feeResult.entryfee;
      data.entryFeeType = feeResult.entryFeeType;
      data.childEntryFee = feeResult.childEntryFee;
      data.childMaxAge = feeResult.childMaxAge;
      data.entryFeeConditions = feeResult.entryFeeConditions;
      data.hasForeignPricing = feeResult.hasForeignPricing;
      data.foreignEntryFeeType = feeResult.foreignEntryFeeType;
      data.foreignAdultFee = feeResult.foreignAdultFee;
      data.foreignChildFee = feeResult.foreignChildFee;
      data.foreignChildMaxAge = feeResult.foreignChildMaxAge;
      data.foreignEntryFeeConditions = feeResult.foreignEntryFeeConditions;
      if (pricingRows === undefined) {
        pricingRows = feeResult.pricingRows;
      }
    }

    if (
      req.body.addressLine !== undefined ||
      req.body.locality !== undefined ||
      req.body.pincode !== undefined ||
      req.body.mapsUrl !== undefined ||
      req.body.latitude !== undefined ||
      req.body.longitude !== undefined
    ) {
      const addrResult = parseAddressAndLocation({
        ...place,
        ...req.body,
      });
      if ("error" in addrResult) {
        return res.status(400).json({ message: addrResult.error });
      }
      data.addressLine = addrResult.addressLine;
      data.locality = addrResult.locality;
      data.pincode = addrResult.pincode;
      data.mapsUrl = addrResult.mapsUrl;
      data.latitude = addrResult.latitude;
      data.longitude = addrResult.longitude;
    }

    if (req.body.hasAdditionalFees !== undefined || req.body.additionalFees !== undefined) {
      const addFeeResult = parseAdditionalFees(req.body);
      if ("error" in addFeeResult) {
        return res.status(400).json({ message: addFeeResult.error });
      }
      data.hasAdditionalFees = addFeeResult.hasAdditionalFees;
      data.additionalFees = addFeeResult.additionalFees as unknown as Prisma.InputJsonValue;
    }

    const updatedPlace = await prisma.$transaction(async (tx) => {
      const updated = await tx.place.update({
        where: {
          id: placeId,
        },
        data: {
          ...data,
          status: "APPROVED",
        },
      });

      if (pricingRows !== undefined) {
        await replacePlacePricing(tx, placeId, pricingRows);
      }

      return tx.place.findUniqueOrThrow({
        where: { id: updated.id },
        include: {
          district: {
            include: {
              state: {
                include: { country: true },
              },
            },
          },
          ...placePricingInclude,
        },
      });
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
        district: {
          include: {
            state: {
              include: { country: true },
            },
          },
        },
        specificGuide: true,
        commonGuide: {
          select: {
            id: true,
            full_name: true,
            username: true,
            email: true,
            phonenumber: true,
            profile_pic: true,
            tagline: true,
            agencyName: true,
            experience: true,
            cost: true,
            language: true,
          },
        },
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

    const submittedPricing =
      "pricing" in submission ? submission.pricing : null;

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
            districtId: submission.districtId,
            images: submission.images,
            entryfee: submission.entryfee,
            category: submission.category,
            categories: submission.categories,
            entryFeeType: submission.entryFeeType,
            childEntryFee: submission.childEntryFee,
            childMaxAge: submission.childMaxAge,
            entryFeeConditions: submission.entryFeeConditions,
            hasForeignPricing: submission.hasForeignPricing,
            foreignEntryFeeType: submission.foreignEntryFeeType,
            foreignAdultFee: submission.foreignAdultFee,
            foreignChildFee: submission.foreignChildFee,
            foreignChildMaxAge: submission.foreignChildMaxAge,
            foreignEntryFeeConditions: submission.foreignEntryFeeConditions,
            hasAdditionalFees: submission.hasAdditionalFees,
            additionalFees: (submission.additionalFees ?? undefined) as any,
            addressLine: submission.addressLine,
            locality: submission.locality,
            pincode: submission.pincode,
            mapsUrl: submission.mapsUrl,
            latitude: submission.latitude,
            longitude: submission.longitude,
            status: "APPROVED",
          },
        });

        await applySubmittedPricing(tx, placeId, submittedPricing);

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
          categories: submission.categories,
          entryFeeType: submission.entryFeeType,
          childEntryFee: submission.childEntryFee,
          childMaxAge: submission.childMaxAge,
          entryFeeConditions: submission.entryFeeConditions,
          hasForeignPricing: submission.hasForeignPricing,
          foreignEntryFeeType: submission.foreignEntryFeeType,
          foreignAdultFee: submission.foreignAdultFee,
          foreignChildFee: submission.foreignChildFee,
          foreignChildMaxAge: submission.foreignChildMaxAge,
          foreignEntryFeeConditions: submission.foreignEntryFeeConditions,
          hasAdditionalFees: submission.hasAdditionalFees,
          additionalFees: (submission.additionalFees ?? undefined) as any,
          addressLine: submission.addressLine,
          locality: submission.locality,
          pincode: submission.pincode,
          mapsUrl: submission.mapsUrl,
          latitude: submission.latitude,
          longitude: submission.longitude,
          status: "APPROVED",
        },
      });

      await applySubmittedPricing(tx, created.id, submission.pricing);

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