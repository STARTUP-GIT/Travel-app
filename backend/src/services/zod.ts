import  z from "zod"; 
import { Food_Category } from "../generated/client/enums.js"; 
 
export const usersignupSchema = z.object({ 
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
  fullname: z.string().min(1),
  phonenumber:z.string().min(10).max(15),
  provider: z.enum(["google", "email"])
});



export const usersigninSchema = z.object({
  email: z.string().email(),
  username: z.string().optional(),
  password: z.string().min(6),
});

export const specific_guide_signupSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
  fullname: z.string().min(1),
  phonenumber: z.string().min(10).max(15),
  provider: z.enum(["google", "email"]),
  profile_pic: z.string().optional(),
  placeid: z.string().min(2).nullish(),
  experience: z.number().int().nonnegative(),
  cost: z.number().int().nonnegative(),
  language: z.array(z.string().min(1)).min(1),
});
export const specific_guide_signinSchema = z.object({
  email: z.string().min(1, "Email or username is required"),
  username: z.string().optional(),
  password: z.string().min(1, "Password is required"),
});
export const common_guide_signupSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
  fullname: z.string().min(1),
  phonenumber: z.string().min(10).max(15),
  provider: z.enum(["google", "email"]),
  profile_pic: z.string().optional(),
  placeid: z.array(z.string().min(2)).default([]),
  experience: z.number().int().nonnegative(),
  cost: z.number().int().nonnegative(),
  language: z.array(z.string().min(1)).min(1),
});
export const common_guide_signinSchema = z.object({
  email: z.string().min(1, "Email or username is required"),
  username: z.string().optional(),
  password: z.string().min(1, "Password is required"),
});

export const adminSignupSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
  fullname: z.string().min(1),
});

export const adminSigninSchema = z.object({
  email: z.string().email(),
  username: z.string().optional(),
  password: z.string().min(6),
});

export const adminGoogleSignupSchema = z.object({
  email: z.string().email(),
  fullname: z.string().min(1),
  profilepic: z.string().optional(),
});

export const adminGoogleSigninSchema = z.object({
  email: z.string().email(),
});

export const userProfileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  phonenumber: z.string().min(7).max(20).or(z.literal("")).optional(),
  profilepic: z.string().optional(),
  password: z.string().min(6).optional(),
});

export const adminProfileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  profilepic: z.string().optional(),
  password: z.string().min(6).optional(),
});

export const specificGuideProfileUpdateSchema = z.object({
  full_name: z.string().min(1).optional(),
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  phonenumber: z.string().min(10).max(15).optional(),
  profile_pic: z.string().optional(),
  tagline: z.string().optional(),
  description: z.string().optional(),
  experience: z.number().int().nonnegative().optional(),
  cost: z.number().int().nonnegative().optional(),
  language: z.array(z.string().min(1)).optional(),
  canPurchaseEntryTickets: z.boolean().optional(),
  ticketPurchasingConditions: z.string().nullable().optional(),
  password: z.string().min(6).optional(),
});

export const commonGuideProfileUpdateSchema = z.object({
  full_name: z.string().min(1).optional(),
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  phonenumber: z.string().min(10).max(15).optional(),
  profile_pic: z.string().optional(),
  tagline: z.string().optional(),
  agency_name: z.string().max(120).optional(),
  agency_address: z.string().max(300).optional(),
  agency_banner: z.string().optional(),
  agency_maps_url: z.string().optional(),
  description: z.string().optional(),
  experience: z.number().int().nonnegative().optional(),
  cost: z.number().int().nonnegative().optional(),
  language: z.array(z.string().min(1)).optional(),
  password: z.string().min(6).optional(),
});

/**
 * A Common Guide tour package: a name, an optional pitch and at least one place.
 *
 * The place list is the package's own membership, and the guide itself is taken
 * from the signed-in session — never from the body, so a guide can only ever
 * write to their own packages.
 *
 * An empty list is rejected rather than allowed: a package with no places has
 * nothing for a customer to see or book, because packages are discovered
 * through the places they contain. (A guide with no packages at all is fine —
 * `placeIds` is only required when a package is actually being saved.)
 */
