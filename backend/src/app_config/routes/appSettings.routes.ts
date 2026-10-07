import { Router } from "express";
import { getClientSettings } from "../controllers/branding.controller.js";

const router = Router();

/**
 * Public application-branding payload consumed by the customer frontend.
 * Returns CLIENT-scoped branding (app name, icon, landing-page images, legal).
 * Backwards-compatible: URL unchanged, now served from the scoped controller.
 */
router.get("/settings", getClientSettings);

export default router;