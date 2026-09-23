import NextAuth, {
  CredentialsSignin,
  type NextAuthConfig,
  type User as AuthUser,
} from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";

import {
  adminGoogleSignin,
  adminGoogleSignup,
  type GoogleAdminIntent,
} from "@/lib/api/admin-google";
import { backendRequest } from "@/lib/api/server";
import type { AdminProfile } from "@/lib/types";

/**
 * Admin authentication via NextAuth/Auth.js (App Router) — mirrors the WORKING
 * customer frontend authentication implementation exactly, against the admin
 * backend endpoints.
 *
 * - Credentials authorize() POSTs { email, password } to the backend
 *   `/admin/api/auth/signin` (customer: `/users/api/auth/signin`). The backend
 *   validates bcrypt against the admin table and returns { message, token }.
 *   The verified admin profile is then loaded server-side with that token so
 *   the session carries the admin record.
 * - Google: NextAuth/GoogleProvider establishes the Google identity. The
 *   verified Google EMAIL is then sent to the backend `/admin/api/auth/google-signin`
 *   (customer: `/users/api/auth/google-signin`) — NO ID token is sent and the
 *   backend performs NO Google token verification. A 200 signs the admin in; a
 *   404 rejects the login (AccessDenied). The signup page may first call
 *   `/admin/api/auth/google-signup` (customer: `/users/api/auth/google-signup`)
 *   with the Google email/fullname/profilepic when a new admin is being created.
 *
 * Sign-up (email/password) is NOT handled here: the Create Admin Account form
 * calls the backend `/admin/api/auth/signup` directly, then sends the user to
 * the login page (signup and signin stay separate).
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

async function resolveGoogleIntent(): Promise<GoogleAdminIntent> {
  const store = await cookies();
  return store.get("admin_auth_intent")?.value === "signup"
    ? "signup"
    : "signin";
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
 * to give the NextAuth session the admin identity.
 */
async function adminSignin(input: {
  email: string;
  password: string;
}): Promise<AuthorizedAdmin> {
  const res = await backendRequest("/admin/api/auth/signin", {
    method: "POST",
    body: JSON.stringify(input),
  });

  const data = (await res.json().catch(() => undefined)) as
    | { message?: string; token?: string }
    | undefined;

  if (!res.ok) {
    const message = typeof data === "string" ? data : (data?.message ?? "");
    if (/admin does not exist/i.test(message)) throw new AdminNotFoundError();
    if (/invalid password/i.test(message)) throw new InvalidPasswordError();
    if (res.status === 400) throw new InvalidCredentialsError();
    throw new BackendUnavailableError();
  }

  if (!data?.token) throw new InvalidCredentialsError();

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

/**
 * Google authorization gate (mirrors the customer email-based flow): the signup
 * page (intent "signup") may create the account via google-signup first — a 409
 * means the account already exists and is treated as a normal sign-in. Either
 * way the verified Google email is then checked against google-signin, and the
 * login is rejected (AccessDenied) when the backend cannot authorize the admin.
 */
async function authorizeGoogleAdminFlow(profile: {
  email?: string | null;
  name?: string | null;
  picture?: string | null;
}): Promise<boolean> {
  const email = profile?.email;
  if (!email) return false;

  const intent = await resolveGoogleIntent();

  if (intent === "signup") {
    const status = await adminGoogleSignup({
      email,
      fullname: profile?.name ?? "",
      profilepic: profile?.picture ?? undefined,
    });
    if (status !== 201 && status !== 409) return false;
  }

  const result = await adminGoogleSignin(email);
  return result.ok;
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
          return (await adminSignin({ email, password })) as unknown as AuthUser;
        } catch (error) {
          if (error instanceof CredentialsSignin) throw error;
          throw new BackendUnavailableError();
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      // Google gate: the backend is the authority (customer email-based flow).
      // Return false ONLY after the backend rejects the Google email.
      if (account?.provider === "google") {
        return authorizeGoogleAdminFlow(
          profile as { email?: string | null; name?: string | null; picture?: string | null }
        );
      }
      return true;
    },
    async jwt({ token, account, user, profile }) {
      // Runs once at sign-in (user present); binds the verified admin identity
      // and the backend admin token into the encrypted session token.
      if (user) {
        const authorized = user as unknown as Partial<AuthorizedAdmin>;
        if (authorized.admin) token.admin = authorized.admin;
        if (authorized.adminToken) token.adminToken = authorized.adminToken;
      }

      if (account?.provider === "google" && user) {
        const email = profile?.email ?? user.email;
        if (email) {
          const result = await adminGoogleSignin(email);
          if (result.ok) {
            token.admin = result.admin;
            token.adminToken = result.token;
          }
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