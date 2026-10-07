/**
 * Search across a district.
 *
 * The backend has no search endpoint, so results are derived from the real
 * district listings already fetched for the Places, Hotels, Restaurants and
 * Guides screens — no index is invented and nothing is hardcoded. Matching is a
 * plain case-insensitive substring over the fields a user would type, which
 * behaves predictably for place names in any script.
 */

import {
  getApprovedPlaces,
  getHotelsForDistrict,
  getRestaurantsForDistrict,
} from "@/services/places.service";
import { listGuidesForDistrict, type GuideWithContext } from "@/services/guides.service";
import type { Hotel, Place, Restaurent } from "@/types/api";

export type SearchResultGroup =
  | { kind: "places"; label: string; items: Place[] }
  | { kind: "hotels"; label: string; items: Hotel[] }
  | { kind: "restaurants"; label: string; items: Restaurent[] }
  | { kind: "guides"; label: string; items: GuideWithContext[] };

export type SearchResults = {
  query: string;
  groups: SearchResultGroup[];
  total: number;
};

const EMPTY: SearchResults = { query: "", groups: [], total: 0 };

/** Two characters minimum — a single letter matches almost everything. */
const MIN_QUERY_LENGTH = 2;

const matches = (haystack: (string | null | undefined)[], needle: string): boolean => {
  const query = needle.toLowerCase();
  return haystack.some((value) =>
    typeof value === "string" && value.toLowerCase().includes(query),
  );
};

export async function searchDistrict(
  districtId: string,
  rawQuery: string,
): Promise<SearchResults> {
  const query = rawQuery.trim();
  if (!districtId || query.length < MIN_QUERY_LENGTH) return { ...EMPTY, query };

  // Each source degrades to empty so one slow listing does not fail the search.
  // Approved places only — a pending submission must never appear in results.
  const [places, hotels, restaurants, guides] = await Promise.all([
    getApprovedPlaces(districtId).catch(() => [] as Place[]),
    getHotelsForDistrict(districtId).catch(() => [] as Hotel[]),
    getRestaurantsForDistrict(districtId).catch(() => [] as Restaurent[]),
    listGuidesForDistrict(districtId).catch(() => [] as GuideWithContext[]),
  ]);

  const groups: SearchResultGroup[] = [];

  const placeHits = places.filter((place) =>
    matches([place.name, place.description, place.category], query),
  );
  if (placeHits.length) groups.push({ kind: "places", label: "Places", items: placeHits });

  const hotelHits = hotels.filter((hotel) =>
    matches([hotel.name, hotel.address, hotel.description], query),
  );
  if (hotelHits.length) groups.push({ kind: "hotels", label: "Hotels", items: hotelHits });

  const restaurantHits = restaurants.filter((restaurant) =>
    matches([restaurant.name, restaurant.address, restaurant.description], query),
  );
  if (restaurantHits.length) {
    groups.push({ kind: "restaurants", label: "Restaurants", items: restaurantHits });
  }

  const guideHits = guides.filter((entry) =>
    matches(
      [
        entry.guide.full_name,
        entry.guide.tagline,
        Array.isArray(entry.guide.language) ? entry.guide.language.join(" ") : "",
      ],
      query,
    ),
  );
  if (guideHits.length) groups.push({ kind: "guides", label: "Guides", items: guideHits });

  return {
    query,
    groups,
    total:
      placeHits.length + hotelHits.length + restaurantHits.length + guideHits.length,
  };
}