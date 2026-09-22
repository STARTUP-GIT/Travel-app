import { Router } from "express";
import { adminAuthMiddleware } from "../../middlewares/auth.midleware.js";
import {
  getDashboardStats,
  getAppSettings,
  updateAppSettings,
  listStates,
  getStateById,
  updateState,
  listDistricts,
  getDistrictById,
  updateDistrict,
  listPlaces,
  getPlaceById,
  listPlaceSubmissions,
  listUsers,
  getUserById,
  listSpecificGuides,
  getSpecificGuideById,
  listCommonGuides,
  getCommonGuideById,
  listHotels,
  getHotelById,
  listRestaurants,
  getRestaurantById,
  listHotelOwners,
  listRestaurantOwners,
  listGuideBookings,
  updateGuideBookingStatus,
  listHotelBookings,
  updateHotelBookingStatus,
  listReservations,
  updateReservationStatus,
  listTestimonials,
} from "../controllers/admin.controller.js";

/**
 * Admin configuration/management endpoints. These back the admin panel and
 * read/write EXISTING schema models only. Every route is protected by the
 * existing adminAuthMiddleware.
 */
const router = Router();

router.use(adminAuthMiddleware);

router.get("/stats", getDashboardStats);

router.get("/settings", getAppSettings);
router.patch("/settings", updateAppSettings);

router.get("/states", listStates);
router.get("/states/:id", getStateById);
router.patch("/states/:id", updateState);

router.get("/districts", listDistricts);
router.get("/districts/:id", getDistrictById);
router.patch("/districts/:id", updateDistrict);

router.get("/places", listPlaces);
router.get("/places/:id", getPlaceById);

router.get("/place-submissions", listPlaceSubmissions);

router.get("/users", listUsers);
router.get("/users/:id", getUserById);

router.get("/guides/specific", listSpecificGuides);
router.get("/guides/specific/:id", getSpecificGuideById);
router.get("/guides/common", listCommonGuides);
router.get("/guides/common/:id", getCommonGuideById);

router.get("/hotels", listHotels);
router.get("/hotels/:id", getHotelById);

router.get("/restaurants", listRestaurants);
router.get("/restaurants/:id", getRestaurantById);

router.get("/hotel-owners", listHotelOwners);
router.get("/restaurant-owners", listRestaurantOwners);

router.get("/bookings/guides", listGuideBookings);
router.patch("/bookings/guides/:kind/:id/status", updateGuideBookingStatus);
router.get("/bookings/hotels", listHotelBookings);
router.patch("/bookings/hotels/:id/status", updateHotelBookingStatus);
router.get("/bookings/reservations", listReservations);
router.patch("/bookings/reservations/:id/status", updateReservationStatus);

router.get("/testimonials", listTestimonials);

export default router;