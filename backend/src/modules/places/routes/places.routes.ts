import express from "express";

import { adminAuthMiddleware, guideAuthMiddleware } from "../../../middlewares/auth.midleware.js";
import { districtServiceMiddleware } from "../../../middlewares/districtService.middleware.js";
// The same controller the admin place form calls, so a guide's Google Maps link
// is resolved by exactly the code the admin's is: one resolver, one message, one
// set of supported link shapes. It is mounted here rather than reached through
// `/api/admin` because that router is admin-only, and this route authenticates
// with the guide's own token like every other guide route on this router.
import { resolvePlaceLocation } from "../../../app_config/controllers/admin.controller.js";

import {
  getPlacesByDistrict,
  getManageablePlacesByDistrict,
  addPlace,
  getPlaceById,
  submitPlace,
  submitPlaceEdit,
  editPlace,
  getPendingPlaceSubmissions,
  approvePlaceSubmission,
  rejectPlaceSubmission,
} from "../controllers/places.controller.js";

const router = express.Router();

router.get("/api/places/district/:districtId", districtServiceMiddleware, getPlacesByDistrict);

// Must be declared before `/api/places/:placeId`, otherwise "manageable" is read
// as a place id and every request for this list 404s on a place lookup.
router.get(
  "/api/places/manageable/:districtId",
  guideAuthMiddleware,
  getManageablePlacesByDistrict
);

// A guide pastes a Google Maps link instead of typing coordinates; the shared
// resolver turns it into the latitude/longitude the place row needs.
router.post("/api/places/resolve-location", guideAuthMiddleware, resolvePlaceLocation);

router.get("/api/places/:placeId", getPlaceById);

router.post("/api/addplaces", adminAuthMiddleware, districtServiceMiddleware, addPlace);

router.post("/api/places/submit", guideAuthMiddleware, districtServiceMiddleware, submitPlace);

router.patch("/api/places/submit/:placeId", guideAuthMiddleware, districtServiceMiddleware, submitPlaceEdit);

router.patch("/api/places/:placeId", adminAuthMiddleware, editPlace);

router.get("/api/places/admin/pending", adminAuthMiddleware, getPendingPlaceSubmissions);

router.patch("/api/places/admin/approve/:submissionId", adminAuthMiddleware, approvePlaceSubmission);

router.patch("/api/places/admin/reject/:submissionId", adminAuthMiddleware, rejectPlaceSubmission);

export default router;