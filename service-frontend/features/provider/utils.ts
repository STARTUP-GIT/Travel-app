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
      description: restaurant.description ?? "",
      rating: restaurant.rating,
      costPerNight: 0,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      phone: restaurant.phone_number ?? "",
      whatsapp: restaurant.whatsapp_number ?? "",
      email: restaurant.email ?? "",
      website: restaurant.website ?? "",
      bookingEnabled: restaurant.booking_enabled,
      images: restaurant.images,
      foodCategory: restaurant.food_category,
      menu: restaurant.menu,
    };
  }

  return null;
}