export const commonGuidePackageSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(1000).nullish(),
  duration: z.string().trim().max(100).nullish(),
  maxGroupSize: z.number().int().positive().max(500).nullish().default(10),
  packageImages: z.array(z.string()).default([]),
  pricingMode: z.enum(["WHOLE_TOUR", "PLACE_BASED"]).default("WHOLE_TOUR"),
  pricingUnit: z.enum(["PER_TOUR", "PER_PERSON"]).default("PER_TOUR"),
  price: z.number().nonnegative().default(0),
  allowCustomerPlaceSelection: z.boolean().default(true),
  cancellationPolicy: z.string().nullable().optional(),
  foodStatus: z.string().default("EXCLUDED"),
  foodDetails: z.string().nullable().optional(),
  mealsService: z.enum(["INCLUDED", "ON_REQUEST", "NO_SERVICE"]).default("NO_SERVICE"),
  includedMeals: z.array(z.string()).default([]),
  mealDetails: z.string().nullable().optional(),
  transportStatus: z.string().default("EXCLUDED"),
  transportDetails: z.string().nullable().optional(),
  transportService: z.enum(["INCLUDED", "NO_SERVICE"]).default("NO_SERVICE"),
  transportVehicles: z.any().optional(),
  entryFeeStatus: z.enum(["INCLUDED", "EXCLUDED"]).default("EXCLUDED"),
  entryFeeDetails: z.string().nullable().optional(),
  additionalCostsDetails: z.string().nullable().optional(),
  hasSpecificGuide: z.boolean().default(false),
  specificGuideId: z.string().nullish(),
  childrenAllowed: z.boolean().default(true),
  childMaxAge: z.number().int().min(1, "Child maximum age must be at least 1 year").max(12, "Child maximum age cannot exceed 12 years").nullish().default(11),
  maxChildren: z.number().int().nonnegative().nullish(),
  childrenCountTowardCapacity: z.boolean().default(true),
  childPrice: z.number().nonnegative().nullish(),
  childDiscountType: z.enum(["NO_DISCOUNT", "PERCENTAGE", "FREE"]).default("NO_DISCOUNT"),
  childDiscountPercent: z.number().min(1, "Discount percentage must be at least 1%").max(99, "Discount percentage cannot exceed 99%").nullable().optional(),
  childConditions: z.string().nullable().optional(),
  tripStartTime: z.string().nullable().optional(),
  pickupName: z.string().nullable().optional(),
  pickupAddress: z.string().nullable().optional(),
  pickupLat: z.number().nullable().optional(),
  pickupLng: z.number().nullable().optional(),
  pickupMapsUrl: z.string().nullable().optional(),
  placeIds: z
    .array(z.string().min(1))
    .min(1, "A package needs at least one place")
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "A place can only be added to a package once",
    }),
  placePrices: z.record(z.string(), z.number().nonnegative()).optional(),
  placeItinerary: z.array(
    z.object({
      placeId: z.string().min(1),
      itineraryOrder: z.number().int().default(1),
      visitArrangement: z.enum(["GUIDED", "DROP_OFF"]).default("GUIDED"),
      expectedDuration: z.string().nullable().optional(),
      entryFeeStatus: z.enum(["INCLUDED", "EXCLUDED"]).default("EXCLUDED"),
      entryFeeAmount: z.number().nonnegative().nullable().optional(),
    })
  ).optional(),
});

export const commonGuidePackageUpdateSchema = commonGuidePackageSchema;

export const hotelOwnerProfileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  phone_number: z.string().min(10).max(15).optional(),
  profile_pic: z.string().optional(),
  password: z.string().min(6).optional(),
});

export const restaurentOwnerProfileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  phone_number: z.string().min(10).max(15).optional(),
  profile_pic: z.string().optional(),
  password: z.string().min(6).optional(),
});

export const userGoogleSignupSchema = z.object({
  email: z.string().email(),
  fullname: z.string().min(1),
  profilepic: z.string().optional(),
});

