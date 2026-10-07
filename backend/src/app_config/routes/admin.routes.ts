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
  resolvePlaceLocation,
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
  updatePlaceStatus,
  updatePlace,
  updateGuideStatus,
  getAutoApproval,
  updateAutoApproval,
  listAdmins,
  updateAdminRole,
  suspendAdmin,
  restoreAdmin,
} from "../controllers/admin.controller.js";

import {
  getAdminClientSettings,
  getAdminServiceSettings,
  updateClientSettings,
  updateServiceSettings,
} from "../controllers/branding.controller.js";

import {
  listVersionConfigs,
  updateVersionConfig,
} from "../controllers/versionConfig.controller.js";

import { listAuditLogs } from "../controllers/auditLog.controller.js";

import {
  listSupportTickets,
  getSupportTicketById,
  createSupportTicket,
  updateSupportTicket,
  deleteSupportTicket,
} from "../controllers/supportTicket.controller.js";

import {
  listNotifications,
  sendNotification,
  deleteNotification,
} from "../controllers/notification.controller.js";

import {
  listCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from "../controllers/coupon.controller.js";

import {
  listSessions,
  revokeSession,
} from "../controllers/session.controller.js";

import {
  getReportSummary,
  getUsersReport,
  getBookingsReport,
} from "../controllers/reports.controller.js";

/**
 * Admin configuration/management endpoints. These back the admin panel and
 * read/write EXISTING schema models only. Every route is protected by the
 * existing adminAuthMiddleware.
 */
const router = Router();

router.use(adminAuthMiddleware);

// ── DASHBOARD ──
router.get("/stats", getDashboardStats);

// ── LEGACY SETTINGS (kept for backward compat — delegates to CLIENT scope) ──
router.get("/settings", getAppSettings);
router.patch("/settings", updateAppSettings);

// ── SCOPED BRANDING ──
router.get("/settings/client", getAdminClientSettings);
router.patch("/settings/client", updateClientSettings);
router.get("/settings/service", getAdminServiceSettings);
router.patch("/settings/service", updateServiceSettings);

// ── AUTO-APPROVAL ──
router.get("/auto-approval", getAutoApproval);
router.patch("/auto-approval", updateAutoApproval);

// ── COUNTRIES / STATES / DISTRICTS ──
router.get("/countries", listCountries);
router.post("/countries", createCountry);
router.delete("/countries/:id", deleteCountry);

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

// ── PLACES ──
router.get("/places", listPlaces);
router.post("/places/resolve-location", resolvePlaceLocation);
router.get("/places/:id", getPlaceById);
router.post("/places", createPlace);
router.patch("/places/:id", updatePlace);
router.patch("/places/:id/status", updatePlaceStatus);
router.delete("/places/:id", deletePlace);

router.get("/place-submissions", listPlaceSubmissions);

// ── USERS ──
router.get("/users", listUsers);
router.get("/users/:id", getUserById);
router.delete("/users/:id", deleteUser);

// ── GUIDES ──
router.get("/guides/specific", listSpecificGuides);
router.get("/guides/specific/:id", getSpecificGuideById);
router.patch("/guides/:kind/:id/status", updateGuideStatus);
router.delete("/guides/specific/:id", deleteSpecificGuide);
router.get("/guides/common", listCommonGuides);
router.get("/guides/common/:id", getCommonGuideById);
router.delete("/guides/common/:id", deleteCommonGuide);

// ── HOTELS ──
router.get("/hotels", listHotels);
router.post("/hotels", createHotelAdmin);
router.get("/hotels/:id", getHotelById);
router.patch("/hotels/:id", updateHotelAdmin);
router.patch("/hotels/:id/status", updateHotelStatus);
router.delete("/hotels/:id", deleteHotel);

// ── RESTAURANTS ──
router.get("/restaurants", listRestaurants);
router.post("/restaurants", createRestaurantAdmin);
router.get("/restaurants/:id", getRestaurantById);
router.patch("/restaurants/:id", updateRestaurantAdmin);
router.patch("/restaurants/:id/status", updateRestaurantStatus);
router.delete("/restaurants/:id", deleteRestaurant);

// ── OWNERS ──
router.get("/hotel-owners", listHotelOwners);
router.delete("/hotel-owners/:id", deleteHotelOwner);
router.get("/restaurant-owners", listRestaurantOwners);
router.delete("/restaurant-owners/:id", deleteRestaurantOwner);

// ── BOOKINGS ──
router.get("/bookings/guides", listGuideBookings);
router.patch("/bookings/guides/:kind/:id/status", updateGuideBookingStatus);
router.get("/bookings/hotels", listHotelBookings);
router.patch("/bookings/hotels/:id/status", updateHotelBookingStatus);
router.get("/bookings/reservations", listReservations);
router.patch("/bookings/reservations/:id/status", updateReservationStatus);

// ── TESTIMONIALS / REVIEWS ──
router.get("/testimonials", listTestimonials);
router.delete("/testimonials/:id", deleteTestimonial);

// ── VERSION CONFIG (force-update) ──
router.get("/version-config", listVersionConfigs);
router.patch("/version-config/:app", updateVersionConfig);

// ── AUDIT LOGS ──
router.get("/audit-logs", listAuditLogs);

// ── SUPPORT TICKETS ──
router.get("/support-tickets", listSupportTickets);
router.get("/support-tickets/:id", getSupportTicketById);
router.post("/support-tickets", createSupportTicket);
router.patch("/support-tickets/:id", updateSupportTicket);
router.delete("/support-tickets/:id", deleteSupportTicket);

// ── NOTIFICATIONS ──
router.get("/notifications", listNotifications);
router.post("/notifications", sendNotification);
router.delete("/notifications/:id", deleteNotification);

// ── COUPONS ──
router.get("/coupons", listCoupons);
router.get("/coupons/:id", getCouponById);
router.post("/coupons", createCoupon);
router.patch("/coupons/:id", updateCoupon);
router.delete("/coupons/:id", deleteCoupon);

// ── SESSIONS ──
router.get("/sessions", listSessions);
router.delete("/sessions/:id", revokeSession);

// ── REPORTS ──
router.get("/reports/summary", getReportSummary);
router.get("/reports/users", getUsersReport);
router.get("/reports/bookings", getBookingsReport);

// ── ADMIN ROLE MANAGEMENT ──
router.get("/admins", listAdmins);
router.patch("/admins/:id/role", updateAdminRole);
router.patch("/admins/:id/suspend", suspendAdmin);
router.patch("/admins/:id/restore", restoreAdmin);

export default router;