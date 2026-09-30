/**
 * Shared domain types for the service-provider app.
 *
 * The four backend provider roles (hotel owner, restaurant owner, common guide,
 * specific guide) expose four different record shapes. Everything the UI needs
 * is normalised here so screens and forms stay identical across kinds, while
 * `HotelRecord` / `RestaurantRecord` keep the untouched backend payload for
 * the service editor.
 */

/** Mirrors the backend `placeSubmissionStatus` enum. */
export type ListingStatus = "PENDING" | "APPROVED" | "REJECTED";

/** Mirrors the backend `bookingStatus` enum. */
export type RequestStatus =
  | "PENDING"
  | "CONFIRMED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

/** The service roles the backend authenticates. */
export const PROVIDER_KINDS = [
  "hotel",
  "restaurant",
  "common_guide",
  "specific_guide",
] as const;

export type ProviderKind = (typeof PROVIDER_KINDS)[number];

export function isProviderKind(value: unknown): value is ProviderKind {
  return (
    typeof value === "string" &&
    (PROVIDER_KINDS as readonly string[]).includes(value)
  );
}

/** The kind of "thing" a service provider manages. */
export type ServiceKind = "hotel" | "restaurant" | "guide";

export type ProviderRequestKind =
  | "hotel_booking"
  | "restaurant_reservation"
  | "specific_guide_booking"
  | "common_guide_booking";

/* -------------------------------------------------------------------------- */
/*  Profile                                                                   */
/* -------------------------------------------------------------------------- */

/** One profile shape for every provider kind; the action fills it from the backend record. */
export type ProviderProfile = {
  id: string;
  kind: ProviderKind;
  name: string;
  username: string;
  email: string;
  phone: string;
  photo: string | null;
  /** Guides only. */
  tagline: string;
  description: string;
  experience: number;
  cost: number;
  languages: string[];
  rating: number | null;
  reviews: string[];
  placeIds: string[];
  isReported: boolean;
  authProvider: string;
  createdAt: string;
  updatedAt: string;
};

export type ProviderProfileInput = {
  name?: string;
  username?: string;
  email?: string;
  phone?: string;
  photo?: string;
  tagline?: string;
  description?: string;
  experience?: number;
  cost?: number;
  languages?: string[];
  password?: string;
};

/* -------------------------------------------------------------------------- */
/*  Tour packages (common guide only)                                          */
/* -------------------------------------------------------------------------- */

/** A place as it appears inside a package. */
export type PackagePlace = {
  id: string;
  name: string;
  images: string[];
  category: string;
  district: { id: string; name: string } | null;
};

/** One named tour: the guide's own package record, with its places flattened in. */
export type TourPackage = {
  id: string;
  name: string;
  description: string | null;
  places: PackagePlace[];
  createdAt: string;
  updatedAt: string;
};

export type TourPackageInput = {
  name: string;
  description: string;
  /** At least one place; a place may appear in several packages of one guide. */
  placeIds: string[];
};

export type TourPackagesResult = {
  packages: TourPackage[];
  /**
   * Set only when the package service itself failed — e.g. the deployed backend
   * answers 503 because the package tables have not been migrated yet, or the
   * request never reached it.
   *
   * Deliberately *not* a boolean and deliberately `null` for a guide who simply
   * has no packages: "no packages yet" and "packages cannot be loaded" are
   * different states, and collapsing them into one flag is what made an empty
   * account look like a broken service.
   */
  error: string | null;
};

/* -------------------------------------------------------------------------- */
/*  Services (hotels / restaurants / guide listings)                          */
/* -------------------------------------------------------------------------- */

export type FoodCategory = "PUREVEG" | "NONVEG" | "VEG_AND_NONVEG";

export const FOOD_CATEGORIES: { value: FoodCategory; label: string }[] = [
  { value: "PUREVEG", label: "Pure veg" },
  { value: "NONVEG", label: "Non veg" },
  { value: "VEG_AND_NONVEG", label: "Veg & non-veg" },
];