export const specificGuideGoogleSignupSchema = z.object({
  email: z.string().email(),
  fullname: z.string().min(1),
  profilepic: z.string().optional(),
  phonenumber: z.string().optional(),
  placeid: z.string().min(2).nullish(),
  experience: z.number().int().nonnegative().optional(),
  cost: z.number().int().nonnegative().optional(),
  language: z.array(z.string().min(1)).optional(),
});

export const commonGuideGoogleSignupSchema = z.object({
  email: z.string().email(),
  fullname: z.string().min(1),
  profilepic: z.string().optional(),
  phonenumber: z.string().optional(),
  placeid: z.array(z.string().min(2)).default([]),
  experience: z.number().int().nonnegative().optional(),
  cost: z.number().int().nonnegative().optional(),
  language: z.array(z.string().min(1)).optional(),
});

export const googleSigninSchema = z.object({
  email: z.string().email(),
});

export const countryServiceToggleSchema = z.object({
  isServiceAvailable: z.boolean(),
});

export const stateServiceToggleSchema = z.object({
  isServiceAvailable: z.boolean(),
});

export const districtServiceToggleSchema = z.object({
  isServiceAvailable: z.boolean(),
});

export const addPlaceSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  districtId: z.string().min(1),
  images: z.array(z.string()),
  entryfee: z.number().nonnegative(),
  category: z.string().min(1),
  latitude: z.number(),
  longitude: z.number(),
});

export const userGoogleSigninSchema = z.object({
  email: z.string().email(),
});

export const specific_guide_googleSigninSchema = z.object({
  email: z.string().email(),
});

export const common_guide_googleSigninSchema = z.object({
  email: z.string().email(),
});

export const hotelOwnerSignupSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  phone_number: z.string().min(10).max(15),
  profile_pic: z.string().optional(),
});

export const restaurentOwnerSignupSchema = z.object({
  name: z.string().min(1),
  username: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
  phone_number: z.string().min(10).max(15),
  profile_pic: z.string().optional(),
});

export const ownerSigninSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const hotelRoomTypeAdditionalServiceSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["INCLUDED", "EXTRA_CHARGE", "UNAVAILABLE"]),
  price: z.number().nonnegative().optional(),
  priceBasis: z.string().optional(),
  description: z.string().optional(),
});

export const hotelRoomTypeInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Room type title is required"),
  description: z.string().min(1, "Room description is required"),
  category: z.string().optional(),
  roomType: z.enum(["AC", "NON_AC"]),
  maxOccupancy: z.number().int().positive("Maximum occupancy must be at least 1 guest"),
  availableRooms: z.number().int().nonnegative("Available rooms cannot be negative"),
  pricePerNight: z.number().nonnegative("Price per night must be non-negative"),
  roomOverviewPhoto: z.string().min(1, "Room overview photo is required"),
  bathroomPhoto: z.string().min(1, "Bathroom photo is required"),
  images: z.array(z.string()).optional(),
  hasHotWater: z.boolean().default(true),
  hotWaterCharge: z.number().nonnegative().nullable().optional(),
  hasTv: z.boolean().default(true),
  hasAttachedBathroom: z.boolean().default(true),
  hasWifi: z.boolean().default(true),
  facilities: z.array(z.string()).optional(),
  additionalServices: z.array(hotelRoomTypeAdditionalServiceSchema).optional(),
  conditions: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
});

export const hotelCreateSchema = z.object({
  name: z.string().min(1, "Hotel name is required"),
  address: z.string().min(1, "Address is required"),
  profile_logo: z.string().min(1, "Cover photo is required"),
  districtId: z.string().min(1, "District is required"),
  stateId: z.string().optional(),
  description: z.string().nullable().optional(),
  rating: z.number().min(0).max(5).optional().default(0),
  review: z.array(z.string()).optional(),
  cost_per_night: z.number().int().nonnegative().optional().default(0),
  images: z.array(z.string()).optional(),
  latitude: z.number().optional().default(0),
  longitude: z.number().optional().default(0),
  phone_number: z.string().optional(),
  whatsapp_number: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  booking_enabled: z.boolean().optional(),
  star_rating: z.number().int().min(1).max(5).nullable().optional(),
  maps_url: z.string().nullable().optional(),
  check_in_time_type: z.enum(["SPECIFIC", "RANGE", "FLEXIBLE"]).nullable().optional(),
  check_in_time: z.string().nullable().optional(),
  check_in_start_time: z.string().nullable().optional(),
  check_in_end_time: z.string().nullable().optional(),
  check_out_time_type: z.enum(["SPECIFIC", "RANGE", "FLEXIBLE"]).nullable().optional(),
  check_out_time: z.string().nullable().optional(),
  check_out_start_time: z.string().nullable().optional(),
  check_out_end_time: z.string().nullable().optional(),
  roomTypes: z.array(hotelRoomTypeInputSchema).optional(),
});

