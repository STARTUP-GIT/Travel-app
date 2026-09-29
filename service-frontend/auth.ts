import NextAuth, {
  AuthError,
  CredentialsSignin,
  type NextAuthConfig,
} from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import {
  getProviderProfile,
  signinWithEmail,
} from "@/features/provider/api/provider.server";
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

/**
 * The `username` the account was registered with, read from the profile the
 * backend already returns.
 *
 * `user.name` cannot answer this: for an email sign-in it holds the part of the
 * address before the `@`, which is how the dashboard used to greet providers
 * with their email handle instead of their username. A profile that cannot be
 * read must not fail the sign-in, so the username is simply left off the
 * session and the greeting falls back to a neutral word.
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

/**
 * Auth.js signs and verifies every session token with this value, so it has to
 * be a server-side variable: `AUTH_SECRET`, or `NEXTAUTH_SECRET` as the legacy
 * alias. It is never sent to the browser and there is no fallback constant,
 * because a secret that lives in the repository is a secret everyone with
 * repository access can read — which would let them mint a valid session.
 *
 * `service-frontend/.env` is gitignored, so on a host such as Vercel that file
 * never arrives and the variable has to be configured on the host instead.
 */
const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

/**
 * `assertConfig()` in `@auth/core` rejects a config with no secret. Because
 * `GET /api/auth/session` is not one of the HTML actions, that rejection is
 * answered with HTTP 500 rather than a redirect, and the credentials sign-in
 * goes through the very same assertion, so it produces no session cookie and
 * comes back looking exactly like a rejected password.
 *
 * Both reported symptoms were this one condition. `authConfigured` lets the
 * sign-in action report it as a server fault instead of blaming the password.
 */
export const authConfigured = Boolean(authSecret);

if (!authConfigured) {
  console.error(
    "[auth] AUTH_SECRET is not set, so Auth.js rejects its own configuration " +
      "and can neither create nor read a session.\n" +
      "  Symptom: sign-in always reports a server fault, and " +
      "GET /api/auth/session answers HTTP 500 (MissingSecret).\n" +
      "  Fix: set AUTH_SECRET in the environment of the process serving this " +
      "code, then redeploy or restart it.\n" +
      "    - Vercel: Project -> Settings -> Environment Variables -> add " +
      "AUTH_SECRET for Production and Preview, then redeploy. Generate one " +
      "with: openssl rand -base64 32\n" +
      "    - Local: put AUTH_SECRET in service-frontend/.env or .env.local.\n" +
      "  Note .env is gitignored, so it never reaches a deployment."
  );
}

export const authConfig = {
  secret: authSecret,
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
          const username = await resolveUsername(token, providerKind);

          return {
            id: providerKind,
            email: email.trim(),
            name: email.trim().split("@")[0] ?? email.trim(),
            username,
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
          username?: string;
        };
        token.backendToken = source.backendToken;
        token.providerKind = source.providerKind;
        token.username = source.username;
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
          // The account exists from here on, so its username can be read the same
          // way an email sign-in reads it.
          token.username = await resolveUsername(backendToken, pending.kind);
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
      // A callback that throws here is swallowed by Auth.js and answered as
      // "no session", so the guard keeps a partially decoded token from
      // producing a session object that claims a provider it has no token for.
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
