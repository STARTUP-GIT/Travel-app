import { Router } from "express";
import { adminAuthMiddleware } from "../../middlewares/auth.midleware.js";
import {
  getDashboardStats,
  getAppSettings,
  updateAppSettings,
  listStates,
  getStateById,
  updateState,
  createState,
  deleteState,
  listDistricts,
  getDistrictById,
  updateDistrict,
  createDistrict,
  deleteDistrict,
  listPlaces,
  getPlaceById,
  createPlace,
  deletePlace,
  listPlaceSubmissions,
  listUsers,
  getUserById,
  deleteUser,
  listSpecificGuides,
  getSpecificGuideById,
  deleteSpecificGuide,
  listCommonGuides,
  getCommonGuideById,
  deleteCommonGuide,
  listHotels,
  getHotelById,
  createHotelAdmin,
  updateHotelAdmin,
  updateHotelStatus,
  deleteHotel,
  listRestaurants,
  getRestaurantById,
  createRestaurantAdmin,
  updateRestaurantAdmin,
  updateRestaurantStatus,
  deleteRestaurant,
  listHotelOwners,
  deleteHotelOwner,
  listRestaurantOwners,
  deleteRestaurantOwner,
  listGuideBookings,
  updateGuideBookingStatus,
  listHotelBookings,
  updateHotelBookingStatus,
  listReservations,
  updateReservationStatus,
  listTestimonials,
  deleteTestimonial,
  listCountries,
  createCountry,
  deleteCountry,
} from "../controllers/admin.controller.js";

/**
 * Admin configuration/management endpoints. These back the admin panel and
 * read/write EXISTING schema models only. Every route is protected by the
 * existing adminAuthMiddleware.
 */
const router = Router();

router.use(adminAuthMiddleware);

router.get("/stats", getDashboardStats);

router.get("/countries", listCountries);
router.post("/countries", createCountry);
router.delete("/countries/:id", deleteCountry);

router.get("/settings", getAppSettings);
router.patch("/settings", updateAppSettings);

router.get("/states", listStates);
router.get("/states/:id", getStateById);
router.post("/states", createState);
router.patch("/states/:id", updateState);
router.delete("/states/:id", deleteState);

router.get("/districts", listDistricts);
router.get("/districts/:id", getDistrictById);
router.post("/districts", createDistrict);
router.patch("/districts/:id", updateDistrict);
router.delete("/districts/:id", deleteDistrict);

router.get("/places", listPlaces);
router.get("/places/:id", getPlaceById);
router.post("/places", createPlace);
router.delete("/places/:id", deletePlace);

router.get("/place-submissions", listPlaceSubmissions);

router.get("/users", listUsers);
router.get("/users/:id", getUserById);
router.delete("/users/:id", deleteUser);

router.get("/guides/specific", listSpecificGuides);
router.get("/guides/specific/:id", getSpecificGuideById);
router.delete("/guides/specific/:id", deleteSpecificGuide);
router.get("/guides/common", listCommonGuides);
router.get("/guides/common/:id", getCommonGuideById);
router.delete("/guides/common/:id", deleteCommonGuide);

router.get("/hotels", listHotels);
router.post("/hotels", createHotelAdmin);
router.get("/hotels/:id", getHotelById);
router.patch("/hotels/:id", updateHotelAdmin);
router.patch("/hotels/:id/status", updateHotelStatus);
router.delete("/hotels/:id", deleteHotel);

router.get("/restaurants", listRestaurants);
router.post("/restaurants", createRestaurantAdmin);
router.get("/restaurants/:id", getRestaurantById);
router.patch("/restaurants/:id", updateRestaurantAdmin);
router.patch("/restaurants/:id/status", updateRestaurantStatus);
router.delete("/restaurants/:id", deleteRestaurant);

router.get("/hotel-owners", listHotelOwners);
router.delete("/hotel-owners/:id", deleteHotelOwner);
router.get("/restaurant-owners", listRestaurantOwners);
router.delete("/restaurant-owners/:id", deleteRestaurantOwner);

router.get("/bookings/guides", listGuideBookings);
router.patch("/bookings/guides/:kind/:id/status", updateGuideBookingStatus);
router.get("/bookings/hotels", listHotelBookings);
router.patch("/bookings/hotels/:id/status", updateHotelBookingStatus);
router.get("/bookings/reservations", listReservations);
router.patch("/bookings/reservations/:id/status", updateReservationStatus);

router.get("/testimonials", listTestimonials);
router.delete("/testimonials/:id", deleteTestimonial);

export default router;