import express from "express";

import { adminAuthMiddleware, guideAuthMiddleware } from "../../../middlewares/auth.midleware.js";
import { districtServiceMiddleware } from "../../../middlewares/districtService.middleware.js";

import {
  getPlacesByDistrict,
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

router.get("/api/places/:placeId", getPlaceById);

router.post("/api/addplaces", adminAuthMiddleware, districtServiceMiddleware, addPlace);

router.post("/api/places/submit", guideAuthMiddleware, districtServiceMiddleware, submitPlace);

router.patch("/api/places/submit/:placeId", guideAuthMiddleware, districtServiceMiddleware, submitPlaceEdit);

router.patch("/api/places/:placeId", adminAuthMiddleware, editPlace);

router.get("/api/places/admin/pending", adminAuthMiddleware, getPendingPlaceSubmissions);

router.patch("/api/places/admin/approve/:submissionId", adminAuthMiddleware, approvePlaceSubmission);

router.patch("/api/places/admin/reject/:submissionId", adminAuthMiddleware, rejectPlaceSubmission);

export default router;