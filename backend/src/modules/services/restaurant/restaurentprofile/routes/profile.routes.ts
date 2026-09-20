import express from "express";
import { restaurentOwnerAuthMiddleware } from "../../../../../middlewares/auth.midleware.js";
import {
  createRestaurent,
  deleteRestaurent,
  getAllRestaurents,
  getMyRestaurents,
  getRestaurentById,
  updateRestaurent,
} from "../controllers/profile.controllers.js";

const router = express.Router();

router.post("/api/restaurants", restaurentOwnerAuthMiddleware, createRestaurent);
router.get("/api/restaurants", getAllRestaurents);
router.get("/api/restaurants/:restaurentId", getRestaurentById);
router.patch("/api/restaurants/:restaurentId", restaurentOwnerAuthMiddleware, updateRestaurent);
router.delete("/api/restaurants/:restaurentId", restaurentOwnerAuthMiddleware, deleteRestaurent);
router.get("/api/my-restaurants", restaurentOwnerAuthMiddleware, getMyRestaurents);

export default router;