import express from "express";
import rateLimit from "express-rate-limit";
import {
  forgotPassword,
  resetPasswordHandler,
  verifyResetTokenHandler,
} from "../controllers/passwordReset.controller.js";

const router = express.Router();

/**
 * Rate limiting for password-reset endpoints.
 *
 * Forgot-password is more restrictive: an attacker should not be able to
 * trigger a large volume of emails or token-creation operations.
 *
 * Reset-password is slightly more permissive (a user might genuinely hit it a
 * few times if the page reloads), but still limited enough to resist brute-force.
 */
const forgotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please wait a few minutes before trying again." },
  skipFailedRequests: false,
});

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please wait a few minutes before trying again." },
});

// Support both /api-mounted and root-mounted routing cleanly:
router.post("/auth/forgot-password", forgotLimiter, forgotPassword);
router.post("/api/auth/forgot-password", forgotLimiter, forgotPassword);

router.post("/auth/reset-password", resetLimiter, resetPasswordHandler);
router.post("/api/auth/reset-password", resetLimiter, resetPasswordHandler);

router.get("/auth/verify-reset-token", resetLimiter, verifyResetTokenHandler);
router.get("/api/auth/verify-reset-token", resetLimiter, verifyResetTokenHandler);

export default router;
