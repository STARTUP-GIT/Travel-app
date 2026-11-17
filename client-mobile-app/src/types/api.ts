/**
 * API types for the customer mobile app.
 *
 * These mirror the shapes the existing Express backend actually returns — the
 * same responses the customer web frontend consumes. Nothing here is invented
 * for the mobile client's convenience: a field exists because the backend sends
 * it, and the response envelope quirks (bare arrays, `{states}` wrappers,
 * `{success}` on uploads) are handled in the API layer, not papered over with
 * optimistic typing.
 */

/* -------------------------------------------------------------------------- */
/* Shared                                                                     */
/* -------------------------------------------------------------------------- */

/** Mirrors the backend `placeSubmissionStatus` enum. */
export type ContentStatus = "PENDING" | "APPROVED" | "REJECTED";

/** Mirrors the backend `placeVisitorType` enum. */
export type VisitorType = "DOMESTIC" | "FOREIGN";

export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "REJECTED"
  | "CANCELLED"
  | "COMPLETED";

export type AuthProvider = "GOOGLE" | "EMAIL";

/* -------------------------------------------------------------------------- */
/* Location                                                                   */
/* -------------------------------------------------------------------------- */

export type Country = {
  id: string;
  name: string;
  isServiceAvailable: boolean;
};

export type State = {
  id: string;
  name: string;
  countryId: string;
  isServiceAvailable: boolean;
  /** Admin-selected hero image for the state, when one is set. */
  primaryImage?: string | null;
  country?: Country | null;
  _count?: { districts?: number } | null;
};

export type District = {
  id: string;
  name: string;
  stateId: string;
  isServiceAvailable: boolean;
  /** Backend flag: submissions here are published immediately. */
  autoApprovePlaces?: boolean;
  state?: State | null;
  /**
   * Note the backend's own spelling. `Restaurent` is the model name, so the
   * aggregate count key is `_count.restaurent` — renaming it here would make
   * the client read a field that does not exist.
   */
  _count?: { places?: number; hotels?: number; restaurent?: number } | null;
};

/* -------------------------------------------------------------------------- */
/* Guides                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A guide tied to exactly one place. The backend returns every scalar column of
 * `specific_guide` here, which unfortunately includes a `password` hash — the
 * client never reads it and never persists a whole guide object.
 */
export type SpecificGuide = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  phonenumber: string;
  profile_pic?: string | null;
  tagline?: string | null;
  rating?: number | null;
  review: string[];
  description?: string | null;
  /** The place this guide is allowed to work at. */
  placeid: string | null;
  isReported: boolean;
  experience: number;
  cost: number;
  language: string[];
  createdAt?: string;
  updatedAt?: string;
};

/**
 * A Tour Guide: can lead a tour across several places and can own packages.
 * The backend uses an explicit `select` for this one, so no password is present.
 */
export type TourGuide = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  phonenumber: string;
  profile_pic?: string | null;
  tagline?: string | null;
  /** Optional. Absent/null means the guide trades in their own name. */
  agencyName?: string | null;
  agencyAddress?: string | null;
  agencyBanner?: string | null;
  agencyMapsUrl?: string | null;
  rating?: number | null;
  review: string[];
  description?: string | null;
  isReported: boolean;
  experience: number;
  cost: number;
  language: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type GuideType = "specific" | "common";

/** `place.commonGuidePlaces[]` — a join row, not a guide. */
export type CommonGuidePlaceLink = {
  id: string;
  placeId: string;
  commonGuideId: string;
  commonGuide?: TourGuide | null;
};

/**
 * A tour package as it arrives on a place detail response.
 *
 * `placeCount` is the package's real size across every district, which is why a
 * package spanning several districts shows up with fewer resolved places here —
 * that difference is surfaced in the UI rather than hidden.
 */
