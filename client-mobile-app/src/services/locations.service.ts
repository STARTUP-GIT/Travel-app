/**
 * Location service.
 *
 * Availability is controlled entirely by the admin enable/disable toggles, and
 * the public customer endpoints already filter on them:
 *
 *   GET /api/states    -> enabled states, wrapped as `{ states }`
 *   GET /api/districts -> enabled districts whose parent state is also enabled,
 *                         wrapped as `{ districts }`, each with a real
 *                         `state` relation and backend `_count` aggregates
 *
 * Every parser below is total: a missing field, a null relation or a non-array
 * payload yields an empty list rather than throwing. Nothing here defaults to a
 * particular state or district — the customer always starts from whatever the
 * backend has actually enabled.
 */

import { api, asArray, asRecord } from "@/lib/api/client";
import { slugify } from "@/lib/utils/slug";
import type { Country, State } from "@/types/api";

export type StateSummary = State & {
  slug: string;
  /** Districts in this state that are themselves enabled. */
  districtCount: number;
  /** Places + hotels + restaurants across those districts. */
  placeCount: number;
};

export type DistrictSummary = {
  id: string;
  name: string;
  stateId: string;
  slug: string;
  isServiceAvailable: boolean;
  /** Backend flag: guide submissions here are published immediately. */
  autoApprovePlaces: boolean;
  state: StateSummary | null;
  placeCount: number;
  hotelCount: number;
  restaurantCount: number;
};

/* -------------------------------------------------------------------------- */
/* Coercion helpers                                                           */
/* -------------------------------------------------------------------------- */

const asCount = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const asText = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value : null;

function parseCountry(value: unknown): Country {
  const raw = asRecord(value);
  return {
    id: typeof raw.id === "string" ? raw.id : "",
    name: typeof raw.name === "string" ? raw.name : "India",
    isServiceAvailable: raw.isServiceAvailable === true,
  };
}

function parseState(value: unknown): StateSummary | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;

  const id = typeof raw.id === "string" ? raw.id : "";
  const name = typeof raw.name === "string" ? raw.name : "";
  if (!id || !name) return null;

  const counts = asRecord(raw._count);

  return {
    id,
    name,
    countryId: typeof raw.countryId === "string" ? raw.countryId : "",
    country: parseCountry(raw.country),
    // The backend already filters; this second gate means a state is never shown
    // enabled if the admin has since switched it off.
    isServiceAvailable: raw.isServiceAvailable === true,
    primaryImage: asText(raw.primaryImage),
    slug: slugify(name),
    districtCount: asCount(counts.districts),
    placeCount: 0,
  };
}

/* -------------------------------------------------------------------------- */
/* Queries                                                                    */
/* -------------------------------------------------------------------------- */

const byName = <T extends { name: string }>(a: T, b: T): number =>
  a.name.localeCompare(b.name);

export async function getDistricts(): Promise<DistrictSummary[]> {
  const data = await api.get<{ districts?: unknown }>("/api/districts");

  return asArray<unknown>(data?.districts)
    .map((value): DistrictSummary | null => {
      if (!value || typeof value !== "object") return null;
      const raw = value as Record<string, unknown>;

      const id = typeof raw.id === "string" ? raw.id : "";
      const name = typeof raw.name === "string" ? raw.name : "";
      const stateId = typeof raw.stateId === "string" ? raw.stateId : "";
      if (!id || !name || !stateId) return null;

      const state = parseState(raw.state);
      const counts = asRecord(raw._count);

      return {
        id,
        name,
        stateId,
        slug: slugify(name),
        // Enabled only when the parent state resolves *and* is enabled — a
        // district under a disabled state must not be reachable.
        isServiceAvailable: raw.isServiceAvailable === true && state !== null,
        autoApprovePlaces: raw.autoApprovePlaces === true,
        state,
        placeCount: asCount(counts.places),
        hotelCount: asCount(counts.hotels),
        restaurantCount: asCount(counts.restaurent),
      };
    })
    .filter((d): d is DistrictSummary => d !== null && d.isServiceAvailable)
    .sort(byName);
}

/**
 * All enabled states.
 *
 * The per-state place total is derived from the district aggregates rather than
 * invented: the backend does not aggregate places directly onto a state.
 */
export async function getStates(): Promise<StateSummary[]> {
  const [statesResponse, districts] = await Promise.all([
    api.get<{ states?: unknown }>("/api/states"),
    // A district failure must not empty the whole picker.
    getDistricts().catch(() => [] as DistrictSummary[]),
  ]);

  const totals = new Map<string, { districtCount: number; placeCount: number }>();
  for (const district of districts) {
    const listings = district.placeCount + district.hotelCount + district.restaurantCount;
    const existing = totals.get(district.stateId);
    if (existing) {
      existing.districtCount += 1;
      existing.placeCount += listings;
    } else {
      totals.set(district.stateId, { districtCount: 1, placeCount: listings });
    }
  }

  return asArray<unknown>(statesResponse?.states)
    .map(parseState)
    .filter((s): s is StateSummary => s !== null && s.isServiceAvailable)
    .map((state) => {
      const counts = totals.get(state.id);
      return {
        ...state,
        districtCount: counts?.districtCount ?? state.districtCount,
        placeCount: counts?.placeCount ?? 0,
      };
    })
    .sort(byName);
}

/** Districts belonging to exactly one state, and only when that state is enabled. */
export async function getDistrictsForState(stateId: string): Promise<DistrictSummary[]> {
  if (!stateId) return [];
  const [districts, states] = await Promise.all([
    getDistricts(),
    getStates().catch(() => [] as StateSummary[]),
  ]);

  const state = states.find((s) => s.id === stateId);
  if (!state) return [];
  return districts.filter((d) => d.stateId === stateId);
}

/** Route segments are slugs, so a district id is resolved before any request. */
export async function resolveDistrictBySlug(slug: string): Promise<DistrictSummary | null> {
  const normalized = slugify(slug ?? "");
  if (!normalized) return null;
  const districts = await getDistricts();
  return districts.find((d) => d.slug === normalized) ?? null;
}

export async function resolveDistrictById(id: string): Promise<DistrictSummary | null> {
  if (!id) return null;
  const districts = await getDistricts();
  return districts.find((d) => d.id === id) ?? null;
}

export async function getStateBySlug(stateSlug: string): Promise<StateSummary | null> {
  const normalized = slugify(stateSlug ?? "");
  if (!normalized) return null;
  const states = await getStates();
  return states.find((s) => s.slug === normalized) ?? null;
}