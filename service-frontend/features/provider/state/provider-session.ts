import "server-only";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { ProviderKind } from "@/features/provider/types";
import { isProviderKind } from "@/features/provider/types";

/**
 * The session every provider screen works from. A session without a backend
 * token cannot call anything, so it is treated as signed out rather than being
 * allowed to render an app that would fail on the first request.
 */
export type ProviderSession = {
  kind: ProviderKind;
  token: string;
  email: string;
  name: string;
  /**
   * The account's own `username`, taken from the backend profile when the
   * session was created. Empty when the profile could not be read at sign-in,
   * which is why it is separate from `name` rather than a replacement for it.
   */
  username: string;
  image: string | null;
  userId: string;
};

/**
 * `auth()` throws rather than returning null when the session itself cannot be
 * read — a missing AUTH_SECRET makes Auth.js reject its own configuration.
 * Uncaught, that turns the dashboard into a server error instead of a redirect
 * to the sign-in screen, which is the one page that can fix it.
 *
 * The return type is inferred on purpose: `ReturnType<typeof auth>` resolves to
 * the middleware overload (`NextMiddleware`), not to the session.
 */
async function readSession() {
  try {
    return await auth();
  } catch (error) {
    console.error("[provider-session] could not read the session:", error);
    return null;
  }
}

/** Returns the session when it is usable, otherwise `null`. */
export async function getProviderSession(): Promise<ProviderSession | null> {
  const session = await readSession();
  if (!session?.user) return null;

  const kind = session.providerKind;
  const token = session.backendToken;
  if (!isProviderKind(kind) || !token) return null;

  return {
    kind,
    token,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    username: session.user.username ?? "",
    image: session.user.image ?? null,
    userId: session.user.id,
  };
}

/** For pages that must redirect to the sign-in screen. */
export async function requireProviderSession(
  redirectTo = "/dashboard"
): Promise<ProviderSession> {
  const session = await getProviderSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(redirectTo)}`);
  return session;
}

/**
 * Guards provider screens. Hotel and restaurant owners get their own app; the
 * two guide kinds share the same app but must not be able to open each other's
 * kind-specific screens.
 */
export async function requireProvider(
  allowed?: ProviderKind[],
  redirectTo = "/dashboard"
): Promise<ProviderSession> {
  const session = await requireProviderSession(redirectTo);
  if (allowed && !allowed.includes(session.kind)) redirect("/dashboard");
  return session;
}