export type TourPackageSummary = {
  id: string;
  name: string;
  description: string | null;
  commonGuideId: string;
  placeCount: number;
  duration?: string | null;
  maxGroupSize?: number | null;
  packageImages?: string[];
  pricingMode?: string;
  pricingUnit?: string;
  price?: number;
  allowCustomerPlaceSelection?: boolean;
  cancellationPolicy?: string | null;
  foodStatus?: string | null;
  foodDetails?: string | null;
  mealsService?: "INCLUDED" | "ON_REQUEST" | "NO_SERVICE" | string | null;
  includedMeals?: string[];
  mealDetails?: string | null;
  transportStatus?: string | null;
  transportDetails?: string | null;
  transportService?: "INCLUDED" | "ON_REQUEST" | "NO_SERVICE" | string | null;
  transportVehicles?: {
    type: string;
    vehicleType?: string;
    capacity: number;
    arrangement?: "PRIVATE" | "SHARED";
    isPrivate?: boolean;
    isShared?: boolean;
    includedChargeCategories?: string[];
    excludedChargeCategories?: string[];
    chargesIncluded?: string;
    chargesExcluded?: string;
    conditions?: string;
    pricePerDay?: number;
    status?: "AVAILABLE" | "ON_REQUEST" | string;
    otherIncludedChargeDetail?: string;
    otherExcludedChargeDetail?: string;
  }[] | null;
  entryFeeStatus?: string | null;
  entryFeeDetails?: string | null;
  additionalCostsDetails?: string | null;
  hasSpecificGuide?: boolean;
  specificGuideId?: string | null;
  specificGuide?: {
    id: string;
    name: string;
    username?: string;
    profilePic?: string | null;
    experienceYears?: number;
    pricePerDay?: number;
    languages: string[];
    specialties?: string[];
    rating?: number | null;
    tagline?: string | null;
    agencyName?: string | null;
  } | null;
  childrenAllowed?: boolean;
  childMaxAge?: number | null;
  maxChildren?: number | null;
  childrenCountTowardCapacity?: boolean;
  childPrice?: number | null;
  childDiscountType?: "NO_DISCOUNT" | "PERCENTAGE" | "FREE" | string | null;
  childDiscountPercent?: number | null;
  childConditions?: string | null;
  tripStartTime?: string | null;
  pickupName?: string | null;
  pickupAddress?: string | null;
  pickupMapsUrl?: string | null;
  createdAt: string;
  updatedAt: string;
};

/* -------------------------------------------------------------------------- */
/* Places                                                                     */
/* -------------------------------------------------------------------------- */

/** One ticket band: an amount for an age group and visitor type. */
export type PlacePricingBand = {
  id: string;
  visitor: VisitorType;
  /** Free text — the bands a real attraction uses differ per place. */
  ageGroup: string;
  amount: number;
};

export type Place = {
  id: string;
  name: string;
  description: string;
  districtId: string;
  images: string[];
  /** Flat price. Still the source of truth for a place with no bands. */
  entryfee: number | null;
  category: string;
  /**
   * Per-band prices. Empty or absent for every place created before bands
   * existed, so the UI must fall back to `entryfee` rather than read the empty
   * list as "free".
   */
  pricing?: PlacePricingBand[];
  status?: ContentStatus;
  latitude: number;
  longitude: number;
  createdAt: string;
  updatedAt: string;
  district?: District | null;
};

/** `GET /:districtId/services/api/places/:placeId` adds the guide relations. */
export type PlaceDetail = Place & {
  specificguide?: SpecificGuide[];
  commonGuidePlaces?: CommonGuidePlaceLink[];
  commonGuidePackages?: TourPackageSummary[];
};

/* -------------------------------------------------------------------------- */
/* Hotels                                                                     */
/* -------------------------------------------------------------------------- */

export type HotelRoomType = {
  id: string;
  hotelId: string;
  title: string;
  description: string;
  roomType: "AC" | "NON_AC";
  maxOccupancy: number;
  availableRooms: number;
  pricePerNight: number;
  roomOverviewPhoto?: string;
  bathroomPhoto?: string;
  images?: string[];
  hasHotWater?: boolean;
  hasTv?: boolean;
  hasWifi?: boolean;
  roomCategory?: string;
  pricingUnit?: string;
  isActive?: boolean;
};

