import { api } from "@/lib/api/client";
import { memoizedGet } from "@/lib/api/cache";
import type {
  Country,
  District,
  DistrictSummary,
  State,
  StateSummary,
} from "@/features/locations/types";
import { slugify } from "@/features/locations/utils/slug";

/**
 * Geographic availability is controlled by the admin enable/disable toggles
 * (state.isServiceAvailable / district.isServiceAvailable) and served by the
 * public customer endpoints:
 *
 *   GET /api/states    -> states where state.isServiceAvailable === true
 *   GET /api/districts -> districts where district.isServiceAvailable === true
 *                          AND parent state.isServiceAvailable === true
 *
 * Approved listings never determine whether a state or district appears. Content
 * counts (places, hotels, restaurants) are real backend aggregates that describe
 * what exists inside an enabled location.
 *
 * Every parser below is total: a missing/renamed field, a null relation or a
 * non-array payload produces an empty list instead of throwing. The raw
 * response shape is still owned by the backend — nothing here invents data.
 */
type ApiCountry = {
  id: string;
  name: string;
  isServiceAvailable: boolean;
};

type ApiState = {
  id: string;
  name: string;
  countryId: string;
  isServiceAvailable: boolean;
  primaryImage?: string | null;
  country?: ApiCountry | null;
  _count?: { districts?: number } | null;
};

type ApiDistrict = {
  id: string;
  name: string;
  stateId: string;
  isServiceAvailable: boolean;
  autoApprovePlaces?: boolean;
  state?: ApiState | null;
  _count?: { places?: number; hotels?: number; restaurent?: number } | null;
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asCount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function parseCountry(value: unknown): Country {
  const raw = (value ?? {}) as Partial<ApiCountry>;
  return {
    id: typeof raw.id === "string" ? raw.id : "",
    name: typeof raw.name === "string" ? raw.name : "India",
    isServiceAvailable: raw.isServiceAvailable === true,
  };
}

function parseState(value: unknown): StateSummary | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as ApiState;
  if (typeof raw.id !== "string" || !raw.id) return null;
  if (typeof raw.name !== "string" || !raw.name) return null;

  return {
    id: raw.id,
    name: raw.name,
    countryId: typeof raw.countryId === "string" ? raw.countryId : "",
    country: parseCountry(raw.country),
    // Enabled-only. The backend already filters, this is the second gate.
    isServiceAvailable: raw.isServiceAvailable === true,
    primaryImage: asText(raw.primaryImage),
    slug: slugify(raw.name),
    districtCount: asCount(raw._count?.districts),
    placeCount: 0,
  };
}

function emptyState(stateId: string): State {
  return {
    id: stateId,
    name: "",
    countryId: "",
    country: parseCountry(null),
    isServiceAvailable: false,
    primaryImage: null,
  };
}

function parseDistrict(value: unknown): DistrictSummary | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as ApiDistrict;
  if (typeof raw.id !== "string" || !raw.id) return null;
  if (typeof raw.name !== "string" || !raw.name) return null;
  if (typeof raw.stateId !== "string" || !raw.stateId) return null;

  const state = parseState(raw.state);

  const base: District = {
    id: raw.id,
    name: raw.name,
    stateId: raw.stateId,
    // Enabled-only, and only when the parent state itself is resolvable.
    isServiceAvailable: raw.isServiceAvailable === true && state !== null,
    state: state ?? emptyState(raw.stateId),
    autoApprovePlaces: raw.autoApprovePlaces === true,
  };

  return {
    ...base,
    slug: slugify(raw.name),
    placeCount: asCount(raw._count?.places),
    hotelCount: asCount(raw._count?.hotels),
    restaurantCount: asCount(raw._count?.restaurent),
  };
}

function byName<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name);
}

/** All enabled states, as returned by GET /api/states. */
export async function getStates(): Promise<StateSummary[]> {
  return memoizedGet("geo:states", async () => {
    const [data, districts] = await Promise.all([
      api.get<{ states?: unknown }>("/api/states"),
      getDistricts().catch(() => [] as DistrictSummary[]),
    ]);

    const perState = new Map<
      string,
      { districtCount: number; placeCount: number }
    >();
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

    return asArray<unknown>(data?.states)
      .map(parseState)
      .filter((s): s is StateSummary => s !== null && s.isServiceAvailable)
      .map((s) => {
        const counts = perState.get(s.id);
        return {
          ...s,
          districtCount: counts?.districtCount ?? s.districtCount,
          placeCount: counts?.placeCount ?? 0,
        };
      })
      .sort(byName);
  });
}

/** All enabled districts, as returned by GET /api/districts. */
export async function getDistricts(): Promise<DistrictSummary[]> {
  return memoizedGet("geo:districts", async () => {
    const data = await api.get<{ districts?: unknown }>("/api/districts");
    return asArray<unknown>(data?.districts)
      .map(parseDistrict)
      .filter((d): d is DistrictSummary => d !== null && d.isServiceAvailable)
      .sort(byName);
  });
}

export async function resolveDistrictBySlug(
  slug: string
): Promise<DistrictSummary | null> {
  const normalized = slugify(slug ?? "");
  if (!normalized) return null;
  const districts = await getDistricts();
  return districts.find((d) => d.slug === normalized) ?? null;
}

export async function resolveDistrictById(
  id: string
): Promise<DistrictSummary | null> {
  if (!id) return null;
  const districts = await getDistricts();
  return districts.find((d) => d.id === id) ?? null;
}

export async function getStateBySlug(
  stateSlug: string
): Promise<StateSummary | null> {
  const normalized = slugify(stateSlug ?? "");
  if (!normalized) return null;
  const states = await getStates();
  return states.find((s) => s.slug === normalized) ?? null;
}

/**
 * Districts belonging to a specific state only (never another state), and only
 * when that state itself is enabled.
 */
export async function getDistrictsForState(
  stateSlug: string
): Promise<DistrictSummary[]> {
  const state = await getStateBySlug(stateSlug);
  if (!state) return [];
  const districts = await getDistricts();
  return districts.filter((d) => d.stateId === state.id);
}
