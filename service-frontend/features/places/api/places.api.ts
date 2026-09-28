import { api } from "@/lib/api/client";
import { memoizedGet } from "@/lib/api/cache";
import { placesInDistrictPath } from "@/features/provider/config";
import type { DistrictRef } from "@/features/provider/types";

export type Place = {
  id: string;
  name: string;
  description: string;
  districtId: string;
  images: string[];
  entryfee: number | null;
  category: string;
  latitude: number;
  longitude: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  updatedAt: string;
  district?: DistrictRef | null;
};

/**
 * Approved places inside one district — the public list a guide registers
 * against. The backend only ever returns approved rows, so this is also the
 * only place a provider can be assigned to.
 */
export async function getPlaces(districtId: string): Promise<Place[]> {
  return memoizedGet(`places:district:${districtId}`, async () => {
    const places = await api.get<Place[]>(placesInDistrictPath(districtId));
    return Array.isArray(places) ? places : [];
  });
}

/** Single place, used to show a name next to a place id in a request row. */
export async function getPlace(placeId: string): Promise<Place | null> {
  return memoizedGet(`places:one:${placeId}`, async () => {
    try {
      return await api.get<Place>(`/provider/services/api/places/${placeId}`);
    } catch {
      return null;
    }
  });
}
