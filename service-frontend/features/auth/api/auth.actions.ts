"use server";

import { AuthError } from "next-auth";
import { cookies, headers } from "next/headers";

import { authConfigured, signIn } from "@/auth";
import {
  ProviderApiError,
  signupWithEmail,
} from "@/features/provider/api/provider.server";
import { setPendingGuideSignup } from "@/features/provider/api/guide-google.server";
import { uploadSignupPhoto } from "@/features/provider/api/provider.actions";
import type { ProviderKind } from "@/features/provider/types";
import {
  firstError,
  googleGuideSchema,
  loginSchema,
  signupSchema,
  type GoogleGuideValues,
  type LoginValues,
  type SignupValues,
} from "@/features/auth/schemas";

export type AuthActionResult =
  | { ok: true; redirectTo: string; warning?: string }
  | { ok: false; message: string; fields?: Record<string, string> };

const SIGN_IN_FAILED = "Sign in failed.";
const SIGN_UP_FAILED = "Sign up failed.";
const SOMETHING_WENT_WRONG = "Something went wrong.";
const NETWORK_ERROR = "Network error.";
const ACCOUNT_EXISTS = "Account exists.";
/** The account is real, so this must not read as a failed registration. */
const ACCOUNT_CREATED = "Account created. Please sign in.";

/**
 * `CredentialsSignin` codes raised by `authorize()` in auth.ts, mapped to
 * something the provider can act on. The Auth.js error *types* are listed too
 * because a sign-in that is refused rather than thrown comes back as a URL.
 *
 * Every message is short. The backend's own wording differs per router
 * ("Validation failed", "Could not sign in (HTTP 401)"), so it is logged in
 * `failure()` instead of shown.
 */
const CREDENTIAL_MESSAGES: Record<string, string> = {
  invalid_credentials: "Invalid credentials.",
  unknown_provider: "Choose an account type.",
  backend_unavailable: NETWORK_ERROR,
  Configuration: SOMETHING_WENT_WRONG,
  AccessDenied: SIGN_IN_FAILED,
  OAuthCallbackError: SIGN_IN_FAILED,
  default: SIGN_IN_FAILED,
};

const GOOGLE_UNAVAILABLE = "Google sign in is unavailable.";

function authErrorMessage(error: AuthError): string {
  // Credentials errors carry the specific reason in `code`; every other type is
  // already specific enough to look up by name.
  const code = (error as unknown as { code?: string }).code ?? "";
  return CREDENTIAL_MESSAGES[error.type] ?? CREDENTIAL_MESSAGES[code] ?? SIGN_IN_FAILED;
}

/**
 * Auth.js names the session cookie after the transport it was issued over:
 * `__Secure-` prefixed on HTTPS, unprefixed otherwise. Nothing else is needed to
 * tell "signed in" from "not signed in".
 */
const SESSION_COOKIES = [
  "__Secure-authjs.session-token",
  "authjs.session-token",
];

async function sessionCookieWritten(): Promise<boolean> {
  const store = await cookies();
  return SESSION_COOKIES.some((name) => Boolean(store.get(name)?.value));
}

/**
 * A refused sign-in comes back as Auth.js's own error page with the failure in
 * the query (`error`, plus `code` for credentials). The raw type is never shown
 * to a provider, so it goes through the same table a thrown `AuthError` uses.
 */
function messageFromErrorUrl(result: unknown): string | null {
  if (typeof result !== "string") return null;

  let error: string | null = null;
  let code: string | null = null;
  try {
    const url = new URL(result, "http://localhost");
    // Auth.js reports a refusal on its own error page, which this app points at
    // `/login`. A `?error=` on any other page of ours is part of the redirect
    // target and says nothing about the sign-in.
    if (url.pathname !== "/login" && !url.pathname.startsWith("/api/auth/")) {
      return null;
    }
    error = url.searchParams.get("error");
    code = url.searchParams.get("code");
  } catch {
    return null;
  }

  if (!error) return null;
  return CREDENTIAL_MESSAGES[code ?? ""] ?? CREDENTIAL_MESSAGES[error] ?? null;
}

