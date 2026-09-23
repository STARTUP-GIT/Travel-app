import "server-only";

import { getApiBaseUrl } from "@/lib/api/config";
import type { AdminProfile } from "@/lib/types";

export type GoogleAdminIntent = "signin" | "signup";

type GoogleSigninResult =
  | { ok: true; token: string; admin: AdminProfile }
  | { ok: false; status: number; error: string };

/**
 * Admin Google sign-in, mirroring the customer pattern: after NextAuth/Google
 * OAuth establishes the Google identity, the verified Google EMAIL is sent to
 * the backend `/admin/api/auth/google-signin`. The backend looks the email up
 * in the admin table and returns a fresh backend admin token + admin on 200,
 * or 404 when the account is not an authorized admin. NO ID token is ever sent
 * to the backend and the backend performs no Google token verification —
 * exactly like the customer authentication implementation.
 */
export async function adminGoogleSignin(
  email: string
): Promise<GoogleSigninResult> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/admin/api/auth/google-signin`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => undefined)) as
      | { message?: string; token?: string; admin?: AdminProfile }
      | undefined;

    if (res.ok && data?.token && data.admin) {
      return { ok: true, token: data.token, admin: data.admin };
    }

    return {
      ok: false,
      status: res.status,
      error: data?.message ?? "Not an authorized admin",
    };
  } catch {
    return { ok: false, status: 0, error: "Unable to connect to the authentication service" };
  }
}

/**
 * Admin Google sign-up, mirroring the customer pattern: sends the verified
 * Google email (+ fullname/profilepic) to the backend `/admin/api/auth/google-signup`.
 * The backend creates the admin when none owns the email, or returns 409 when
 * the account already exists (which is then handled as an existing account via
 * google-signin). Returns the HTTP status: 201 created, 409 already exists,
 * or 0 / another status when signup failed.
 */
export async function adminGoogleSignup(input: {
  email: string;
  fullname: string;
  profilepic?: string;
}): Promise<number> {
  try {
    const res = await fetch(`${getApiBaseUrl()}/admin/api/auth/google-signup`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: input.email,
        fullname: input.fullname,
        profilepic: input.profilepic,
      }),
      cache: "no-store",
    });

    return res.status;
  } catch {
    return 0;
  }
}