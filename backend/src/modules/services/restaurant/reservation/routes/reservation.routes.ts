import express from "express";
import { restaurentOwnerAuthMiddleware } from "../../../../../middlewares/auth.midleware.js";
import {
  getOwnerReservationById,
  getOwnerReservations,
  updateReservationStatus,
} from "../controllers/reservation.controllers.js";

const router = express.Router();

router.get("/api/owner", restaurentOwnerAuthMiddleware, getOwnerReservations);
router.get("/api/owner/:reservationId", restaurentOwnerAuthMiddleware, getOwnerReservationById);
router.patch("/api/:reservationId/status", restaurentOwnerAuthMiddleware, updateReservationStatus);

export default router;