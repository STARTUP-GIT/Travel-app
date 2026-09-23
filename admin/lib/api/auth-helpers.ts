import "server-only";

import { auth } from "@/auth";

/**
 * Route protection helper for the admin panel. Authentication is exclusively
 * handled by NextAuth/Auth.js: an authorized session exists only when the
 * backend verified (email/password or Google) that the visitor is an existing
 * admin. There is no legacy backend token cookie fallback anymore.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const session = await auth();
  return Boolean(session?.admin?.id);
}