export const hotelUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  profile_logo: z.string().min(1).optional(),
  districtId: z.string().min(1).optional(),
  stateId: z.string().optional(),
  description: z.string().nullable().optional(),
  rating: z.number().min(0).max(5).optional(),
  review: z.array(z.string()).optional(),
  cost_per_night: z.number().int().nonnegative().optional(),
  images: z.array(z.string()).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  phone_number: z.string().optional(),
  whatsapp_number: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  booking_enabled: z.boolean().optional(),
  star_rating: z.number().int().min(1).max(5).nullable().optional(),
  maps_url: z.string().nullable().optional(),
  check_in_time_type: z.enum(["SPECIFIC", "RANGE", "FLEXIBLE"]).nullable().optional(),
  check_in_time: z.string().nullable().optional(),
  check_in_start_time: z.string().nullable().optional(),
  check_in_end_time: z.string().nullable().optional(),
  check_out_time_type: z.enum(["SPECIFIC", "RANGE", "FLEXIBLE"]).nullable().optional(),
  check_out_time: z.string().nullable().optional(),
  check_out_start_time: z.string().nullable().optional(),
  check_out_end_time: z.string().nullable().optional(),
  roomTypes: z.array(hotelRoomTypeInputSchema).optional(),
});

export const restaurantDishInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Dish name is required"),
  description: z.string().nullable().optional(),
  foodCategory: z.nativeEnum(Food_Category).default(Food_Category.VEG_AND_NONVEG),
  price: z.number().nonnegative().nullable().optional(),
  image: z.string().nullable().optional(),
  isAvailable: z.boolean().default(true),
  displayOrder: z.number().int().optional(),
});

export const restaurantBranchInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Branch name is required"),
  address: z.string().min(1, "Address is required"),
  districtId: z.string().min(1, "District is required"),
  stateId: z.string().optional(),
  maps_url: z.string().nullable().optional(),
  latitude: z.number(),
  longitude: z.number(),
  phone_number: z.string().nullable().optional(),
  whatsapp_number: z.string().nullable().optional(),
  email: z.string().email().optional().or(z.literal("")),
  opening_time: z.string().nullable().optional(),
  closing_time: z.string().nullable().optional(),
  booking_enabled: z.boolean().default(true),
  profile_logo: z.string().optional(),
  images: z.array(z.string()).optional(),
});

export const restaurentCreateSchema = z.object({
  name: z.string().min(1, "Restaurant name is required"),
  address: z.string().min(1, "Address is required"),
  profile_logo: z.string().min(1, "Cover photo is required"),
  districtId: z.string().min(1, "District is required"),
  stateId: z.string().optional(),
  description: z.string().nullable().optional(),
  rating: z.number().min(0).max(5).default(0),
  review: z.array(z.string()).optional(),
  menu: z.array(z.string()).optional(),
  food_category: z.nativeEnum(Food_Category).optional(),
  images: z.array(z.string()).optional(),
  latitude: z.number(),
  longitude: z.number(),
  phone_number: z.string().optional(),
  whatsapp_number: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  booking_enabled: z.boolean().optional(),
  maps_url: z.string().nullable().optional(),
  opening_time: z.string().nullable().optional(),
  closing_time: z.string().nullable().optional(),
  has_branches: z.boolean().optional(),
  branches: z.array(restaurantBranchInputSchema).optional(),
  dishes: z.array(restaurantDishInputSchema).optional(),
});

