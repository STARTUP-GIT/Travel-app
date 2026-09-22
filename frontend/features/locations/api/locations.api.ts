import { getHotels } from "@/features/hotels/api/hotels.api";
import { getRestaurants } from "@/features/restaurants/api/restaurants.api";
import type { District, DistrictSummary, StateSummary } from "@/features/locations/types";
import { slugify } from "@/features/locations/utils/slug";

/**
 * The backend does not currently expose a public "list districts" endpoint.
 * District data is derived from the real hotel and restaurant listings, whose
 * responses include the full district -> state -> country hierarchy. Both
 * listings are memoized (60s TTL), so this coincides with the district page's
 * own hotel/restaurant fetches instead of duplicating them.
 */
export async function getDistricts(): Promise<DistrictSummary[]> {
  const [hotels, restaurants] = await Promise.all([
    getHotels(),
    getRestaurants(),
  ]);

  const map = new Map<string, DistrictSummary>();

  for (const hotel of hotels) {
    if (!hotel.district) continue;
    const district = hotel.district;
    const existing = map.get(district.id);
    if (existing) {
      existing.hotelCount += 1;
    } else {
      map.set(district.id, {
        ...toSummary(district),
        placeCount: 0,
        hotelCount: 1,
        restaurantCount: 0,
      });
    }
  }

  for (const restaurant of restaurants) {
    if (!restaurant.district) continue;
    const district = restaurant.district;
    const existing = map.get(district.id);
    if (existing) {
      existing.restaurantCount += 1;
    } else {
      map.set(district.id, {
        ...toSummary(district),
        placeCount: 0,
        hotelCount: 0,
        restaurantCount: 1,
      });
    }
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function resolveDistrictBySlug(
  slug: string
): Promise<DistrictSummary | null> {
  const districts = await getDistricts();
  return districts.find((d) => d.slug === slug) ?? null;
}

export async function resolveDistrictById(
  id: string
): Promise<DistrictSummary | null> {
  const districts = await getDistricts();
  return districts.find((d) => d.id === id) ?? null;
}

/**
 * States are derived from the real district hierarchy returned by the hotel
 * and restaurant listings (same source as getDistricts), so no state list is
 * hardcoded. A state only appears once at least one of its districts has
 * listings, matching the existing app behavior.
 */
export async function getStates(): Promise<StateSummary[]> {
  const districts = await getDistricts();
  const map = new Map<string, StateSummary>();

  for (const d of districts) {
    if (!d.state) continue;
    const state = d.state;
    const existing = map.get(state.id);
    const spots = d.placeCount + d.hotelCount + d.restaurantCount;
    if (existing) {
      existing.districtCount += 1;
      existing.placeCount += spots;
    } else {
      map.set(state.id, {
        ...state,
        slug: slugify(state.name),
        districtCount: 1,
        placeCount: spots,
      });
    }
  }

  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export async function getStateBySlug(
  stateSlug: string
): Promise<StateSummary | null> {
  const states = await getStates();
  return states.find((s) => s.slug === stateSlug) ?? null;
}

/** Districts belonging to a specific state only (never another state). */
export async function getDistrictsForState(
  stateSlug: string
): Promise<DistrictSummary[]> {
  const [state, districts] = await Promise.all([
    getStateBySlug(stateSlug),
    getDistricts(),
  ]);
  if (!state) return [];
  return districts.filter((d) => d.stateId === state.id);
}

function toSummary(district: District): DistrictSummary {
  return {
    id: district.id,
    name: district.name,
    stateId: district.stateId,
    state: district.state,
    isServiceAvailable: district.isServiceAvailable,
    slug: slugify(district.name),
    placeCount: 0,
    hotelCount: 0,
    restaurantCount: 0,
  };
}