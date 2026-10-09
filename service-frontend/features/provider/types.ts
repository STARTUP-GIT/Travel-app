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

/**
 * The one place a specific guide is linked to, as the profile API returns it.
 *
 * `placeid` on its own is an opaque uuid the UI cannot render, so the backend
 * reads the relation and the profile shows the place's actual name. `status` is
 * carried through because a guide whose place is still awaiting review needs to
 * see that it is not live yet, which is otherwise indistinguishable from a
 * place that has been rejected.
 */
export type ProviderLinkedPlace = {
  id: string;
  name: string;
  category: string;
  images: string[];
  entryfee: number | null;
  status: ListingStatus;
  district: { id: string; name: string; slug: string } | null;
};

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

export type ProviderKind =(typeof PROVIDER_KINDS)[number];

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
  /**
   * Common guides only: the agency the guide trades as.
   *
   * Empty for a guide with no agency and for every specific guide, which is the
   * signal the UI uses to hide the agency entirely rather than show an empty
   * field. A single optional profile field, so a new guide who leaves it blank is
   * exactly as valid as one who fills it in.
   */
  agencyName: string;
  agencyAddress?: string | null;
  agencyBanner?: string | null;
  placeIds: string[];
  linkedPlace: ProviderLinkedPlace | null;
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
  agencyName?: string;
  agencyAddress?: string;
  agencyBanner?: string;
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
export type PricingMode = "WHOLE_TOUR" | "PLACE_BASED";
export type PricingUnit = "PER_TOUR" | "PER_PERSON";

export type PackagePlace = {
  id: string;
  name: string;
  description: string | null;
  images: string[];
  category: string;
  entryfee: number | null;
  price?: number | null;
  pricing?: {
    id: string;
    visitor: PlaceVisitor;
    ageGroup: string;
    amount: number;
  }[];
  district: { id: string; name: string } | null;
};

/** One named tour: the guide's own package record, with its places flattened in. */
export type TourPackage = {
  id: string;
  name: string;
  description: string | null;
  pricingMode: PricingMode;
  pricingUnit: PricingUnit;
  price: number;
  allowCustomerPlaceSelection: boolean;
  cancellationPolicy: string | null;
  foodStatus: string;
  foodDetails: string | null;
  transportStatus: string;
  transportDetails: string | null;
  entryFeeStatus: string;
  entryFeeDetails: string | null;
  additionalCostsDetails: string | null;
  tripStartTime: string | null;
  pickupName: string | null;
  pickupAddress: string | null;
  pickupLat: number | null;
  pickupLng: number | null;
  pickupMapsUrl: string | null;
  places: PackagePlace[];
  createdAt: string;
  updatedAt: string;
};

export type TourPackageInput = {
  name: string;
  description: string;
  pricingMode: PricingMode;
  pricingUnit: PricingUnit;
  price: number;
  allowCustomerPlaceSelection?: boolean;
  cancellationPolicy?: string;
  foodStatus?: string;
  foodDetails?: string;
  transportStatus?: string;
  transportDetails?: string;
  entryFeeStatus?: string;
  entryFeeDetails?: string;
  additionalCostsDetails?: string;
  tripStartTime?: string;
  pickupName?: string;
  pickupAddress?: string;
  pickupLat?: number;
  pickupLng?: number;
  pickupMapsUrl?: string;
  placeIds: string[];
  placePrices?: Record<string, number>;
};

/**
 * Who a ticket price applies to.
 *
 * Mirrors the backend `placeVisitorType` enum, so the two UIs cannot drift into
 * different spellings of the same value.
 */
export type PlaceVisitor = "DOMESTIC" | "FOREIGN";

/**
 * One ticket band: an amount for a given age group and visitor type.
 *
 * `ageGroup` is free text rather than an enum because the bands a real attraction
 * uses differ per place (Adult / Child / Senior Citizen / Student / Infant …),
 * and the same band may legitimately differ for domestic and foreign visitors.
 * The backend enforces that one band is not listed twice for the same visitor
 * type.
 */
export type PlacePricingBand = {
  visitor: PlaceVisitor;
  ageGroup: string;
  amount: number;
};

/**
 * A place a guide can offer in a tour package.
 *
 * The approved places of a district, plus the guide's own places that are still
 * awaiting review — a guide is allowed to build a package from a place they just
 * created, so the backend offers it to them and to nobody else. `status` is what
 * lets the picker say so rather than presenting an unapproved place as live.
 */
export type ManageablePlace = {
  id: string;
  name: string;
  images: string[];
  category: string;
  entryfee: number | null;
  status: ListingStatus;
  district: { id: string; name: string } | null;
};

/** Everything the existing place form collects, plus the ticket bands. */
export type PlaceSubmissionInput = {
  name: string;
  description: string;
  districtId: string;
  images: string[];
  /**
   * The single flat price, kept because most places charge one amount. Left null
   * for a free place; ignored by the customer when bands are supplied, which are
   * then the only prices shown.
   */
  entryfee: number | null;
  category: string;
  latitude: number;
  longitude: number;
  /**
   * Optional. An empty list means the place has one flat price (or is free), which
   * is exactly how every place without bands already reads.
   */
  pricing?: PlacePricingBand[];
};

export type TourPackagesResult = {  packages: TourPackage[];
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
