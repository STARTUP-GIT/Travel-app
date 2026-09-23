import { handlers } from "@/auth";

// The ONLY authentication route: /api/auth/[...nextauth].
//
// `adminAuthConfig` (existing admin/auth.ts) mirrors the WORKING customer auth
// implementation and registers BOTH providers:
//   - Credentials: signIn("credentials") -> authorize() -> existing backend
//     POST /admin/api/auth/signin with { email, password }. The backend
//     validates bcrypt, returns { message, token }, and the admin profile is
//     loaded server-side from /admin/profile/api/getprofile.
//   - Google: signIn("google") -> GoogleProvider -> signIn callback -> the
//     verified Google email is sent to the existing backend
//     POST /admin/api/auth/google-signin (signup page may first create the
//     account via POST /admin/api/auth/google-signup, exactly like the customer
//     frontend). No ID token is sent and the backend performs no Google token
//     verification. A 404 rejects the login (AccessDenied).
//
// Both flows produce a JWT NextAuth session (user id, name, email, admin) with
// the backend admin token stored server-side in the encrypted NextAuth JWT.
// There is no /api/proxy: all backend calls happen server-side from NextAuth.
export const { GET, POST } = handlers;
