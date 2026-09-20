import express from "express";
import { userauthMiddleware } from "../../../../middlewares/auth.midleware.js";
import {
  createHotelBooking,
  createRestaurantReservation,
  getUserHotelBookings,
  getUserRestaurantReservations,
} from "../controllers/booking.controller.js";

const router = express.Router();

router.post("/api/hotel-bookings", userauthMiddleware, createHotelBooking);
router.get("/api/hotel-bookings", userauthMiddleware, getUserHotelBookings);
router.post("/api/restaurant-reservations", userauthMiddleware, createRestaurantReservation);
router.get("/api/restaurant-reservations", userauthMiddleware, getUserRestaurantReservations);

export default router;