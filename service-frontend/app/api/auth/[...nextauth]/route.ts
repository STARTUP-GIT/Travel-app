import type { NextRequest } from "next/server";

import { authConfigured, handlers } from "@/auth";

/**
 * The only authentication route: /api/auth/[...nextauth].
 *
 * `authConfig` registers
 *   - Credentials -> authorize() -> the provider's own backend signin router,
 *     which is what decides the session and hands back the backend JWT.
 *   - Google (guides only) -> the pending guide details captured before the
 *     redirect are turned into a real backend guide account + session token.
 *
 * There is no catch-all proxy route: every backend call is made server-side.
 */
export const { POST } = handlers;

/** Auth.js names this after the transport it was issued over. */
const SESSION_COOKIES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
];

function hasSessionCookie(request: Request): boolean {
  const header = request.headers.get("cookie") ?? "";
  return SESSION_COOKIES.some((name) =>
    header
      .split(";")
      .some((part) => part.trim().startsWith(`${name}=`))
  );
}

/**
 * `GET /api/auth/session` is the probe `SessionProvider` makes on every page
 * load, and inside Auth.js it is answered with HTTP 500 when `assertConfig()`
 * rejects the configuration — which is exactly what a missing `AUTH_SECRET`
 * does. A provider cannot act on that; it just looks like a broken site.
 *
 * A request carrying no session cookie has no session to describe, so `null` is
 * the truthful answer and is what Auth.js returns itself once it is
 * configured. This is not a stand-in session: a request that actually carries
 * credentials is handed to Auth.js untouched, so signing in is never satisfied
 * by this branch. The reason the server cannot start is logged by `auth.ts` at
 * startup and by the sign-in action on every attempt — it is reported, not
 * hidden.
 *
 * The parameter is a `NextRequest` because that is what Next.js passes a route
 * handler and what Auth.js types its handlers against.
 */
export async function GET(request: NextRequest): Promise<Response> {
  if (authConfigured || hasSessionCookie(request)) {
    return handlers.GET(request);
  }
  return Response.json(null);
}
