import { getPlaceById, getPlacesByDistrict } from "@/features/places/api/places.api";
import type { GuideWithContext } from "@/features/guides/types";
import { slugify } from "@/features/locations/utils/slug";

/**
 * The backend exposes guides only through place detail responses
 * (place.specificguide and place.commonGuidePlaces). There is no public
 * "list guides" or "guide by id" endpoint, so the customer-facing guide data
 * is aggregated from the district's places.
 */

export async function listGuidesForDistrict(
  districtId: string
): Promise<GuideWithContext[]> {
  const places = await getPlacesByDistrict(districtId);

  if (places.length === 0) return [];

  const details = await Promise.all(
    places.map((place) => getPlaceById(districtId, place.id))
  );

  const specific: GuideWithContext[] = [];
  const commonMap = new Map<string, Extract<GuideWithContext, { type: "common" }>>();

  for (const place of details) {
    const districtName = place.district?.name ?? "";

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
        entry = { type: "common", guide, places: [] };
        commonMap.set(guide.id, entry);
      }
      entry.places.push({
        id: place.id,
        name: place.name,
        slug: slugify(place.name),
        districtName,
        images: place.images,
      });
    }
  }

  return [...specific, ...commonMap.values()];
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