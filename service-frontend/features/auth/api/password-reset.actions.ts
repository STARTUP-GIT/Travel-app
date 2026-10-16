"use server";

import { backendRequest } from "@/lib/api/server";

export type ForgotPasswordResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

export type ResetPasswordResult =
  | { ok: true; message: string }
  | { ok: false; message: string };

/**
 * Ask the backend to send a password-reset link to the given email address
 * for any service provider account (hotel, restaurant, or guide).
 *
 * Always returns a generic message regardless of whether the email exists.
 */
export async function requestProviderPasswordReset(
  email: string
): Promise<ForgotPasswordResult> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    return { ok: false, message: "Enter your email address." };
  }

  try {
    const res = await backendRequest("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: trimmed, panel: "provider" }),
    });

    const data = (await res.json().catch(() => ({}))) as { message?: string };

    if (res.status === 429) {
      return {
        ok: false,
        message: "Too many requests. Please wait a few minutes before trying again.",
      };
    }

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
export async function submitProviderPasswordReset(
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
