import "server-only";

import { cookies } from "next/headers";

import { auth } from "@/auth";

/**
 * Route protection helper. An authenticated session is any of:
 * - an Auth.js admin session (Google login — the backend already verified the
 *   account is an existing admin before the session was created), or
 * - the backend's httpOnly `token` cookie (existing email/password login).
 * Either credential keeps the route guarded without breaking the existing
 * password flow.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const session = await auth();
  if (session?.admin?.id) return true;

  const store = await cookies();
  return store.has("token");
}