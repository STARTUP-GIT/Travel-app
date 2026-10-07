import { Router } from "express";
import { getAppVersion } from "../controllers/versionConfig.controller.js";

const router = Router();

/**
 * Public version-check endpoint — no auth required.
 * GET /api/app-version?app=CLIENT  or  ?app=SERVICE
 *
 * Mobile apps call this on startup to determine whether to force an update.
 */
router.get("/app-version", getAppVersion);

export default router;
