import { api } from "@/lib/api/client";
import type { Place } from "@/features/places/types";

function servicesPath(districtId: string): string {
  if (!districtId) {
    throw new Error("Places require a real district id");
  }
  return `/${districtId}/services`;
}

/**
 * Lists places for a district. The backend requires the real district id in
 * the URL so it can run its district-service availability middleware.
 */
export async function getPlacesByDistrict(
  districtId: string
): Promise<Place[]> {
  return api.get<Place[]>(
    `${servicesPath(districtId)}/api/places/district/${districtId}`
  );
}

export async function getPlaceById(
  districtId: string,
  placeId: string
): Promise<Place> {
  return api.get<Place>(`${servicesPath(districtId)}/api/places/${placeId}`);
}