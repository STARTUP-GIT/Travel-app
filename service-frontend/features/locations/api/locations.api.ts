import { api } from "@/lib/api/client";
import { memoizedGet } from "@/lib/api/cache";
import type { DistrictRef } from "@/features/provider/types";

/** `GET /api/districts` answers `{ districts: [...] }`. */
type DistrictResponse = {
  districts: (DistrictRef & {
    isServiceAvailable?: boolean;
    _count?: { places: number; hotels: number; restaurent: number };
  })[];
};

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
