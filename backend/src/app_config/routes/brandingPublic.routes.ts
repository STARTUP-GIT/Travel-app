import { Router } from "express";
import {
  getClientSettings,
  getServiceSettings,
  getPublicBranding,
} from "../controllers/branding.controller.js";

const router = Router();

/**
 * Public branding endpoints — no auth required.
 *
 * GET /api/branding          → Approved published ATLASWANDERS brand configuration
 * GET /api/settings          → CLIENT branding (backwards-compatible customer endpoint)
 * GET /api/service-settings  → SERVICE branding (service web & mobile endpoint)
 */
router.get("/branding", getPublicBranding);
router.get("/service-settings", getServiceSettings);
router.get("/client-settings", getClientSettings);

export default router;
