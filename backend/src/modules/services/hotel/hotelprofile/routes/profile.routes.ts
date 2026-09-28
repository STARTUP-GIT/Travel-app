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
// Must stay ABOVE "/api/:hotelId": Express matches in registration order, so a
// literal path declared after the wildcard would never be reached.
router.get("/api/my-hotels", hotelOwnerAuthMiddleware, getMyHotels);
router.get("/api/:hotelId", getHotelById);
router.patch("/api/update/:hotelId", hotelOwnerAuthMiddleware, updateHotel);
router.delete("/api/delete/:hotelId", hotelOwnerAuthMiddleware, deleteHotel);

export default router;