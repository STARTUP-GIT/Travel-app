import express from "express";
import { hotelOwnerAuthMiddleware } from "../../../../../middlewares/auth.midleware.js";
import {
  createHotel,
  deleteHotel,
  getAllHotels,
  getHotelById,
  getMyHotels,
  updateHotel,
} from "../controllers/profile.controllers.js";

const router = express.Router();

router.post("/api/createhotels", hotelOwnerAuthMiddleware, createHotel);
router.get("/api/getallhotels", getAllHotels);
router.get("/api/:hotelId", getHotelById);
router.patch("/api/update/:hotelId", hotelOwnerAuthMiddleware, updateHotel);
router.delete("/api/delete/:hotelId", hotelOwnerAuthMiddleware, deleteHotel);
router.get("/api/my-hotels", hotelOwnerAuthMiddleware, getMyHotels);

export default router;