"use server";

import { headers } from "next/headers";

import {
  ProviderApiError,
  getProviderProfile,
  signupWithEmail,
  MissingSessionTokenError,
  signinWithEmail,
} from "@/features/provider/api/provider.server";
import {
  clearServiceSession,
  providerKindFromToken,
  setServiceSession,
} from "@/features/auth/api/service-session";
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

const SIGN_UP_FAILED = "Sign up failed.";
const NETWORK_ERROR = "Unable to sign in. Please try again.";
const INVALID_CREDENTIALS = "Invalid email or password.";
const UNABLE_TO_SIGN_IN = "Unable to sign in. Please try again.";
const ACCOUNT_EXISTS = "Account exists.";
const ACCOUNT_CREATED = "Account created. Please sign in.";
const GOOGLE_UNAVAILABLE = "Google sign in is unavailable.";

function loginFailure(error: unknown): AuthActionResult {
  if (error instanceof MissingSessionTokenError) {
    console.error("[auth] sign-in response had no token");
    return { ok: false, message: "Authentication succeeded but no session token was returned by backend." };
  }

  if (error instanceof ProviderApiError) {
    if (Object.keys(error.fields).length > 0) {
      return {
        ok: false,
        message: "Please check the highlighted fields.",
        fields: error.fields,
      };
    }

    if (error.status === 401 || error.status === 404) {
      return { ok: false, message: INVALID_CREDENTIALS };
    }

    if (error.status === 400) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes("user") ||
        msg.includes("password") ||
        msg.includes("invalid") ||
        msg.includes("credential") ||
        msg.includes("not found") ||
        msg.includes("exist")
      ) {
        return { ok: false, message: INVALID_CREDENTIALS };
      }
      return { ok: false, message: error.message || INVALID_CREDENTIALS };
    }

    if (error.status === 403) {
      return { ok: false, message: error.message || "Access denied." };
    }

    if (error.status >= 500) {
      console.error(`[auth] sign-in failed: HTTP ${error.status} - ${error.message}`);
      return { ok: false, message: error.message || "Backend server error. Please try again." };
    }

    console.error(`[auth] sign-in failed: HTTP ${error.status} - ${error.message}`);
    return { ok: false, message: error.message || UNABLE_TO_SIGN_IN };
  }

  if (error instanceof Error) {
    console.error("[auth] sign-in failed:", error.message);
    return { ok: false, message: error.message || NETWORK_ERROR };
  }

  console.error("[auth] sign-in failed: unreachable backend");
  return { ok: false, message: NETWORK_ERROR };
}

function failure(
  error: unknown,
  fallback: string
): { ok: false; message: string; fields?: Record<string, string> } {
  if (error instanceof ProviderApiError) {
    console.error(`[auth] ${fallback}: HTTP ${error.status}`);
    return {
      ok: false,
      message: error.status >= 500 ? UNABLE_TO_SIGN_IN : fallback,
      fields: error.fields,
    };
  }
  console.error(`[auth] ${fallback}`);
  return { ok: false, message: NETWORK_ERROR };
}

function isAlreadyRegistered(error: ProviderApiError): boolean {
  return (
    error.status === 409 ||
    /already\s+(exists|registered|taken|have|in use)/i.test(error.message)
  );
}

function safePath(value: string | undefined, fallback: string): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

async function thisHost(): Promise<string> {
  const requestHeaders = await headers();
  return (
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? ""
  );
}

function messageFromErrorUrl(result: unknown): string | null {
  if (typeof result !== "string") return null;

  try {
    const url = new URL(result, "http://localhost");
    if (url.pathname !== "/login" && !url.pathname.startsWith("/api/auth/")) {
      return null;
    }
    const error = url.searchParams.get("error");
    if (!error) return null;
    if (error === "AccessDenied" || error === "CredentialsSignin") {
      return INVALID_CREDENTIALS;
    }
    return UNABLE_TO_SIGN_IN;
  } catch {
    return null;
  }
}

async function awayFromThisOrigin(result: unknown): Promise<string | null> {
  if (typeof result !== "string") return null;

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
  const { kind, email, password } = parsed.data;

  try {
    const token = await signinWithEmail(kind, email.trim(), password);

    const tokenKind = providerKindFromToken(token);
    if (tokenKind !== kind) {
      console.error("[auth] sign-in token role did not match selected provider");
      return { ok: false, message: INVALID_CREDENTIALS };
    }

    const profile = await getProviderProfile(token, kind);

    await setServiceSession(token);

    if (!profile.id) {
      await clearServiceSession();
      return { ok: false, message: UNABLE_TO_SIGN_IN };
    }

    return { ok: true, redirectTo: destination };
  } catch (error) {
    return loginFailure(error);
  }
}

/* -------------------------------------------------------------------------- */
/*  Sign up                                                                    */
/* -------------------------------------------------------------------------- */

export async function registerWithEmail(
  values: SignupValues,
  redirectTo = "/dashboard",
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
    if (error instanceof ProviderApiError && isAlreadyRegistered(error)) {
      return { ok: false, message: ACCOUNT_EXISTS };
    }
    return failure(error, SIGN_UP_FAILED);
  }

  let photoWarning: string | null = null;
  if (photo && photo.size > 0) {
    const uploaded = await uploadSignupPhoto(
      kind as ProviderKind,
      input.email,
      input.password,
      photo
    );
    if (!uploaded.ok) {
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

  await setPendingGuideSignup({ kind, ...details });

  try {
    const { signIn } = await import("@/auth");

    const result = await signIn("google", {
      redirect: false,
      redirectTo: destination,
    });

    const fromUrl = messageFromErrorUrl(result);
    if (fromUrl) return { ok: false, message: fromUrl };

    const authorizationUrl = await awayFromThisOrigin(result);
    if (!authorizationUrl) {
      return { ok: false, message: GOOGLE_UNAVAILABLE };
    }

    return { ok: true, redirectTo: authorizationUrl };
  } catch (error) {
    const { AuthError } = await import("next-auth");
    if (error instanceof AuthError) {
      return { ok: false, message: UNABLE_TO_SIGN_IN };
    }
    throw error;
  }
}
