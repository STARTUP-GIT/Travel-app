import express from "express";
import { userauthMiddleware } from "../../../../middlewares/auth.midleware.js";
import {
  createHotelBooking,
  createRestaurantReservation,
  createSpecificGuideBooking,
  createCommonGuideBooking,
  getUserHotelBookings,
  getUserRestaurantReservations,
  getUserSpecificGuideBookings,
  getUserCommonGuideBookings,
} from "../controllers/booking.controller.js";

const router = express.Router();

router.post("/api/hotel-bookings", userauthMiddleware, createHotelBooking);
router.get("/api/hotel-bookings", userauthMiddleware, getUserHotelBookings);
router.post("/api/restaurant-reservations", userauthMiddleware, createRestaurantReservation);
router.get("/api/restaurant-reservations", userauthMiddleware, getUserRestaurantReservations);
router.post("/api/specific-guide-bookings", userauthMiddleware, createSpecificGuideBooking);
router.get("/api/specific-guide-bookings", userauthMiddleware, getUserSpecificGuideBookings);
router.post("/api/common-guide-bookings", userauthMiddleware, createCommonGuideBooking);
router.get("/api/common-guide-bookings", userauthMiddleware, getUserCommonGuideBookings);

export default router;