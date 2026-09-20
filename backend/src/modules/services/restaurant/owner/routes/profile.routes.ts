import express from "express";
import { restaurentOwnerAuthMiddleware } from "../../../../../middlewares/auth.midleware.js";
import {
  deleteProfile,
  editProfile,
  getProfile,
} from "../controllers/profile.controllers.js";

const router = express.Router();

router.get("/api/getprofile", restaurentOwnerAuthMiddleware, getProfile);
router.patch("/api/editprofile", restaurentOwnerAuthMiddleware, editProfile);
router.delete("/api/deleteprofile", restaurentOwnerAuthMiddleware, deleteProfile);

export default router;