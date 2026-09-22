import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { syncGoogleAccount } from "@/lib/api/auth-sync";
import { getApiBaseUrl } from "@/lib/api/client";

export const authConfig = {
  secret: process.env.AUTH_SECRET,
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

        if (!email || !password) return null;

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

          const data = (await res.json()) as { token?: string; message?: string };

          if (!res.ok || !data.token) {
            return null;
          }

          return {
            id: data.token,
            email,
            name: email.split("@")[0] ?? email,
            backendToken: data.token,
          };
        } catch {
          return null;
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