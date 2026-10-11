import { api } from "@/lib/api/client";
import { memoizedGet } from "@/lib/api/cache";
import type { DistrictRef } from "@/features/provider/types";

export type StateRef = {
  id: string;
  name: string;
  isServiceAvailable?: boolean;
  countryId?: string;
};

/** `GET /api/states` answers `{ states: [...] }`. Returns only enabled states in enabled countries. */
type StateResponse = {
  states: (StateRef & {
    _count?: { districts: number };
  })[];
};

/** `GET /api/districts` answers `{ districts: [...] }`. */
type DistrictResponse = {
  districts: (DistrictRef & {
    isServiceAvailable?: boolean;
    stateId?: string;
    _count?: { places: number; hotels: number; restaurent: number };
  })[];
};

/**
 * Fetch all enabled states from the backend.
 * Only states with isServiceAvailable === true in active countries are returned.
 */
export async function getStates(): Promise<StateRef[]> {
  return memoizedGet("locations:states:enabled", async () => {
    const data = await api.get<StateResponse>("/api/states");
    return data?.states ?? [];
  });
}

/**
 * Fetch only enabled districts belonging to a specific state.
 */
export async function getDistrictsByState(stateId: string): Promise<DistrictRef[]> {
  if (!stateId) return [];
  return memoizedGet(`locations:districts:state:${stateId}`, async () => {
    const data = await api.get<DistrictResponse>(`/api/districts?stateId=${encodeURIComponent(stateId)}`);
    return data?.districts ?? [];
  });
}

/**
 * Districts the admin has made available to travellers. Only these can hold a
 * listing, so they are the only valid `districtId` for a new hotel or
 * restaurant. Cached briefly because the pickers and the places index all read
 * the same, very small list.
 */
export async function getDistricts(): Promise<DistrictRef[]> {
  return memoizedGet("locations:districts", async () => {
    const data = await api.get<DistrictResponse>("/api/districts?all=true");
    return data?.districts ?? [];
  });
}
