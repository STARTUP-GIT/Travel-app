import express from "express";
import { hotelOwnerAuthMiddleware } from "../../../../../middlewares/auth.midleware.js";
import {
  deleteProfile,
  editProfile,
  getProfile,
} from "../controllers/profile.controllers.js";

const router = express.Router();

router.get("/api/getprofile", hotelOwnerAuthMiddleware, getProfile);
router.patch("/api/editprofile", hotelOwnerAuthMiddleware, editProfile);
router.delete("/api/deleteprofile", hotelOwnerAuthMiddleware, deleteProfile);

export default router;