import "server-only";

import { auth } from "@/auth";

/**
 * Route protection helper for the admin panel. Authentication is exclusively
 * handled by NextAuth/Auth.js: an authorized session exists only when the
 * backend verified (email/password or Google) that the visitor is an existing
 * admin. There is no legacy backend token cookie fallback anymore.
 *
 * This helper is called by BOTH the `/` and `/admin` entry pages and by the
 * shared `(dashboard)` layout, so it runs on every admin request. `auth()` can
 * throw for reasons that are all equivalent to "there is no usable session":
 * a missing AUTH_SECRET, a secret that was rotated since the cookie was issued
 * (the encrypted JWT can no longer be decrypted), a malformed/stale session
 * cookie, or a corrupt session store. Letting any of those escape turned a
 * single bad cookie into an HTTP 500 on the whole admin panel instead of a
 * redirect to the sign-in page.
 *
 * A failed read is therefore reported as "not authenticated", which is what
 * lets the caller redirect to /login and lets the visitor sign in again from
 * scratch. The error is not hidden - it is reported to the server log so the
 * underlying auth/configuration problem is still diagnosable.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const session = await auth();
    return Boolean(session?.admin?.id);
  } catch (error) {
    console.error(
      "[admin] auth() failed while checking the session; treating as unauthenticated:",
      error instanceof Error ? error.message : error
    );
    return false;
  }
}