export type Hotel = {
  id: string;
  name: string;
  address: string;
  profile_logo: string;
  districtId: string;
  description?: string | null;
  rating: number;
  review: string[];
  cost_per_night: number;
  images: string[];
  latitude: number;
  longitude: number;
  phone_number?: string | null;
  whatsapp_number?: string | null;
  email?: string | null;
  website?: string | null;
  booking_enabled: boolean;
  status?: ContentStatus;
  room_types?: HotelRoomType[];
  createdAt: string;
  updatedAt: string;
  district?: District | null;
};

/* -------------------------------------------------------------------------- */
/* Restaurants                                                                */
/* -------------------------------------------------------------------------- */

export type FoodCategory = "PUREVEG" | "NONVEG" | "VEG_AND_NONVEG";

export type Restaurent = {
  id: string;
  name: string;
  address: string;
  profile_logo: string;
  districtId: string;
  description?: string | null;
  rating: number;
  review: string[];
  menu: string[];
  food_category: FoodCategory;
  images: string[];
  latitude: number;
  longitude: number;
  phone_number?: string | null;
  whatsapp_number?: string | null;
  email?: string | null;
  website?: string | null;
  booking_enabled: boolean;
  status?: ContentStatus;
  createdAt: string;
  updatedAt: string;
  district?: District | null;
};

/* -------------------------------------------------------------------------- */
/* Profile                                                                    */
/* -------------------------------------------------------------------------- */

export type CustomerProfile = {
  id: string;
  name: string;
  username: string;
  email: string;
  phonenumber: string;
  profilepic?: string | null;
  authprovider?: AuthProvider | null;
  createdAt?: string;
  updatedAt?: string;
};

/* -------------------------------------------------------------------------- */
/* Bookings                                                                   */
/* -------------------------------------------------------------------------- */

export type HotelBooking = {
  id: string;
  hotelId: string;
  userId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  totalAmount: number;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  hotel: Hotel;
  roomType?: any | null;
  bookingSnapshot?: any | null;
  user?: BookingUser;
};

export type BookingUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  phonenumber?: string;
  profilepic?: string | null;
};

export type RestaurantReservation = {
  id: string;
  restaurantId: string;
  userId: string;
  reservationDate: string;
  reservationTime?: string | null;
  guests: number;
  notes?: string | null;
  reservationSnapshot?: any | null;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  /** Backend spells the relation `restaurent`, matching the model name. */
  restaurent: Restaurent;
  user?: BookingUser;
};

export type SpecificGuideBooking = {
  id: string;
  userId: string;
  specificGuideId: string;
  placeId: string;
  bookingDate: string;
  bookingTime?: string | null;
  tripStartTime?: string | null;
  numberOfPeople?: number;
  pickupName?: string | null;
  pickupAddress?: string | null;
  pickupMapsUrl?: string | null;
  requestedPickupName?: string | null;
  requestedPickupAddress?: string | null;
  requestedPickupMapsUrl?: string | null;
  totalPrice?: number;
  cancellationPolicy?: string | null;
  foodStatus?: string | null;
  foodDetails?: string | null;
  transportStatus?: string | null;
  transportDetails?: string | null;
  entryFeeStatus?: string | null;
  entryFeeDetails?: string | null;
  additionalCostsDetails?: string | null;
  paymentStatus?: string;
  requestTicketAssistance?: boolean;
  notes?: string | null;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  specificGuide: SpecificGuide;
  place: Place;
  user?: BookingUser;
};

export type CommonGuideBooking = {
  id: string;
  userId: string;
  commonGuideId: string;
  packageId?: string | null;
  package?: {
    id: string;
    name: string;
    description?: string | null;
    price?: number;
    pricingMode?: string;
    pricingUnit?: string;
  } | null;
  bookingDate: string;
  bookingTime?: string | null;
  tripStartTime?: string | null;
  numberOfPeople?: number;
  numberOfAdults?: number;
  numberOfChildren?: number;
  specificGuideId?: string | null;
  specificGuideStatus?: string | null;
  bookingSnapshot?: any | null;
  specificGuide?: SpecificGuide | null;
  pickupName?: string | null;
  pickupAddress?: string | null;
  pickupMapsUrl?: string | null;
  requestedPickupName?: string | null;
  requestedPickupAddress?: string | null;
  requestedPickupMapsUrl?: string | null;
  pricingMode?: string;
  pricingUnit?: string;
  totalPrice?: number;
  cancellationPolicy?: string | null;
  foodStatus?: string | null;
  foodDetails?: string | null;
  transportStatus?: string | null;
  transportDetails?: string | null;
  entryFeeStatus?: string | null;
  entryFeeDetails?: string | null;
  additionalCostsDetails?: string | null;
  paymentStatus?: string;
  notes?: string | null;
  status: BookingStatus;
  createdAt: string;
  updatedAt: string;
  commonGuide: TourGuide;
  user?: BookingUser;
  selectedPlaces: {
    id: string;
    placeId: string;
    place: Place;
  }[];
};

