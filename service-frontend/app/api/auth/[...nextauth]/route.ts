import { handlers } from "@/auth";

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
export const { GET, POST } = handlers;
