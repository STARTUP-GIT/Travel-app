"use server";

import "server-only";

import { backendRequest } from "@/lib/api/server";

export type ForgotPasswordResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export type ResetPasswordResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

/**
 * Ask the backend to send a password-reset link to the given email address.
 *
 * Always returns a generic message — the backend never confirms whether the
 * address is registered.
 */
export async function requestPasswordReset(
  email: string
): Promise<ForgotPasswordResult> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    return { ok: false, message: "Enter your email address." };
  }

  try {
    const res = await backendRequest("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: trimmed, panel: "customer" }),
    });

    const data = (await res.json().catch(() => ({}))) as { message?: string };

    if (res.status === 429) {
      return {
        ok: false,
        message: "Too many requests. Please wait a few minutes before trying again.",
      };
    }

    // Both 200 and any backend error return the same user-facing message.
    return {
      ok: true,
      message:
        data?.message ||
        "If that email is registered, a reset link has been sent. Please check your inbox.",
    };
  } catch {
    return {
      ok: false,
      message: "Unable to reach the server. Please try again later.",
    };
  }
}

/**
 * Submit a new password along with the reset token from the URL.
 */
export async function submitPasswordReset(
  token: string,
  password: string,
  confirmPassword: string
): Promise<ResetPasswordResult> {
  if (!token) {
    return { ok: false, message: "Invalid or missing reset token." };
  }
  if (password.length < 6) {
    return { ok: false, message: "Password must be at least 6 characters." };
  }
  if (password !== confirmPassword) {
    return { ok: false, message: "Passwords do not match." };
  }

  try {
    const res = await backendRequest("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });

    const data = (await res.json().catch(() => ({}))) as { message?: string };

    if (res.status === 429) {
      return {
        ok: false,
        message: "Too many requests. Please wait a few minutes before trying again.",
      };
    }

    if (!res.ok) {
      return {
        ok: false,
        message:
          data?.message ||
          "This link is invalid, expired, or already used. Please request a new one.",
      };
    }

    return {
      ok: true,
      message: data?.message || "Password updated. You can now sign in.",
    };
  } catch {
    return {
      ok: false,
      message: "Unable to reach the server. Please try again later.",
    };
  }
}
