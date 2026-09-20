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
  placeid: z.string().min(2),
  experience: z.number().int().nonnegative(),
  cost: z.number().int().nonnegative(),
  language: z.array(z.string().min(1)).min(1),
});
export const specific_guide_signinSchema = z.object({
  email: z.string().email(),
  username: z.string().optional(),
  password: z.string().min(6),
});
export const common_guide_signupSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(6),
  fullname: z.string().min(1),
  phonenumber: z.string().min(10).max(15),
  provider: z.enum(["google", "email"]),
  profile_pic: z.string().optional(),
  placeid: z.array(z.string().min(2)).min(1),
  experience: z.number().int().nonnegative(),
  cost: z.number().int().nonnegative(),
  language: z.array(z.string().min(1)).min(1),
});
export const common_guide_signinSchema = z.object({
  email: z.string().email(),
  username: z.string().optional(),
  password: z.string().min(6),
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

export const userProfileUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
  phonenumber: z.string().min(10).max(15).optional(),
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
  password: z.string().min(6).optional(),
});

export const commonGuideProfileUpdateSchema = z.object({
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
  password: z.string().min(6).optional(),
});

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
  placeid: z.string().min(2),
  experience: z.number().int().nonnegative().optional(),
  cost: z.number().int().nonnegative().optional(),
  language: z.array(z.string().min(1)).optional(),
});

export const commonGuideGoogleSignupSchema = z.object({
  email: z.string().email(),
  fullname: z.string().min(1),
  profilepic: z.string().optional(),
  phonenumber: z.string().optional(),
  placeid: z.array(z.string().min(2)).min(1),
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

export const hotelCreateSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  profile_logo: z.string().min(1),
  districtId: z.string().min(1),
  description: z.string().nullable().optional(),
  rating: z.number().min(0).max(5),
  review: z.array(z.string()).optional(),
  cost_per_night: z.number().int().nonnegative(),
  images: z.array(z.string()).optional(),
  latitude: z.number(),
  longitude: z.number(),
  phone_number: z.string().optional(),
  whatsapp_number: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  booking_enabled: z.boolean().optional(),
});

export const hotelUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  profile_logo: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  rating: z.number().min(0).max(5).optional(),
  review: z.array(z.string()).optional(),
  cost_per_night: z.number().int().nonnegative().optional(),
  images: z.array(z.string()).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  phone_number: z.string().optional(),
  whatsapp_number: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  booking_enabled: z.boolean().optional(),
});

export const restaurentCreateSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  profile_logo: z.string().min(1),
  districtId: z.string().min(1),
  description: z.string().nullable().optional(),
  rating: z.number().min(0).max(5),
  review: z.array(z.string()).optional(),
  menu: z.array(z.string()).optional(),
  food_category: z.nativeEnum(Food_Category).optional(),
  images: z.array(z.string()).optional(),
  latitude: z.number(),
  longitude: z.number(),
  phone_number: z.string().optional(),
  whatsapp_number: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  booking_enabled: z.boolean().optional(),
});

export const restaurentUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  profile_logo: z.string().min(1).optional(),
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
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  booking_enabled: z.boolean().optional(),
});

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

export const hotelBookingSchema = z.object({
  hotelId: z.string().min(1),
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
});

export const restaurantReservationSchema = z.object({
  restaurantId: z.string().min(1),
  reservationDate: z.coerce
    .date()
    .refine((date) => date >= startOfToday(), {
      message: "Reservation date must not be in the past",
    }),
  guests: z.number().int().positive(),
});

export const bookingStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
]);