export type BookingDetailResponse =
  | { type: "common"; booking: CommonGuideBooking }
  | { type: "specific"; booking: SpecificGuideBooking }
  | { type: "hotel"; booking: HotelBooking }
  | { type: "restaurant"; booking: RestaurantReservation };

export type SpecificGuideLocationResult = {
  isSharing: boolean;
  latitude: number | null;
  longitude: number | null;
  updatedAt: string | null;
  isExpired?: boolean;
  guideName?: string;
};

/* -------------------------------------------------------------------------- */
/* Request payloads                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Credentials sign-up.
 *
 * `provider` is required by the backend's zod schema even for a local account,
 * and `phonenumber` is validated to 10–15 characters — so both are collected
 * up front rather than discovering the 400 afterwards.
 */
export type SignupInput = {
  email: string;
  username: string;
  password: string;
  fullname: string;
  phonenumber: string;
  provider: "email" | "google";
};

/** Sign-in accepts either an email or an optional username alongside a password. */
export type SigninInput = {
  email: string;
  username?: string;
  password: string;
};

/** Only the identity the backend needs; the token comes from the sign-in call. */
export type GoogleSignupInput = {
  email: string;
  fullname: string;
  profilepic?: string;
};

export type ForgotPasswordResult = {
  ok: boolean;
  message: string;
};

export type ResetPasswordResult = {
  ok: boolean;
  message: string;
};

export type CreateHotelBookingInput = {
  hotelId: string;
  roomTypeId?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  notes?: string;
};

export type CreateReservationInput = {
  restaurantId: string;
  reservationDate: string;
  reservationTime?: string;
  guests: number;
  notes?: string;
};

export type CreateSpecificGuideBookingInput = {
  specificGuideId: string;
  bookingDate: string;
  bookingTime?: string;
  numberOfPeople?: number;
  pickupName?: string;
  pickupAddress?: string;
  pickupMapsUrl?: string;
  requestedPickupName?: string;
  requestedPickupAddress?: string;
  requestedPickupMapsUrl?: string;
  requestTicketAssistance?: boolean;
  notes?: string;
};

export type CreateCommonGuideBookingInput = {
  commonGuideId: string;
  packageId?: string;
  placeIds: string[];
  bookingDate: string;
  bookingTime?: string;
  tripStartTime?: string;
  numberOfPeople?: number;
  numberOfAdults?: number;
  numberOfChildren?: number;
  pricingMode?: string;
  pricingUnit?: string;
  totalPrice?: number;
  pickupName?: string;
  pickupAddress?: string;
  pickupMapsUrl?: string;
  requestedPickupName?: string;
  requestedPickupAddress?: string;
  requestedPickupMapsUrl?: string;
  notes?: string;
};

export type UpdateProfileInput = {
  name?: string;
  username?: string;
  email?: string;
  phonenumber?: string;
  profilepic?: string;
};

/* -------------------------------------------------------------------------- */
/* App configuration (GET /api/settings)                                     */
/* -------------------------------------------------------------------------- */

export type AppConfig = {
  app_name: string;
  appName?: string;
  webTitle: string;
  icon: string;
  imageBanners: string[];
  heroImageUrl?: string;
  clientHeroImageUrl?: string;
  defaultDistrictHeroImageUrl?: string;
  showDistrictHeadingByDefault?: boolean;
  text: string;
  app_description: string;
  contacts: string;
  termsandconditions: string;
  privacy: string;
  brandName?: string;
  tagline?: string;
};