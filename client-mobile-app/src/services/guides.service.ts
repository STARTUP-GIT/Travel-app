/**
 * Guide and package directory.
 *
 * The backend exposes guides ONLY through place-detail responses — there is no
 * public "list guides" or "guide by id" endpoint (a guide's own
 * `/services/:districtId/commonguide/profile/api/getprofile` returns just that
 * guide and is session-guarded). So the customer guide directory is aggregated
 * from the district's places, exactly as the web frontend does.
 *
 * Two consequences the UI must respect, and which this module makes explicit:
 *   - A guide appears under the district(s) of the place(s) they are published
 *     at, not globally.
 *   - A package spanning several districts is only visible for the districts
 *     that actually contain one of its places, and only those places are listed.
 */

import { getApprovedPlaces, getPlaceById } from "@/services/places.service";
import { slugify } from "@/lib/utils/slug";
import type {
  PlaceDetail,
  SpecificGuide,
  TourGuide,
  TourPackageSummary,
} from "@/types/api";

/* -------------------------------------------------------------------------- */
/* Context types                                                              */
/* -------------------------------------------------------------------------- */

/** Enough of a place to render a card or a link, without re-fetching it. */
export type PlaceContext = {
  id: string;
  name: string;
  slug: string;
  districtName: string;
  description: string;
  images: string[];
  category: string;
  entryfee: number | null;
};

export type SpecificGuideEntry = {
  type: "specific";
  guide: SpecificGuide;
  place: { id: string; name: string; slug: string; districtName: string };
};

export type TourGuideEntry = {
  type: "common";
  guide: TourGuide;
  places: PlaceContext[];
  /** Every package this guide is published with in this district. */
  packages: DistrictPackage[];
};

export type DistrictPackage = TourPackageSummary & {
  guide: TourGuide;
  /** The district-resolved places this package covers. */
  places: PlaceContext[];
};

export type GuideWithContext = SpecificGuideEntry | TourGuideEntry;

export type DistrictGuideDirectory = {
  guides: GuideWithContext[];
  packages: DistrictPackage[];
};

/* -------------------------------------------------------------------------- */
/* Aggregation                                                                */
/* -------------------------------------------------------------------------- */

function toPlaceContext(place: PlaceDetail): PlaceContext {
  return {
    id: place.id,
    name: place.name,
    slug: slugify(place.name),
    districtName: place.district?.name ?? "",
    description: place.description ?? "",
    images: Array.isArray(place.images) ? place.images : [],
    category: place.category ?? "",
    entryfee: place.entryfee ?? null,
  };
}

/**
 * Builds both lists in one pass over the district's places.
 *
 * `Promise.allSettled` is deliberate: a single place whose detail request fails
 * must not wipe out every guide in the district and make a populated district
 * read as "No guides published yet".
 */
export async function listDistrictGuideDirectory(
  districtId: string,
): Promise<DistrictGuideDirectory> {
  const places = await getApprovedPlaces(districtId);
  if (places.length === 0) return { guides: [], packages: [] };

  const settled = await Promise.allSettled(
    places.map((place) => getPlaceById(districtId, place.id)),
  );

  const details = settled
    .filter(
      (result): result is PromiseFulfilledResult<PlaceDetail> =>
        result.status === "fulfilled",
    )
    .map((result) => result.value);

  const specific: SpecificGuideEntry[] = [];
  const tourGuides = new Map<string, TourGuideEntry>();
  const packages = new Map<string, DistrictPackage>();

  for (const place of details) {
    const districtName = place.district?.name ?? "";
    const context = toPlaceContext(place);

    for (const guide of place.specificguide ?? []) {
      // A reported guide is withheld everywhere, same as the web app.
      if (guide.isReported) continue;
      specific.push({
        type: "specific",
        guide,
        place: {
          id: place.id,
          name: place.name,
          slug: context.slug,
          districtName,
        },
      });
    }

    for (const link of place.commonGuidePlaces ?? []) {
      const guide = link.commonGuide;
      if (!guide || guide.isReported) continue;

      let entry = tourGuides.get(guide.id);
      if (!entry) {
        entry = { type: "common", guide, places: [], packages: [] };
        tourGuides.set(guide.id, entry);
      }
      entry.places.push(context);
    }

    for (const summary of place.commonGuidePackages ?? []) {
      // A package with no resolvable guide here is a record this district does
      // not vouch for, so it is skipped rather than rendered with a blank host.
      const guide = tourGuides.get(summary.commonGuideId)?.guide;
      if (!guide) continue;

      let entry = packages.get(summary.id);
      if (!entry) {
        entry = { ...summary, guide, places: [] };
        packages.set(summary.id, entry);
      }
      entry.places.push(context);
    }
  }

  // The guide profile page reads its own package list, so flatten the directory
  // back onto each guide rather than making that screen re-walk the directory.
  for (const pkg of packages.values()) {
    tourGuides.get(pkg.guide.id)?.packages.push(pkg);
  }

  return {
    guides: [...specific, ...tourGuides.values()],
    packages: [...packages.values()],
  };
}

export async function listGuidesForDistrict(
  districtId: string,
): Promise<GuideWithContext[]> {
  return (await listDistrictGuideDirectory(districtId)).guides;
}

export async function listPackagesForDistrict(
  districtId: string,
): Promise<DistrictPackage[]> {
  return (await listDistrictGuideDirectory(districtId)).packages;
}

export async function findGuideInDistrict(
  districtId: string,
  guideId: string,
  type?: "specific" | "common",
): Promise<GuideWithContext | null> {
  const guides = await listGuidesForDistrict(districtId);
  return guides.find((entry) => entry.guide.id === guideId && (!type || entry.type === type)) ?? null;
}

export async function findPackageInDistrict(
  districtId: string,
  guideId: string,
  packageId: string,
): Promise<DistrictPackage | null> {
  const packages = await listPackagesForDistrict(districtId);
  return packages.find((pkg) => pkg.id === packageId && pkg.guide.id === guideId) ?? null;
}