import { handlers } from "@/auth";

// The ONLY authentication route: /api/auth/[...nextauth].
//
// `authConfig` (existing frontend/auth.ts) registers BOTH providers:
//   - Credentials: signIn("credentials") -> authorize() -> existing backend
//     POST /users/api/auth/signin (server-side via BACKEND_URL).
//   - Google: signIn("google") -> GoogleProvider -> jwt callback ->
//     existing backend /users/api/auth/google-signup + google-signin.
//
// Both flows produce a JWT NextAuth session (user id, email, backend token).
// There is no /api/proxy: all backend calls happen server-side from NextAuth.
export const { GET, POST } = handlers;
