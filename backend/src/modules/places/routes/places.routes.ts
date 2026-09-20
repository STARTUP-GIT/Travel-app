import express from "express";

import { adminAuthMiddleware } from "../../../middlewares/auth.midleware.js";
import { districtServiceMiddleware } from "../../../middlewares/districtService.middleware.js";

import {getPlacesByDistrict,addPlace,getPlaceById} from "../controllers/places.controller.js";

const router = express.Router();

router.get("/api/places/district/:districtId",districtServiceMiddleware, getPlacesByDistrict);

router.get("/api/places/:placeId",getPlaceById);

router.post("/api/addplaces",adminAuthMiddleware,districtServiceMiddleware,addPlace);

export default router;