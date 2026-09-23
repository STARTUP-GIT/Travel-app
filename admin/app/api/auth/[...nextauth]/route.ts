import { handlers } from "@/auth";

// The ONLY authentication route: /api/auth/[...nextauth].
//
// `adminAuthConfig` (existing admin/auth.ts) registers BOTH providers:
//   - Credentials: signIn("credentials") -> authorize() -> existing backend
//     POST /admin/api/auth/signin with { email, password }. The backend
//     validates bcrypt, returns { message, token }, and the admin profile is
//     loaded server-side from /admin/profile/api/getprofile.
//   - Google: signIn("google") -> GoogleProvider -> signIn callback ->
//     existing backend POST /admin/api/auth/google-verify with
//     { idToken: account.id_token }. The backend verifies the token with
//     Google and checks the admin table before a session is created. Returns
//     false for non-admin Google accounts (AccessDenied).
//
// Both flows produce a JWT NextAuth session (user id, name, email, admin) with
// the backend admin token stored server-side in the encrypted NextAuth JWT.
// There is no /api/proxy: all backend calls happen server-side from NextAuth.
export const { GET, POST } = handlers;
