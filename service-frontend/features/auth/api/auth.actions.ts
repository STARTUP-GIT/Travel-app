"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import {
  ProviderApiError,
  signupWithEmail,
} from "@/features/provider/api/provider.server";
import { setPendingGuideSignup } from "@/features/provider/api/guide-google.server";
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
  | { ok: true; redirectTo: string }
  | { ok: false; message: string; fields?: Record<string, string> };

/**
 * `CredentialsSignin` codes raised by `authorize()` in auth.ts, mapped to
 * something the provider can act on.
 */
const CREDENTIAL_MESSAGES: Record<string, string> = {
  invalid_credentials:
    "That email and password combination did not match an account.",
  unknown_provider: "Choose the type of account you are signing in to.",
  backend_unavailable:
    "The service could not be reached. Please try again in a moment.",
};

function authErrorMessage(error: AuthError): string {
  return (
    CREDENTIAL_MESSAGES[error.type] ??
    "Sign in failed. Please check your details and try again."
  );
}

function failure(
  error: unknown,
  fallback: string
): { ok: false; message: string; fields?: Record<string, string> } {
  if (error instanceof ProviderApiError) {
    return { ok: false, message: error.message, fields: error.fields };
  }
  if (error instanceof Error && error.message) {
    return { ok: false, message: error.message };
  }
  return { ok: false, message: fallback };
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

  try {
    // `redirect: false` keeps navigation in the browser, so a failure is
    // rendered in place instead of bouncing through the error page.
    const result = await signIn("credentials", {
      ...parsed.data,
      redirect: false,
      redirectTo,
    });

    if (!result || result.error || !result.url) {
      return { ok: false, message: "Sign in failed. Please try again." };
    }
    return { ok: true, redirectTo: result.url };
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
  redirectTo = "/dashboard"
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
      profilePic: input.profilePic,
      placeIds: input.placeIds,
      experience: input.experience,
      cost: input.cost,
      languages: input.languages,
    });
  } catch (error) {
    return failure(error, "The account could not be created. Please try again.");
  }

  return signInWithEmail(
    { kind, email: input.email, password: input.password },
    redirectTo
  );
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

  // These guide details have to survive the round-trip to Google, so they are
  // parked in a short-lived httpOnly cookie. The identity itself is taken from
  // the verified Google profile, never from the browser.
  await setPendingGuideSignup({ kind, ...details });

  try {
    const result = await signIn("google", { redirect: false, redirectTo });
    if (!result || result.error || !result.url) {
      return { ok: false, message: "Google sign in could not be started." };
    }
    return { ok: true, redirectTo: result.url };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, message: "Google sign in was cancelled." };
    }
    throw error;
  }
}
