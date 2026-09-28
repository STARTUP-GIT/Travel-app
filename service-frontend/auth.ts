import NextAuth, {
  AuthError,
  CredentialsSignin,
  type NextAuthConfig,
} from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { signinWithEmail } from "@/features/provider/api/provider.server";
import { completeGuideGoogleSignup, takePendingGuideSignup } from "@/features/provider/api/guide-google.server";
import { isProviderKind, type ProviderKind } from "@/features/provider/types";

/** The email/password pair was rejected by the provider's own backend router. */
class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

/** No provider kind was carried through, so no backend router could be chosen. */
class UnknownProviderError extends CredentialsSignin {
  code = "unknown_provider";
}

/** The backend could not be reached at all. */
class BackendUnavailableError extends CredentialsSignin {
  code = "backend_unavailable";
}

const googleEnabled = Boolean(
  process.env.AUTH_GOOGLE_ID ??
    process.env.GOOGLE_ID ??
    process.env.GOOGLE_CLIENT_ID
);

export const authConfig = {
  // Production requires AUTH_SECRET; Auth.js fails fast rather than issuing
  // forgeable sessions when it is missing.
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    // Google is only wired up for the two guide routers: the hotel and
    // restaurant routers expose no google-signin/google-signup route at all.
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
    Credentials({
      name: "credentials",
      credentials: {
        kind: { label: "Provider", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const kind = credentials?.kind;
        const email = typeof credentials?.email === "string" ? credentials.email : "";
        const password =
          typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) throw new InvalidCredentialsError();
        if (!isProviderKind(kind)) throw new UnknownProviderError();

        try {
          // Each provider kind is a separate backend router with its own signin
          // endpoint, so the session only exists because this call succeeded.
          const token = await signinWithEmail(kind, email.trim(), password);
          const providerKind: ProviderKind = kind;

          return {
            id: providerKind,
            email: email.trim(),
            name: email.trim().split("@")[0] ?? email.trim(),
            backendToken: token,
            providerKind,
          };
        } catch (error) {
          if (error instanceof CredentialsSignin) throw error;
          // A 400/401 from the backend is a real credentials problem, not an
          // outage, and must not be reported as "try again later".
          const status =
            typeof error === "object" && error !== null && "status" in error
              ? (error as { status?: number }).status
              : undefined;
          if (status === 400 || status === 401 || status === 404) {
            throw new InvalidCredentialsError();
          }
          throw new BackendUnavailableError();
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile }) {
      if (user) {
        const source = user as unknown as {
          backendToken?: string;
          providerKind?: ProviderKind;
        };
        token.backendToken = source.backendToken;
        token.providerKind = source.providerKind;
      }

      // Guide Google registration. The backend never sees a Google account until
      // it has the guide details captured before the redirect, and the identity
      // itself always comes from the verified Google profile.
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
        } else {
          // Without the captured guide details there is no way to tell which of
          // the two guide routers this account belongs to, so no usable session
          // can be created. Failing here is better than a session that 401s on
          // the first request.
          throw new AuthError(
            "Start from the guide sign-up form so we know which guide type you are registering as."
          );
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.sub as string) ?? "";
      }
      session.backendToken = token.backendToken;
      session.providerKind = token.providerKind;
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