/** Only a path on this site is ever navigated to after an auth action. */
function safePath(value: string | undefined, fallback: string): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

/** The host the browser used to reach this app, as Auth.js sees it. */
async function thisHost(): Promise<string> {
  const requestHeaders = await headers();
  return (
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? ""
  );
}

/**
 * The provider's authorization URL, or `null` when Auth.js answered with a URL
 * that stays on this site — which is how it reports a refusal.
 */
async function awayFromThisOrigin(result: unknown): Promise<string | null> {
  if (typeof result !== "string") return null;

  // Compared on the host rather than the full origin so that a dev server on
  // plain HTTP still matches the URL Auth.js builds for itself.
  const host = await thisHost();
  if (!host) return null;

  try {
    const url = new URL(result, `https://${host}`);
    if (url.searchParams.has("error")) return null;
    return url.host === host ? null : url.toString();
  } catch {
    return null;
  }
}

function failure(
  error: unknown,
  fallback: string
): { ok: false; message: string; fields?: Record<string, string> } {
  if (error instanceof ProviderApiError) {
    // The backend words this differently on every router, and it is not the
    // same text for every provider kind, so it is not something a provider can
    // act on. It goes to the log; the form gets one short line.
    console.error(`[auth] ${fallback}: HTTP ${error.status} ${error.message}`);
    return {
      ok: false,
      message: error.status >= 500 ? SOMETHING_WENT_WRONG : fallback,
      fields: error.fields,
    };
  }
  // `backendRequest` uses a bare `fetch`, so anything thrown here is a
  // connection failure rather than an answer from the backend.
  console.error(`[auth] ${fallback}:`, error);
  return { ok: false, message: NETWORK_ERROR };
}

/**
 * The four signup routers word this the same way ("<subject> already exists",
 * on 400), so the message is the reliable signal; 409 is kept in case a router
 * is later changed to answer with a conflict status.
 */
function isAlreadyRegistered(error: ProviderApiError): boolean {
  return (
    error.status === 409 ||
    /already\s+(exists|registered|taken|have|in use)/i.test(error.message)
  );
}

/* -------------------------------------------------------------------------- */
/*  Sign in                                                                    */
/* -------------------------------------------------------------------------- */

export async function signInWithEmail(
  values: LoginValues,
  redirectTo = "/dashboard"
): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fields: firstError(parsed.error),
    };
  }

  const destination = safePath(redirectTo, "/dashboard");

  // Without an Auth.js secret no session can be minted at all, and the sign-in
  // comes back indistinguishable from a rejected password. `auth.ts` has
  // already logged the cause; report it as a server fault instead of sending
  // the provider off to re-type a password that was never the problem.
  if (!authConfigured) {
    return { ok: false, message: SOMETHING_WENT_WRONG };
  }

  try {
    // `redirect: false` keeps navigation in the browser, so a failure is
    // reported in place instead of bouncing through the error page.
    //
    // next-auth v5 answers with a *string* — the URL it would have redirected
    // to — and throws `AuthError` when the credentials are rejected. The string
    // on its own proves nothing: a server-side failure inside Auth.js (a
    // missing secret, for example) is also answered with a URL and no cookie.
    // The session cookie is what actually confirms the sign-in.
    const result = await signIn("credentials", {
      ...parsed.data,
      redirect: false,
      redirectTo: destination,
    });

    const fromUrl = messageFromErrorUrl(result);
    if (fromUrl) return { ok: false, message: fromUrl };

    if (!(await sessionCookieWritten())) {
      return { ok: false, message: SIGN_IN_FAILED };
    }

    return { ok: true, redirectTo: destination };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, message: authErrorMessage(error) };
    }
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/*  Sign up                                                                    */
/* -------------------------------------------------------------------------- */

