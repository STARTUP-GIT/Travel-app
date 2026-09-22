import { Router } from "express";

import { authorizeOrCreateGoogleAdmin } from "../controllers/googleAdmin.controller.js";

/**
 * Public Google OAuth admin verification/create endpoint backing the admin
 * panel's Google sign-up/sign-in. Kept OUTSIDE adminAuthMiddleware because it
 * runs before any admin session exists; the middleware still protects every
 * other admin API route.
 */
const router = Router();

router.post("/google-admin", authorizeOrCreateGoogleAdmin);

export default router;