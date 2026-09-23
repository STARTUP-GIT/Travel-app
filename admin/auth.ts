import NextAuth, {
  CredentialsSignin,
  type NextAuthConfig,
  type User as AuthUser,
} from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { authorizeGoogleAdminByIdToken } from "@/lib/api/admin-google";
import { backendRequest } from "@/lib/api/server";
import type { AdminProfile } from "@/lib/types";

/**
 * Admin authentication via NextAuth/Auth.js (App Router).
 *
 * Email/password (Credentials) and Google (OAuth) both authenticate against the
 * REAL backend. The backend is the source of truth for admin authorization:
 *
 * - Credentials authorize() POSTs { email, password } to the backend
 *   `/admin/api/auth/signin`. The backend validates bcrypt against the admin
 *   table and returns { message, token }. Since sign-in returns only a token
 *   (no admin record), the verified admin profile is then loaded from
 *   `/admin/profile/api/getprofile` using that backend token (server-side, via
 *   the token cookie). The backend token is stored inside the encrypted NextAuth
 *   JWT — never in browser localStorage, and never in a backend cookie the
 *   browser can't see (NextAuth calls the backend server-side, so the backend's
 *   Set-Cookie is not adopted by the browser).
 * - Google sign-in POSTs the real OAuth `id_token` to the backend
 *   `/admin/api/auth/google-verify`. The backend verifies the token with
 *   Google (email_verified + audience) and only then checks the email against
 *   the admin table. A 200 means authorized and the returned { token, admin }
 *   is stored in the NextAuth JWT/session; a 403 (or any error) rejects the
 *   login. The frontend profile email is never trusted — the backend decides.
 *
 * Sign-up is NOT handled here: the Create Admin Account form calls the backend
 * `/admin/api/auth/signup` directly (server creates the admin, returns a token),
 * then signs in through these Credentials for the session.
 */

/** Credentials fields were missing entirely. */
class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

/** Credentials were wrong (account does not exist). */
class AdminNotFoundError extends CredentialsSignin {
  code = "admin_not_found";
}

/** Credentials were wrong (password mismatch). */
class InvalidPasswordError extends CredentialsSignin {
  code = "invalid_password";
}

/** The backend could not be reached / returned an unexpected response. */
class BackendUnavailableError extends CredentialsSignin {
  code = "backend_unavailable";
}

type AuthorizedAdmin = {
  id: string;
  email: string;
  name: string;
  admin: AdminProfile;
  adminToken: string;
};

/**
 * Calls the real backend sign-in endpoint and loads the admin profile.
 * The backend `/admin/api/auth/signin` returns { message, token } only, so the
 * admin record is fetched from `/admin/profile/api/getprofile` with that token
 * to give the NextAuth session real admin identity.
 */
async function adminSignin(input: {
  email: string;
  password: string;
}): Promise<AuthorizedAdmin> {
  const res = await backendRequest("/admin/api/auth/signin", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (res.status === 404) throw new AdminNotFoundError();
  if (res.status === 401) throw new InvalidPasswordError();
  if (!res.ok) throw new BackendUnavailableError();

  const data = (await res.json().catch(() => undefined)) as
    | { token?: string; message?: string; error?: unknown }
    | undefined;

  if (!data?.token) throw new BackendUnavailableError();

  // Load the verified admin profile with the fresh backend token.
  const profileRes = await backendRequest("/admin/profile/api/getprofile", {
    cookie: `token=${encodeURIComponent(data.token)}`,
  });

  const profileData = (await profileRes.json().catch(() => undefined)) as
    | { admin?: AdminProfile }
    | undefined;

  if (!profileRes.ok || !profileData?.admin) {
    throw new BackendUnavailableError();
  }

  const admin = profileData.admin;

  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    admin,
    adminToken: data.token,
  };
}

export const adminAuthConfig = {
  // Production requires AUTH_SECRET (or legacy NEXTAUTH_SECRET) to be set —
  // Auth.js fails fast with a Configuration error when it is missing.
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
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
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string" ? credentials.email : undefined;
        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : undefined;

        if (!email || !password) throw new InvalidCredentialsError();

        try {
          return (await adminSignin({ email, password })) as AuthUser;
        } catch (error) {
          if (error instanceof CredentialsSignin) throw error;
          throw new BackendUnavailableError();
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      // Google authorization gate: the backend is the authority. The REAL
      // Google ID token is sent to /admin/api/auth/google-verify BEFORE any
      // decision is made — return false only after the backend rejects.
      if (account?.provider === "google") {
        const result = await authorizeGoogleAdminByIdToken({
          idToken: account.id_token,
        });
        if (!result.ok) return false;
      }
      return true;
    },
    async jwt({ token, account, user }) {
      // Runs once at sign-in (user present); binds the verified admin identity
      // and the backend admin token into the encrypted session token.
      if (user) {
        const authorized = user as unknown as Partial<AuthorizedAdmin>;
        if (authorized.admin) token.admin = authorized.admin;
        if (authorized.adminToken) token.adminToken = authorized.adminToken;
      }

      if (account?.provider === "google" && user) {
        const result = await authorizeGoogleAdminByIdToken({
          idToken: account.id_token,
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
        session.user.id = admin?.id ?? token.sub ?? session.user.id;
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