export type HotelRecord = {
  id: string;
  name: string;
  address: string;
  profile_logo: string;
  districtId: string;
  description: string | null;
  rating: number;
  review: string[];
  cost_per_night: number;
  images: string[];
  latitude: number;
  longitude: number;
  phone_number: string | null;
  whatsapp_number: string | null;
  email: string | null;
  website: string | null;
  booking_enabled: boolean;
  status: ListingStatus;
  hotelOwnerId: string;
  createdAt: string;
  updatedAt: string;
  district?: DistrictRef | null;
};

export type RestaurantRecord = {
  id: string;
  name: string;
  address: string;
  profile_logo: string;
  districtId: string;
  description: string | null;
  rating: number;
  review: string[];
  menu: string[];
  food_category: FoodCategory;
  images: string[];
  latitude: number;
  longitude: number;
  phone_number: string | null;
  whatsapp_number: string | null;
  email: string | null;
  website: string | null;
  booking_enabled: boolean;
  status: ListingStatus;
  restaurentOwnerId: string;
  createdAt: string;
  updatedAt: string;
  district?: DistrictRef | null;
};

export type DistrictRef = {
  id: string;
  name: string;
  state?: { id: string; name: string; country?: { id: string; name: string } } | null;
};

export type ManagedRecord = HotelRecord | RestaurantRecord;

/** A single row in the "My services" list, for every provider kind. */
export type ProviderListing = {
  id: string;
  kind: ServiceKind;
  name: string;
  /** Secondary line: district for venues, place coverage for guides. */
  subtitle: string;
  placeNames: string[];
  image: string | null;
  status: ListingStatus | null;
  /** `booking_enabled` for venues. Guides are always active unless reported. */
  active: boolean;
  rating: number | null;
  reviews: string[];
  price: number | null;
  priceUnit: string;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  /** Only hotel / restaurant listings can be created, edited or deleted. */
  editable: boolean;
  /** Untouched backend payload, present only for editable listings. */
  record: ManagedRecord | null;
};

export type ProviderListingInput = {
  name: string;
  address: string;
  profileLogo: string;
  districtId: string;
  description: string;
  rating: number;
  costPerNight: number;
  latitude: number;
  longitude: number;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  bookingEnabled: boolean;
  /** Existing gallery URLs. Never cleared by an edit, so they are round-tripped. */
  images: string[];
  /** Restaurant only. */
  foodCategory: FoodCategory;
  menu: string[];
};

/* -------------------------------------------------------------------------- */
/*  Requests (bookings / reservations)                                        */
/* -------------------------------------------------------------------------- */

export type ProviderRequest = {
  id: string;
  kind: ProviderRequestKind;
  listingId: string;
  listingName: string;
  listingImage: string | null;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    photo: string | null;
  };
  status: RequestStatus;
  /** Check-in / reservation / booking date. */
  date: string;
  /** Hotel check-out, otherwise null. */
  endDate: string | null;
  time: string | null;
  guests: number | null;
  rooms: number | null;
  amount: number | null;
  places: { id: string; name: string }[];
  createdAt: string;
};

/** Backend-derived statistics for the dashboard. */
export type ProviderStats = {
  totalRequests: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  rejected: number;
  listingCount: number;
  activeListingCount: number;
  /** Confirmed + completed hotel booking value, or null when not applicable. */
  earnings: number | null;
};

export type ProviderDashboard = {
  stats: ProviderStats;
  recentRequests: ProviderRequest[];
  needsAction: ProviderRequest[];
};

export type ProviderListingsResult = {
  listings: ProviderListing[];
  /**
   * True when the deployed backend cannot serve the owner-scoped listing route
   * yet, so only publicly approved listings could be shown. Surfaced in the UI
   * as an explicit notice instead of silently hiding pending listings.
   */
  partial: boolean;
};
