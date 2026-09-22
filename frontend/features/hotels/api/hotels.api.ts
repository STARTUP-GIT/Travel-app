import { api } from "@/lib/api/client";
import { memoizedGet } from "@/lib/api/cache";
import type { Hotel, CreateHotelBookingInput } from "@/features/hotels/types";
import type { HotelBooking } from "@/features/bookings/types";

const SERVICE_SEGMENT = "karnataka";

/**
 * Hotel list endpoint ignores the district param and returns all hotels with
 * their district hierarchy, so any consistent segment works. Cached with a
 * short TTL so every consumer (district page, district list, landing shell)
 * shares one request instead of duplicating the same heavy listing.
 */
export async function getHotels(districtId?: string): Promise<Hotel[]> {
  const segment = districtId ?? SERVICE_SEGMENT;
  return memoizedGet(`hotels:${segment}`, () =>
    api.get<Hotel[]>(`/${segment}/services/hotel/api/getallhotels`)
  );
}

/** Hotels scoped to a single district. */
export async function getHotelsForDistrict(
  districtId: string
): Promise<Hotel[]> {
  const hotels = await getHotels();
  return hotels.filter((h) => h.districtId === districtId);
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