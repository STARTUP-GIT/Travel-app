import { api } from "@/lib/api/client";
import { memoizedGet } from "@/lib/api/cache";
import type { Hotel, CreateHotelBookingInput } from "@/features/hotels/types";
import type { HotelBooking } from "@/features/bookings/types";

/**
 * Hotel list endpoint is mounted under `/:districtId/services/hotel`, so a
 * real district id is required (no hardcoded state segment). The handler
 * returns every approved hotel with its district hierarchy, so callers still
 * scope the result themselves. Cached with a short TTL so multiple consumers
 * share one request instead of duplicating the same heavy listing.
 */
export async function getHotels(districtId: string): Promise<Hotel[]> {
  if (!districtId) {
    throw new Error("getHotels requires a district id");
  }
  return memoizedGet(`hotels:${districtId}`, () =>
    api.get<Hotel[]>(`/${districtId}/services/hotel/api/getallhotels`)
  );
}

/** Hotels scoped to a single district. */
export async function getHotelsForDistrict(
  districtId: string
): Promise<Hotel[]> {
  if (!districtId) return [];
  const hotels = await getHotels(districtId);
  return hotels.filter(
    (h) => (h.districtId ?? h.district?.id) === districtId
  );
}

export async function getHotelById(
  districtId: string,
  hotelId: string
): Promise<Hotel> {
  return api.get<Hotel>(
    `/${districtId}/services/hotel/api/${hotelId}`
  );
}

export async function createHotelBooking(
  input: CreateHotelBookingInput
): Promise<HotelBooking> {
  const data = await api.post<{
    booking?: HotelBooking;
    message?: string;
  }>("/users/booking/api/hotel-bookings", { body: input });
  return data.booking as HotelBooking;
}