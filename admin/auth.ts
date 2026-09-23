import NextAuth, {
  CredentialsSignin,
  type NextAuthConfig,
  type User as AuthUser,
} from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { cookies } from "next/headers";

import { authorizeGoogleAdminByIdToken } from "@/lib/api/admin-google";
import type { GoogleAdminIntent } from "@/lib/api/admin-google";
import { backendRequest } from "@/lib/api/server";
import type { AdminProfile } from "@/lib/types";

/**
 * Admin authentication via NextAuth/Auth.js (App Router).
 *
 * Email/password (Credentials) and Google (OAuth) both authenticate against
 * the REAL backend before a session is created:
 *
 * - Credentials authorize() calls the backend's own `/admin/api/auth/signin`
 *   (or `/admin/api/auth/signup` when the admin is being created) directly
 *   from the server. The backend validates the credentials against the admin
 *   database and returns a fresh backend admin session token. The verified
 *   admin profile is then loaded via `/admin/profile/api/getprofile` using that
 *   token. No credentials ever reach a proxy or the browser JavaScript.
 * - Google sign-in is re-verified against the backend (which re-checks the ID
 *   token with Google) before a session can be created. The sign-in intent
 *   (signup vs signin) is chosen by the login / signup pages via a short-lived
 *   `admin_auth_intent` cookie:
 *     - "signin": the Google account MUST already be an existing admin.
 *     - "signup": a NEW admin record is created by the backend if needed.
 *
 * Only backend-authorized admins ever end up with a session.
 */

/** Credentials were wrong (or the account does not exist). */
class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

/** The backend could not be reached / returned an unexpected response. */
class BackendUnavailableError extends CredentialsSignin {
  code = "backend_unavailable";
}

/** Backend rejected the admin sign-up (validation / account already exists). */
class AdminSignupFailedError extends CredentialsSignin {
  code = "admin_signup_failed";
}

async function resolveGoogleIntent(): Promise<GoogleAdminIntent> {
  const store = await cookies();
  return store.get("admin_auth_intent")?.value === "signup"
    ? "signup"
    : "signin";
}

const adminSignup = async (input: {
  email: string;
  username: string;
  password: string;
  fullname: string;
}): Promise<{ admin: AdminProfile; token: string }> => {
  const res = await backendRequest("/admin/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });

  const data = (await res.json().catch(() => undefined)) as
    | { admin?: AdminProfile; token?: string; error?: unknown }
    | undefined;

  if (!res.ok || !data?.admin || !data?.token) {
    if (res.status === 400) {
      const error =
        typeof data?.error === "string" ? data.error : "Validation failed";
      // Surface known duplicate-account errors with a dedicated code so the
      // sign-up page can show a useful message.
      if (/already exists/i.test(error)) throw new AdminSignupFailedError();
      throw new InvalidCredentialsError();
    }
    throw new BackendUnavailableError();
  }

  return { admin: data.admin, token: data.token };
};

const adminSignin = async (input: {
  email: string;
  password: string;
  username?: string;
}): Promise<{ admin: AdminProfile; token: string }> => {
  const res = await backendRequest("/admin/api/auth/signin", {
    method: "POST",
    body: JSON.stringify(input),
  });

  if (!res.ok) throw new InvalidCredentialsError();

  const data = (await res.json().catch(() => undefined)) as
    | { token?: string }
    | undefined;

  if (!data?.token) throw new InvalidCredentialsError();

  // Load the verified admin profile with the fresh backend token.
  const profileRes = await backendRequest("/admin/profile/api/getprofile", {
    cookie: `token=${encodeURIComponent(data.token)}`,
  });

  const profileData = (await profileRes.json().catch(() => undefined)) as
    | { admin?: AdminProfile }
    | undefined;

  if (!profileRes.ok || !profileData?.admin) {
    throw new InvalidCredentialsError();
  }

  return { admin: profileData.admin, token: data.token };
};

type AuthorizedAdmin = {
  id: string;
  email: string;
  name: string;
  admin: AdminProfile;
  adminToken: string;
};

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
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        username: { label: "Username", type: "text" },
        fullname: { label: "Full name", type: "text" },
        intent: { label: "Intent", type: "text" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string" ? credentials.email : undefined;
        const password =
          typeof credentials?.password === "string"
            ? credentials.password
            : undefined;
        const username =
          typeof credentials?.username === "string"
            ? credentials.username
            : undefined;
        const fullname =
          typeof credentials?.fullname === "string"
            ? credentials.fullname
            : undefined;

        if (!email || !password) throw new InvalidCredentialsError();

        try {
          let authorized: AuthorizedAdmin;

          if (credentials?.intent === "signup") {
            if (!username || !fullname) throw new InvalidCredentialsError();
            const { admin, token } = await adminSignup({
              email,
              username,
              password,
              fullname,
            });
            authorized = {
              id: admin.id,
              email: admin.email,
              name: admin.name,
              admin,
              adminToken: token,
            };
          } else {
            const { admin, token } = await adminSignin({
              email,
              password,
              ...(username ? { username } : {}),
            });
            authorized = {
              id: admin.id,
              email: admin.email,
              name: admin.name,
              admin,
              adminToken: token,
            };
          }

          return authorized as unknown as AuthUser;
        } catch (error) {
          if (error instanceof CredentialsSignin) throw error;
          throw new BackendUnavailableError();
        }
      },
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
      if (user) {
        const authorized = user as unknown as Partial<AuthorizedAdmin>;
        if (authorized.admin) token.admin = authorized.admin;
        if (authorized.adminToken) token.adminToken = authorized.adminToken;
      }

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