export async function registerWithEmail(
  values: SignupValues,
  redirectTo = "/dashboard",
  /** Photo chosen on the form, uploaded once the account exists. */
  photo?: File | null
): Promise<AuthActionResult> {
  const parsed = signupSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fields: firstError(parsed.error),
    };
  }

  const { kind, ...input } = parsed.data;

  try {
    // No `profilePic` is sent: a photo URL is never typed or accepted here, and
    // the upload endpoint needs a session that does not exist yet.
    await signupWithEmail(kind as ProviderKind, {
      email: input.email,
      username: input.username,
      password: input.password,
      fullname: input.fullname,
      phonenumber: input.phonenumber,
      placeIds: input.placeIds,
      experience: input.experience,
      cost: input.cost,
      languages: input.languages,
    });
  } catch (error) {
    // All four signup routers answer a duplicate with 400 and "… already exists",
    // matching on either the email address or the username. An account that
    // already exists is a dead end unless the provider is told to sign in
    // instead of trying to register again.
    if (error instanceof ProviderApiError && isAlreadyRegistered(error)) {
      return { ok: false, message: ACCOUNT_EXISTS };
    }
    return failure(error, SIGN_UP_FAILED);
  }

  // Upload before signing the browser in, so a photo failure is reported on the
  // form the provider is still looking at instead of after the redirect.
  let photoWarning: string | null = null;
  if (photo && photo.size > 0) {
    const uploaded = await uploadSignupPhoto(
      kind as ProviderKind,
      input.email,
      input.password,
      photo
    );
    if (!uploaded.ok) {
      // The account exists, so registration has effectively succeeded. The photo
      // is optional and can be added from the profile later, so this is a
      // warning rather than a failure — and the backend's reason is logged in
      // `uploadSignupPhoto` rather than shown here.
      photoWarning = "Photo upload failed.";
    }
  }

  const result = await signInWithEmail(
    { kind, email: input.email, password: input.password },
    redirectTo
  );

  if (result.ok) {
    return photoWarning ? { ...result, warning: photoWarning } : result;
  }

  // The account exists, so a failure here is the sign-in step and not the
  // registration. Saying "sign up failed" is what made providers think their
  // account had never been created and register a second time.
  return {
    ok: false,
    message: ACCOUNT_CREATED,
    fields: result.fields,
  };
}

/* -------------------------------------------------------------------------- */
/*  Google (guides only)                                                       */
/* -------------------------------------------------------------------------- */

export async function signInWithGoogleGuide(
  values: GoogleGuideValues,
  redirectTo = "/dashboard"
): Promise<AuthActionResult> {
  const parsed = googleGuideSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Please check the highlighted fields.",
      fields: firstError(parsed.error),
    };
  }

  const { kind, ...details } = parsed.data;
  const destination = safePath(redirectTo, "/dashboard");

  // These guide details have to survive the round-trip to Google, so they are
  // parked in a short-lived httpOnly cookie. The identity itself is taken from
  // the verified Google profile, never from the browser.
  await setPendingGuideSignup({ kind, ...details });

  try {
    const result = await signIn("google", {
      redirect: false,
      redirectTo: destination,
    });

    const fromUrl = messageFromErrorUrl(result);
    if (fromUrl) return { ok: false, message: fromUrl };

    // No session cookie exists yet: the guide is only registered once Google
    // calls back. The provider's authorization URL is what a started flow
    // returns, and it always points away from this origin — a refused one is
    // answered with a URL back here.
    const authorizationUrl = await awayFromThisOrigin(result);
    if (!authorizationUrl) {
      return { ok: false, message: GOOGLE_UNAVAILABLE };
    }

    return { ok: true, redirectTo: authorizationUrl };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, message: SIGN_IN_FAILED };
    }
    throw error;
  }
}
