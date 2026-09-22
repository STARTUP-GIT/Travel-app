import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";

import { authorizeGoogleAdminByIdToken } from "@/lib/api/admin-google";
import type { GoogleAdminIntent } from "@/lib/api/admin-google";
import type { AdminProfile } from "@/lib/types";

/**
 * Admin authentication via NextAuth/Auth.js (App Router) with the Google
 * provider. The sign-in intent (signup vs signin) is chosen by the login /
 * signup pages via a short-lived `admin_auth_intent` cookie:
 *
 * - "signin": the Google account MUST already be an existing admin. A random
 *   Google user is rejected before any session is created.
 * - "signup": the Google account is verified and, if no admin exists, a NEW
 *   Admin record is created by the backend using the existing Admin model.
 *
 * Every Google sign-in is re-verified against the backend before a session is
 * created; no client-supplied role is trusted.
 */
async function resolveGoogleIntent(): Promise<GoogleAdminIntent> {
  const store = await cookies();
  return store.get("admin_auth_intent")?.value === "signup"
    ? "signup"
    : "signin";
}

export const adminAuthConfig = {
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId:
        process.env.AUTH_GOOGLE_ID ??
        process.env.GOOGLE_ID ??
        process.env.GOOGLE_CLIENT_ID,
      clientSecret:
        process.env.AUTH_GOOGLE_SECRET ??
        process.env.GOOGLE_SECRET ??
        process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      // Authorization gate: reject before a session is created.
      if (account?.provider === "google") {
        const intent = await resolveGoogleIntent();
        const result = await authorizeGoogleAdminByIdToken({
          idToken: account.id_token,
          intent,
        });
        if (!result.ok) return false;
      }
      return true;
    },
    async jwt({ token, account, user }) {
      // Runs once at sign-in (user present); binds the verified admin identity
      // and the backend admin token into the encrypted session token.
      if (account?.provider === "google" && user) {
        const intent = await resolveGoogleIntent();
        const result = await authorizeGoogleAdminByIdToken({
          idToken: account.id_token,
          intent,
        });
        if (result.ok && result.admin && result.adminToken) {
          token.admin = result.admin;
          token.adminToken = result.adminToken;
        }
      }
      return token;
    },
    async session({ session, token }) {
      const admin = (token.admin as AdminProfile | undefined) ?? null;
      if (session.user) {
        session.user.name = admin?.name ?? session.user.name;
        session.user.email = admin?.email ?? session.user.email;
      }
      session.admin = admin;
      session.adminToken = (token.adminToken as string | undefined) ?? null;
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(adminAuthConfig);