import { Router } from "express";
import {
  getClientSettings,
  getServiceSettings,
} from "../controllers/branding.controller.js";

const router = Router();

/**
 * Public branding endpoints — no auth required.
 *
 * GET /api/settings          → CLIENT branding (backwards-compatible)
 * GET /api/service-settings  → SERVICE branding (new; service web + mobile)
 *
 * The original /api/settings route in appSettings.routes.ts is kept for
 * compatibility. This file serves as the scoped replacements.
 */
router.get("/service-settings", getServiceSettings);

// Also register /api/client-settings for symmetry (used by nothing yet but
// allows future explicit client-scoped calls from the customer apps).
router.get("/client-settings", getClientSettings);

export default router;
