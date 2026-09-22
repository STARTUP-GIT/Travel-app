import "server-only";

import { ApiError } from "@/lib/api/client";
import { getApiBaseUrl } from "@/lib/api/config";
import type { AdminProfile } from "@/lib/types";

export type GoogleAdminIntent = "signin" | "signup";

/**
 * Server-side Google admin authorization. Verifies the Google ID token with
 * the backend (which re-checks the token with Google) and returns a fresh
 * backend admin token when the account is authorized. Never trusts a
 * client-supplied email or role — the backend decides.
 *
 * - intent "signin": the Google email must already belong to an EXISTING admin
 *   (`/admin/api/auth/google-verify`). Denied otherwise — no account creation.
 * - intent "signup": the Google email is verified and, if no admin exists for
 *   it yet, a NEW Admin record is created by the backend using the existing
 *   Admin model (`/admin/api/auth/google-admin`). Idempotent: an existing
 *   admin is authenticated instead of duplicated.
 */
type GoogleAdminResult =
  | { ok: true; admin: AdminProfile; adminToken: string; message?: never }
  | { ok: false; error: string };

export async function authorizeGoogleAdminByIdToken(input: {
  idToken?: string;
  intent?: GoogleAdminIntent;
}): Promise<GoogleAdminResult> {
  const { idToken, intent = "signin" } = input;

  if (!idToken) {
    return { ok: false, error: "Missing Google ID token" };
  }

  const endpoint =
    intent === "signup"
      ? "/admin/api/auth/google-admin"
      : "/admin/api/auth/google-verify";

  try {
    const res = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    });

    const data = (await res.json()) as {
      ok?: boolean;
      token?: string;
      admin?: AdminProfile;
      error?: string;
    };

    if (res.ok && data.ok && data.admin && data.token) {
      return { ok: true, admin: data.admin, adminToken: data.token };
    }

    return { ok: false, error: data?.error ?? "Not an authorized admin" };
  } catch (err) {
    if (err instanceof ApiError && err.status < 500) {
      return { ok: false, error: err.message };
    }
    return { ok: false, error: "Unable to connect to the authentication service" };
  }
}