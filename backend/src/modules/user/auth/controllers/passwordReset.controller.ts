import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { ZodError, z } from "zod";

import {
  createPasswordResetToken,
  resetPassword,
  verifyResetToken,
  type Panel,
} from "../../../../services/passwordReset.js";
import { sendPasswordResetEmail } from "../../../../services/email.js";

/* -------------------------------------------------------------------------- */
/*  Validation schemas                                                          */
/* -------------------------------------------------------------------------- */

const emailSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  /**
   * The frontend must declare which panel is making the request so we can
   * (a) scope the token to the right panel and (b) generate a reset link
   * that points back to the correct panel.
   */
  panel: z.enum(["customer", "provider"]),
});

const resetSchema = z.object({
  token: z.string().min(64, "Invalid token").max(64, "Invalid token"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(72, "Password is too long"),
});

/* -------------------------------------------------------------------------- */
/*  Generic response — never reveals whether an address is registered           */
/* -------------------------------------------------------------------------- */

const GENERIC_OK = {
  message:
    "If that email address is registered with us, a reset link has been sent.",
};

/* -------------------------------------------------------------------------- */
/*  POST /api/auth/forgot-password                                              */
/* -------------------------------------------------------------------------- */

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email, panel } = emailSchema.parse(req.body);

    const { rawToken } = await createPasswordResetToken(
      email.toLowerCase().trim(),
      panel as Panel
    );

    if (rawToken) {
      try {
        await sendPasswordResetEmail(
          email.toLowerCase().trim(),
          rawToken,
          panel as Panel
        );
      } catch (err: unknown) {
        console.error(
          "[forgot-password] email delivery failed:",
          (err as Error)?.message ?? err
        );
      }
    }

    // Always return the same response regardless of whether the email exists.
    return res.status(200).json(GENERIC_OK);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    console.error("[forgot-password] error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/* -------------------------------------------------------------------------- */
/*  POST /api/auth/reset-password                                               */
/* -------------------------------------------------------------------------- */

export const resetPasswordHandler = async (req: Request, res: Response) => {
  try {
    const { token, password } = resetSchema.parse(req.body);

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const ok = await resetPassword(token, hashedPassword);

    if (!ok) {
      return res.status(400).json({
        message:
          "This reset link is invalid, has expired, or has already been used. Please request a new one.",
      });
    }

    return res
      .status(200)
      .json({ message: "Password updated successfully. You can now sign in." });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: "Validation failed",
        errors: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }
    console.error("[reset-password] error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/* -------------------------------------------------------------------------- */
/*  GET /api/auth/verify-reset-token                                            */
/* -------------------------------------------------------------------------- */

export const verifyResetTokenHandler = async (req: Request, res: Response) => {
  try {
    const raw = (req.query.token as string) || (req.body?.token as string);
    if (!raw || typeof raw !== "string" || raw.length !== 64) {
      return res.status(400).json({
        valid: false,
        message: "This reset link is invalid, has expired, or has already been used.",
      });
    }

    const valid = await verifyResetToken(raw);
    if (!valid) {
      return res.status(400).json({
        valid: false,
        message: "This reset link is invalid, has expired, or has already been used.",
      });
    }

    return res.status(200).json({ valid: true });
  } catch (error) {
    console.error("[verify-reset-token] error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
