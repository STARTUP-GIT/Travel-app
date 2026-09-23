import NextAuth, {
  CredentialsSignin,
  type NextAuthConfig,
  type User as AuthUser,
} from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { syncGoogleAccount } from "@/lib/api/auth-sync";
import { getApiBaseUrl } from "@/lib/api/client";

/** Wrong email/password (or the account does not exist). */
class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

/** The backend could not authenticate the request. */
class BackendUnavailableError extends CredentialsSignin {
  code = "backend_unavailable";
}

export const authConfig = {
  // Production requires AUTH_SECRET (or legacy NEXTAUTH_SECRET); Auth.js fails
  // fast instead of issuing forgeable sessions when it is missing.
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
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
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) throw new InvalidCredentialsError();

        try {
          const res = await fetch(
            `${getApiBaseUrl()}/users/api/auth/signin`,
            {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ email, password }),
              cache: "no-store",
            }
          );

          const data = (await res.json()) as {
            token?: string;
            message?: string;
          };

          if (!res.ok || !data.token) {
            throw new InvalidCredentialsError();
          }

          return {
            id: data.token,
            email,
            name: email.split("@")[0] ?? email,
            backendToken: data.token,
          } as unknown as AuthUser;
        } catch (error) {
          if (error instanceof CredentialsSignin) throw error;
          throw new BackendUnavailableError();
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.backendToken = (user as { backendToken?: string }).backendToken;
      }

      if (account?.provider === "google" && profile) {
        const backendToken = await syncGoogleAccount({
          email: profile.email ?? "",
          fullname: (profile.name as string | undefined) ?? "",
          profilepic: (profile.picture as string | undefined) ?? undefined,
        });

        if (backendToken) {
          token.backendToken = backendToken;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.sub as string) ?? "";
      }
      session.backendToken = token.backendToken as string | undefined;
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);