export const restaurentUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  profile_logo: z.string().min(1).optional(),
  districtId: z.string().min(1).optional(),
  stateId: z.string().optional(),
  description: z.string().nullable().optional(),
  rating: z.number().min(0).max(5).optional(),
  review: z.array(z.string()).optional(),
  menu: z.array(z.string()).optional(),
  food_category: z.nativeEnum(Food_Category).optional(),
  images: z.array(z.string()).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  phone_number: z.string().optional(),
  whatsapp_number: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  booking_enabled: z.boolean().optional(),
  maps_url: z.string().nullable().optional(),
  opening_time: z.string().nullable().optional(),
  closing_time: z.string().nullable().optional(),
  has_branches: z.boolean().optional(),
  branches: z.array(restaurantBranchInputSchema).optional(),
  dishes: z.array(restaurantDishInputSchema).optional(),
});

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  today.setDate(today.getDate() - 1);
  return today;
};

export const hotelBookingSchema = z.object({
  hotelId: z.string().min(1),
  roomTypeId: z.string().optional(),
  checkIn: z.coerce
    .date()
    .refine((date) => date >= startOfToday(), {
      message: "Check-in date must not be in the past",
    }),
  checkOut: z.coerce
    .date()
    .refine((date) => date > startOfToday(), {
      message: "Check-out date must not be in the past",
    }),
  guests: z.number().int().positive(),
  rooms: z.number().int().positive(),
  selectedAddOns: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const restaurantReservationSchema = z.object({
  restaurantId: z.string().min(1),
  reservationDate: z.coerce
    .date()
    .refine((date) => date >= startOfToday(), {
      message: "Reservation date must not be in the past",
    }),
  reservationTime: z.string().min(1, "Reservation time is required").optional(),
  guests: z.number().int().positive("Party size must be at least 1 person"),
  notes: z.string().optional(),
});

export const specificGuideBookingSchema = z.object({
  specificGuideId: z.string().min(1),
  bookingDate: z.coerce
    .date()
    .refine((date) => date >= startOfToday(), {
      message: "Booking date must not be in the past",
    }),
  bookingTime: z.string().min(1).optional(),
  numberOfPeople: z.number().int().positive().max(100).default(1),
  pickupName: z.string().optional(),
  pickupAddress: z.string().optional(),
  pickupMapsUrl: z.string().optional(),
  requestedPickupName: z.string().optional(),
  requestedPickupAddress: z.string().optional(),
  requestedPickupMapsUrl: z.string().optional(),
  requestTicketAssistance: z.boolean().optional(),
  notes: z.string().optional(),
});

export const commonGuideBookingSchema = z.object({
  commonGuideId: z.string().min(1),
  packageId: z.string().optional(),
  placeIds: z.array(z.string().min(1)).min(1),
  bookingDate: z.coerce
    .date()
    .refine((date) => date >= startOfToday(), {
      message: "Booking date must not be in the past",
    }),
  bookingTime: z.string().min(1).optional(),
  numberOfPeople: z.number().int().positive().max(100).default(1),
  numberOfAdults: z.number().int().positive().max(100).default(1),
  numberOfChildren: z.number().int().nonnegative().max(100).default(0),
  selectedAddons: z.record(z.string(), z.any()).optional(),
  tripStartTime: z.string().optional(),
  pickupName: z.string().optional(),
  pickupAddress: z.string().optional(),
  pickupLat: z.number().optional(),
  pickupLng: z.number().optional(),
  pickupMapsUrl: z.string().optional(),
  pickupRequestStatus: z.enum(["DEFAULT", "REQUESTED"]).default("DEFAULT"),
  requestedPickupName: z.string().optional(),
  requestedPickupAddress: z.string().optional(),
  requestedPickupMapsUrl: z.string().optional(),
  requestedPickupLat: z.number().optional(),
  requestedPickupLng: z.number().optional(),
  notes: z.string().optional(),
});

export const guideBookingStatusSchema = z.enum([
  "CONFIRMED",
  "ACCEPTED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
]);

export const bookingStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "REJECTED",
  "CANCELLED",
  "COMPLETED",
]);