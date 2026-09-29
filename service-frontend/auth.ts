import NextAuth, {
  AuthError,
  type NextAuthConfig,
} from "next-auth";
import Google from "next-auth/providers/google";

import { getProviderProfile } from "@/features/provider/api/provider.server";
import { completeGuideGoogleSignup, takePendingGuideSignup } from "@/features/provider/api/guide-google.server";
import type { ProviderKind } from "@/features/provider/types";

/**
 * Email/password sign-in does not use Auth.js. Google (guides only) still uses
 * this config for the OAuth round-trip; the backend JWT is written to the
 * same `token` cookie as email login.
 */
async function resolveUsername(
  token: string,
  kind: ProviderKind
): Promise<string | undefined> {
  try {
    const profile = await getProviderProfile(token, kind);
    return profile.username.trim() || undefined;
  } catch {
    return undefined;
  }
}

const googleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID ??
    process.env.GOOGLE_ID ??
    process.env.GOOGLE_CLIENT_ID
);

const authSecret =
  process.env.AUTH_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim() || "";

if (authSecret && !process.env.AUTH_SECRET?.trim()) {
  process.env.AUTH_SECRET = authSecret;
}

export const authConfigured = Boolean(authSecret);

export const authConfig = {
  secret: authSecret,
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    ...(googleEnabled
      ? [
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
        ]
      : []),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        const source = user as unknown as {
          backendToken?: string;
          providerKind?: ProviderKind;
          username?: string;
        };
        token.backendToken = source.backendToken;
        token.providerKind = source.providerKind;
        token.username = source.username;
      }

      if (account?.provider === "google") {
        const pending = await takePendingGuideSignup();
        const email = profile?.email;

        if (pending && typeof email === "string" && email) {
          const { token: backendToken } = await completeGuideGoogleSignup(
            pending,
            {
              email,
              fullname: (profile?.name as string | undefined) ?? email.split("@")[0] ?? email,
              profilepic: (profile?.picture as string | undefined) ?? undefined,
            }
          );
          token.backendToken = backendToken;
          token.providerKind = pending.kind;
          token.username = await resolveUsername(backendToken, pending.kind);
        } else {
          throw new AuthError(
            "Start from the guide sign-up form so we know which guide type you are registering as."
          );
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (!session.user || !token) return session;

      session.user.id = (token.sub as string) ?? "";
      session.user.username = token.username;
      session.backendToken = token.backendToken;
      session.providerKind = token.providerKind;
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
