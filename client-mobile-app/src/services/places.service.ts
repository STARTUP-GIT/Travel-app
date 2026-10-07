/**
 * Places, hotels and restaurants.
 *
 * All three list/detail routes are mounted under `/:districtId/services/...` and
 * pass through `districtServiceMiddleware`, so the real district id must be in
 * the URL — the app never substitutes a default district.
 *
 * The list handlers return every approved record for the app, including its
 * district hierarchy, so each caller still scopes the result to the district it
 * asked about.
 */

import { api } from "@/lib/api/client";
import type {
  Hotel,
  Place,
  PlaceDetail,
  Restaurent,
} from "@/types/api";

/** Guards the `/:districtId` path segment against an unresolved route param. */
function districtPath(districtId: string, label: string): string {
  if (!districtId) {
    // A hard programming error, not a runtime condition — surfacing it here stops
    // a malformed request such as `/undefined/services/...` from being sent.
    throw new Error(`${label} requires a district id`);
  }
  return `/${districtId}/services`;
}

/* -------------------------------------------------------------------------- */
/* Places                                                                     */
/* -------------------------------------------------------------------------- */

export async function getPlacesByDistrict(districtId: string): Promise<Place[]> {
  return api.get<Place[]>(
    `${districtPath(districtId, "Places")}/api/places/district/${districtId}`,
  );
}

/** Public places only — pending and rejected submissions must never be listed. */
export async function getApprovedPlaces(districtId: string): Promise<Place[]> {
  const places = await getPlacesByDistrict(districtId);
  return places.filter((place) => place.status === "APPROVED");
}

export async function getPlaceById(
  districtId: string,
  placeId: string,
): Promise<PlaceDetail> {
  return api.get<PlaceDetail>(
    `${districtPath(districtId, "Places")}/api/places/${placeId}`,
  );
}

/* -------------------------------------------------------------------------- */
/* Hotels                                                                     */
/* -------------------------------------------------------------------------- */

export async function getHotels(districtId: string): Promise<Hotel[]> {
  return api.get<Hotel[]>(
    `${districtPath(districtId, "Hotels")}/hotel/api/getallhotels`,
  );
}

export async function getHotelsForDistrict(districtId: string): Promise<Hotel[]> {
  if (!districtId) return [];
  const hotels = await getHotels(districtId);
  return hotels.filter((hotel) => (hotel.districtId ?? hotel.district?.id) === districtId);
}

export async function getHotelById(districtId: string, hotelId: string): Promise<Hotel> {
  return api.get<Hotel>(
    `${districtPath(districtId, "Hotels")}/hotel/api/${hotelId}`,
  );
}

/* -------------------------------------------------------------------------- */
/* Restaurants                                                                */
/* -------------------------------------------------------------------------- */

export async function getRestaurants(districtId: string): Promise<Restaurent[]> {
  return api.get<Restaurent[]>(
    `${districtPath(districtId, "Restaurants")}/restaurant/api/restaurants`,
  );
}

export async function getRestaurantsForDistrict(
  districtId: string,
): Promise<Restaurent[]> {
  if (!districtId) return [];
  const restaurants = await getRestaurants(districtId);
  return restaurants.filter((place) => (place.districtId ?? place.district?.id) === districtId);
}

export async function getRestaurantById(
  districtId: string,
  restaurantId: string,
): Promise<Restaurent> {
  return api.get<Restaurent>(
    `${districtPath(districtId, "Restaurants")}/restaurant/api/restaurants/${restaurantId}`,
  );
}