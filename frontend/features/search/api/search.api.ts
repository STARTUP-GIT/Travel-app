import { api } from "@/lib/api/client";
import { getHotelsForDistrict } from "@/features/hotels/api/hotels.api";
import { getRestaurantsForDistrict } from "@/features/restaurants/api/restaurants.api";
import { getPlacesByDistrict } from "@/features/places/api/places.api";
import { slugify } from "@/features/locations/utils/slug";
import type { Place } from "@/features/places/types";
import type { Hotel } from "@/features/hotels/types";
import type { Restaurent } from "@/features/restaurants/types";
import type { GuideWithContext } from "@/features/guides/types";
import { listGuidesForDistrict } from "@/features/guides/api/guides.api";

export type SearchResultGroup =
  | { kind: "places"; items: Place[] }
  | { kind: "hotels"; items: Hotel[] }
  | { kind: "restaurants"; items: Restaurent[] }
  | { kind: "guides"; items: GuideWithContext[] };

export type SearchResults = {
  query: string;
  groups: SearchResultGroup[];
  total: number;
};

function matches(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

/**
 * Aggregated search across a district's places, hotels, restaurants and
 * guides. Everything is derived from real backend listings — no fake data.
 */
export async function searchDistrict(
  districtId: string,
  rawQuery: string
): Promise<SearchResults> {
  const query = rawQuery.trim();
  if (query.length < 2) {
    return { query, groups: [], total: 0 };
  }

  const groups: SearchResultGroup[] = [];

  const [places, hotels, restaurants, guides] = await Promise.all([
    getPlacesByDistrict(districtId).catch(() => []),
    getHotelsForDistrict(districtId).catch(() => []),
    getRestaurantsForDistrict(districtId).catch(() => []),
    listGuidesForDistrict(districtId).catch(() => []),
  ]);

  const q = query.toLowerCase();

  const placeHits = places.filter((p) =>
    matches(`${p.name} ${p.description} ${p.category ?? ""}`, q)
  );
  if (placeHits.length) groups.push({ kind: "places", items: placeHits });

  const hotelHits = hotels.filter((h) =>
    matches(`${h.name} ${h.address ?? ""} ${h.description ?? ""}`, q)
  );
  if (hotelHits.length) groups.push({ kind: "hotels", items: hotelHits });

  const restaurantHits = restaurants.filter((r) =>
    matches(`${r.name} ${r.address ?? ""} ${r.description ?? ""}`, q)
  );
  if (restaurantHits.length) groups.push({ kind: "restaurants", items: restaurantHits });

  const guideHits = guides.filter((g) =>
    matches(
      `${g.guide.full_name} ${g.guide.tagline ?? ""} ${g.guide.language?.join(" ") ?? ""}`,
      q
    )
  );
  if (guideHits.length) groups.push({ kind: "guides", items: guideHits });

  return {
    query,
    groups,
    total: placeHits.length + hotelHits.length + restaurantHits.length + guideHits.length,
  };
}

export function toSlug(value: string): string {
  return slugify(value);
}