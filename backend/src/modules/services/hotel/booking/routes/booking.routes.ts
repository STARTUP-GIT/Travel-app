import express from "express";
import { hotelOwnerAuthMiddleware } from "../../../../../middlewares/auth.midleware.js";
import {
  getOwnerBookingById,
  getOwnerBookings,
  updateBookingStatus,
} from "../controllers/booking.controllers.js";

const router = express.Router();

router.get("/api/owner/", hotelOwnerAuthMiddleware, getOwnerBookings);
router.get("/api/owner/:bookingId", hotelOwnerAuthMiddleware, getOwnerBookingById);
router.patch("/api/:bookingId/status", hotelOwnerAuthMiddleware, updateBookingStatus);

export default router;