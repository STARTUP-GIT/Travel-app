import "server-only";

import { getApiBaseUrl } from "@/lib/api/config";
import type { AdminProfile } from "@/lib/types";

/**
 * Server-side Google admin authorization. Sends the REAL Google OAuth ID token
 * (account.id_token) to the backend `/admin/api/auth/google-verify`. The
 * backend re-verifies the token with Google (email_verified + audience), checks
 * the email against the admin table, and returns a fresh backend admin token
 * when the account is authorized. The backend alone decides authorization —
 * a client-supplied email is never trusted.
 */
type GoogleAdminResult =
  | { ok: true; admin: AdminProfile; adminToken: string }
  | { ok: false; error: string };

export async function authorizeGoogleAdminByIdToken(input: {
  idToken?: string;
}): Promise<GoogleAdminResult> {
  const { idToken } = input;

  if (!idToken) {
    return { ok: false, error: "Missing Google ID token" };
  }

  try {
    const res = await fetch(`${getApiBaseUrl()}/admin/api/auth/google-verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => undefined)) as
      | { ok?: boolean; token?: string; admin?: AdminProfile; error?: string }
      | undefined;

    if (res.ok && data?.ok && data.admin && data.token) {
      return { ok: true, admin: data.admin, adminToken: data.token };
    }

    return { ok: false, error: data?.error ?? "Not an authorized admin" };
  } catch {
    return { ok: false, error: "Unable to connect to the authentication service" };
  }
}