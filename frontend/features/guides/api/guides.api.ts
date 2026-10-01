import { getPlaceById, getPlacesByDistrict } from "@/features/places/api/places.api";
import type {
  GuideWithContext,
  PackageWithContext,
} from "@/features/guides/types";
import { slugify } from "@/features/locations/utils/slug";

/**
 * The backend exposes guides only through place detail responses
 * (place.specificguide, place.commonGuidePlaces and place.commonGuidePackages).
 * There is no public "list guides" or "guide by id" endpoint, so the
 * customer-facing guide and package data is aggregated from the district's
 * places — which is also why a package is only visible for the districts it
 * actually contains places in.
 */

export type DistrictGuideDirectory = {
  guides: GuideWithContext[];
  packages: PackageWithContext[];
};

/**
 * One pass over the district's places producing both guides and packages.
 *
 * Both lists come from the same place responses, so the page loads them together
 * rather than issuing the district's detail requests twice. A package is indexed
 * by its own id, and the places it is seen at are collected on the way, so a
 * package spanning several districts still shows up once per district with every
 * place the district can see.
 */
export async function listDistrictGuideDirectory(
  districtId: string
): Promise<DistrictGuideDirectory> {
  // Mirrors the Places list page: only approved places are public, so guides
  // are never aggregated from a place the detail page would refuse to open.
  const places = (await getPlacesByDistrict(districtId)).filter(
    (place) => place.status === "APPROVED"
  );

  if (places.length === 0) return { guides: [], packages: [] };

  // One place whose detail request fails (5xx, network, malformed relation)
  // must not wipe out every guide in the district. `allSettled` keeps the
  // places that did resolve, so a single broken record cannot make the whole
  // page read "No guides published yet".
  const settled = await Promise.allSettled(
    places.map((place) => getPlaceById(districtId, place.id))
  );

  const details = settled
    .filter(
      (
        result
      ): result is PromiseFulfilledResult<
        Awaited<ReturnType<typeof getPlaceById>>
      > => result.status === "fulfilled"
    )
    .map((result) => result.value);

  const specific: GuideWithContext[] = [];
  const commonMap = new Map<string, Extract<GuideWithContext, { type: "common" }>>();
  const packageMap = new Map<string, PackageWithContext>();

  for (const place of details) {
    const districtName = place.district?.name ?? "";
    const placeContext = {
      id: place.id,
      name: place.name,
      slug: slugify(place.name),
      districtName,
      description: place.description,
      images: place.images,
      category: place.category,
      entryfee: place.entryfee,
      pricing: place.pricing ?? [],
    };

    for (const guide of place.specificguide ?? []) {
      if (guide.isReported) continue;
      specific.push({
        type: "specific",
        guide,
        place: {
          id: place.id,
          name: place.name,
          slug: slugify(place.name),
          districtName,
        },
      });
    }

    for (const link of place.commonGuidePlaces ?? []) {
      const guide = link.commonGuide;
      if (!guide) continue;

      let entry = commonMap.get(guide.id);
      if (!entry) {
        entry = { type: "common", guide, places: [], packages: [] };
        commonMap.set(guide.id, entry);
      }
      entry.places.push(placeContext);
    }

    for (const pkg of place.commonGuidePackages ?? []) {
      // The backend only publishes packages of an approved guide, and every
      // guide published for this place is in `commonMap` already, so a package
      // without a guide here is a response the district does not vouch for.
      const guide = commonMap.get(pkg.commonGuideId)?.guide;
      if (!guide) continue;

      let entry = packageMap.get(pkg.id);
      if (!entry) {
        entry = { ...pkg, guide, places: [] };
        packageMap.set(pkg.id, entry);
      }
      entry.places.push(placeContext);
    }
  }

  // A guide's own package list is the same set, flattened for the guide profile
  // so the guide page does not have to reach into the package directory.
  for (const pkg of packageMap.values()) {
    commonMap.get(pkg.guide.id)?.packages.push(pkg);
  }

  return { guides: [...specific, ...commonMap.values()], packages: [...packageMap.values()] };
}

export async function listGuidesForDistrict(
  districtId: string
): Promise<GuideWithContext[]> {
  return (await listDistrictGuideDirectory(districtId)).guides;
}

export async function listPackagesForDistrict(
  districtId: string
): Promise<PackageWithContext[]> {
  return (await listDistrictGuideDirectory(districtId)).packages;
}

export async function findGuideInDistrict(
  districtId: string,
  guideId: string,
  type?: "specific" | "common"
): Promise<GuideWithContext | null> {
  const guides = await listGuidesForDistrict(districtId);
  return (
    guides.find((g) => g.guide.id === guideId && (!type || g.type === type)) ??
    null
  );
}

export async function findPackageInDistrict(
  districtId: string,
  guideId: string,
  packageId: string
): Promise<PackageWithContext | null> {
  const packages = await listPackagesForDistrict(districtId);
  return (
    packages.find(
      (pkg) => pkg.id === packageId && pkg.guide.id === guideId
    ) ?? null
  );
}