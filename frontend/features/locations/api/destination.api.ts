import { getDistricts, getStates } from "@/features/locations/api/locations.api";
import { getPlacesByDistrict } from "@/features/places/api/places.api";
import { getHotelsForDistrict } from "@/features/hotels/api/hotels.api";
import { getRestaurantsForDistrict } from "@/features/restaurants/api/restaurants.api";
import type { Hotel } from "@/features/hotels/types";
import type { Place } from "@/features/places/types";
import type { Restaurent } from "@/features/restaurants/types";
import type { DistrictSummary, StateSummary } from "@/features/locations/types";

/**
 * Fault-tolerant loaders for the customer destination flow.
 *
 * These functions never reject. The backend stays the single source of truth
 * (no mock or fabricated data is ever returned), but a failing / unreachable /
 * mis-shaped backend response is surfaced as a `loadError` string so the page
 * can render its normal error state instead of the framework raising a
 * server-side exception and answering 500.
 */

export type DestinationLoadResult = {
  states: StateSummary[];
  /** Enabled districts of every listed state, loaded in the same request. */
  districts: DistrictSummary[];
  loadError: string | null;
};

export type DistrictContent = {
  places: Place[];
  hotels: Hotel[];
  restaurants: Restaurent[];
  /** Section-level failures, so one broken endpoint cannot blank the page. */
  loadErrors: Partial<Record<"places" | "hotels" | "restaurants", string>>;
};

function describe(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "The destination service is unavailable right now.";
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/**
 * Everything the "Choose Destination" screen needs: enabled states plus their
 * enabled districts. Both lists are fetched server-side in one go, so the
 * screen never depends on a browser -> backend request and never throws.
 * Returns empty lists plus a message when an endpoint fails.
 */
export async function loadDestinationStates(): Promise<DestinationLoadResult> {
  const [states, districts] = await Promise.all([
    getStates().then(
      (value) => ({ value, error: null as string | null }),
      (error: unknown) => ({ value: [] as StateSummary[], error: describe(error) })
    ),
    getDistricts().then(
      (value) => ({ value, error: null as string | null }),
      (error: unknown) => ({ value: [] as DistrictSummary[], error: describe(error) })
    ),
  ]);

  return {
    states: states.value,
    // Only districts of a listed (enabled) state can ever be shown.
    districts: states.error
      ? []
      : districts.value.filter((d) => states.value.some((s) => s.id === d.stateId)),
    loadError: states.error ?? districts.error,
  };
}

function isApproved(status: unknown): boolean {
  return status === "APPROVED";
}

function placeBelongsToDistrict(place: Place, districtId: string): boolean {
  const placeDistrictId =
    place.districtId ?? (place.district as { id?: string } | null | undefined)?.id;
  if (placeDistrictId !== districtId) return false;
  return isApproved(place.status);
}

function contentBelongsToDistrict(
  item: { districtId?: string; district?: { id?: string } | null },
  districtId: string
): boolean {
  const itemDistrictId = item.districtId ?? item.district?.id;
  return itemDistrictId === districtId;
}

/**
 * Places, hotels and restaurants for one district.
 *
 * The backend already restricts each list to `status = APPROVED` inside enabled
 * districts. The filters below repeat that contract on the client so a page can
 * never render another district's content, whatever the response contains.
 */
export async function loadDistrictContent(
  district: DistrictSummary
): Promise<DistrictContent> {
  const districtId = district.id;

  const [places, hotels, restaurants] = await Promise.all([
    getPlacesByDistrict(districtId)
      .then((data) => asArray<Place>(data).filter((p) => placeBelongsToDistrict(p, districtId)))
      .catch((error) => ({ error: describe(error) })),
    getHotelsForDistrict(districtId)
      .then((data) => asArray<Hotel>(data).filter((h) => isApproved(h.status) && contentBelongsToDistrict(h, districtId)))
      .catch((error) => ({ error: describe(error) })),
    getRestaurantsForDistrict(districtId)
      .then((data) => asArray<Restaurent>(data).filter((r) => isApproved(r.status) && contentBelongsToDistrict(r, districtId)))
      .catch((error) => ({ error: describe(error) })),
  ]);

  const loadErrors: DistrictContent["loadErrors"] = {};
  if ("error" in places) loadErrors.places = places.error;
  if ("error" in hotels) loadErrors.hotels = hotels.error;
  if ("error" in restaurants) loadErrors.restaurants = restaurants.error;

  return {
    places: "error" in places ? [] : places,
    hotels: "error" in hotels ? [] : hotels,
    restaurants: "error" in restaurants ? [] : restaurants,
    loadErrors,
  };
}
