import { api } from "@/lib/api/client";
import { memoizedGet } from "@/lib/api/cache";
import type {
  Country,
  DistrictSummary,
  StateSummary,
} from "@/features/locations/types";
import { slugify } from "@/features/locations/utils/slug";

/**
 * Geographic availability is controlled by the admin enable/disable toggles
 * (state.isServiceAvailable / district.isServiceAvailable) and served by the
 * public customer endpoints:
 *
 *   GET /api/states    -> states that are enabled
 *   GET /api/districts -> districts that are enabled AND whose state is enabled
 *
 * Approved listings never determine whether a state or district appears. Content
 * counts (places, hotels, restaurants) are real backend aggregates that describe
 * what exists inside an enabled location.
 */
export async function getDistricts(): Promise<DistrictSummary[]> {
  return memoizedGet("geo:districts", async () => {
    const data = await api.get<{ districts: ApiDistrict[] }>("/api/districts");
    return data.districts
      .map((d) => ({
        id: d.id,
        name: d.name,
        stateId: d.stateId,
        isServiceAvailable: d.isServiceAvailable,
        autoApprovePlaces: d.autoApprovePlaces,
        state: {
          id: d.state.id,
          name: d.state.name,
          countryId: d.state.countryId,
          isServiceAvailable: d.state.isServiceAvailable,
          country: d.state.country,
        },
        slug: slugify(d.name),
        placeCount: d._count.places,
        hotelCount: d._count.hotels,
        restaurantCount: d._count.restaurent,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  });
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
 * All enabled states. A state appears as soon as the admin enables it, even if
 * none of its districts or listings are enabled/approved yet.
 */
export async function getStates(): Promise<StateSummary[]> {
  return memoizedGet("geo:states", async () => {
    const [data, districts] = await Promise.all([
      api.get<{ states: ApiState[] }>("/api/states"),
      getDistricts(),
    ]);

    const perState = new Map<string, { districtCount: number; placeCount: number }>();
    for (const d of districts) {
      const spots = d.placeCount + d.hotelCount + d.restaurantCount;
      const existing = perState.get(d.stateId);
      if (existing) {
        existing.districtCount += 1;
        existing.placeCount += spots;
      } else {
        perState.set(d.stateId, { districtCount: 1, placeCount: spots });
      }
    }

    return data.states
      .map((s) => {
        const counts = perState.get(s.id);
        return {
          id: s.id,
          name: s.name,
          countryId: s.countryId,
          country: s.country,
          isServiceAvailable: s.isServiceAvailable,
          slug: slugify(s.name),
          districtCount: counts?.districtCount ?? 0,
          placeCount: counts?.placeCount ?? 0,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  });
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

type ApiCountry = Country;

type ApiState = {
  id: string;
  name: string;
  countryId: string;
  isServiceAvailable: boolean;
  country: ApiCountry;
  _count: { districts: number };
};

type ApiDistrict = {
  id: string;
  name: string;
  stateId: string;
  isServiceAvailable: boolean;
  autoApprovePlaces: boolean;
  state: ApiState;
  _count: { places: number; hotels: number; restaurent: number };
};