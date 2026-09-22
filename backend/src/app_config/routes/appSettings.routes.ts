import { Router } from "express";
import { getPublicAppSettings } from "../controllers/appSettings.controller.js";

const router = Router();

/**
 * Public configuration consumed by the customer frontend
 * (app name, icon, landing-page slideshow images and legal text).
 */
router.get("/settings", getPublicAppSettings);

export default router;