import type {
  HotelRecord,
  ProviderListing,
  ProviderListingInput,
  RestaurantRecord,
} from "@/features/provider/types";

/**
 * The two venue kinds are distinguished by the row's `kind`, not by the type of
 * `record`, so these narrow once and give the rest of the UI a concrete shape.
 */
export function hotelOf(listing: ProviderListing): HotelRecord | null {
  return listing.kind === "hotel" && listing.record
    ? (listing.record as HotelRecord)
    : null;
}

export function restaurantOf(listing: ProviderListing): RestaurantRecord | null {
  return listing.kind === "restaurant" && listing.record
    ? (listing.record as RestaurantRecord)
    : null;
}

export function isStayListing(listing: ProviderListing): boolean {
  const hotel = hotelOf(listing);
  if (!hotel) return false;
  return hotel.property_type === "STAY" || Boolean(hotel.stay_category);
}

/**
 * Every venue update is a full replacement, because the backend update schemas
 * validate the whole record. Rebuilding the input from the stored record is
 * therefore the only way to change one field without losing the others.
 */
export function listingToInput(listing: ProviderListing): ProviderListingInput | null {
  const hotel = hotelOf(listing);
  const restaurant = restaurantOf(listing);

  if (hotel) {
    return {
      name: hotel.name,
      property_type: hotel.property_type ?? (hotel.stay_category ? "STAY" : "HOTEL"),
      stay_category: hotel.stay_category ?? null,
      accommodation_rules: hotel.accommodation_rules ?? null,
      cancellation_policy: hotel.cancellation_policy ?? null,
      activities: hotel.activities ?? [],
      facilities: hotel.facilities ?? [],
      roomTypes: hotel.room_types ?? [],
      address: hotel.address,
      profileLogo: hotel.profile_logo,
      districtId: hotel.districtId,
      description: hotel.description ?? "",
      rating: hotel.rating,
      costPerNight: hotel.cost_per_night,
      latitude: hotel.latitude,
      longitude: hotel.longitude,
      phone: hotel.phone_number ?? "",
      whatsapp: hotel.whatsapp_number ?? "",
      email: hotel.email ?? "",
      website: hotel.website ?? "",
      bookingEnabled: hotel.booking_enabled,
      images: hotel.images,
      foodCategory: "PUREVEG",
      menu: [],
    };
  }

  if (restaurant) {
    return {
      name: restaurant.name,
      address: restaurant.address,
      profileLogo: restaurant.profile_logo,
      districtId: restaurant.districtId,
      stateId: restaurant.district?.stateId ?? null,
      description: restaurant.description ?? "",
      rating: restaurant.rating,
      costPerNight: 0,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      mapsUrl: restaurant.maps_url ?? null,
      phone: restaurant.phone_number ?? "",
      whatsapp: restaurant.whatsapp_number ?? "",
      email: restaurant.email ?? "",
      website: restaurant.website ?? "",
      openingTime: restaurant.opening_time ?? null,
      closingTime: restaurant.closing_time ?? null,
      hasBranches: restaurant.has_branches ?? false,
      bookingEnabled: restaurant.booking_enabled,
      images: restaurant.images ?? [],
      foodCategory: restaurant.food_category,
      menu: restaurant.menu ?? [],
      branches: restaurant.branches ?? [],
      dishes: restaurant.dishes ?? [],
    };
  }

  return null;
}
