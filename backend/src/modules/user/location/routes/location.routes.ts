import express from "express";
import {
  getCustomerStates,
  getCustomerDistricts,
} from "../controllers/location.controller.js";

const router = express.Router();

router.get("/states", getCustomerStates);
router.get("/districts", getCustomerDistricts);

export default router;