/**
 * Authentication service.
 *
 * Talks to the existing user auth routes on the same backend:
 *
 *   POST /users/api/auth/signup          email/password registration
 *   POST /users/api/auth/signin          -> { message, token }
 *   POST /users/api/auth/google-signup   -> 201 { user } | 409 already exists
 *   POST /users/api/auth/google-signin   -> { message, token }
 *   POST /users/api/auth/signout
 *
 * The backend also sets an httpOnly `token` cookie, which the web frontend
 * relies on. A native client keeps no cookie jar, so it reads the same JWT out of
 * the sign-in response body and sends it as `Authorization: Bearer`, which
 * `auth.middleware.ts` accepts for exactly this reason.
 */

import { api, ApiError, asRecord } from "@/lib/api/client";
import { clearToken, saveToken } from "@/lib/storage/token-store";
import type {
  CustomerProfile,
  GoogleSignupInput,
  SigninInput,
  SignupInput,
} from "@/types/api";

/**
 * `signIn` can leave the request unanswered: a non-validation throw inside its
 * `try` is swallowed and no response is ever sent, so the socket simply hangs.
 * The client's global timeout converts that into a normal error.
 */

/* -------------------------------------------------------------------------- */
/* Token plumbing                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The token is written to the secure store before this returns, so any request
 * issued immediately afterwards already carries it.
 */
async function establishSession(response: unknown): Promise<string> {
  const token = asRecord(response).token;
  if (typeof token !== "string" || !token) {
    // A 200 without a token would otherwise leave the UI looking signed in.
    throw new ApiError("server", "We couldn't complete your sign in. Please try again.");
  }
  await saveToken(token);
  return token;
}

/* -------------------------------------------------------------------------- */
/* Email + password                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Registers an account.
 *
 * The backend returns only `{ message }` with a 201 — no token — so this must be
 * followed by `signIn`. Returning without a token here is intentional and
 * mirrors the web frontend's behaviour.
 */
export async function signUp(input: SignupInput): Promise<void> {
  await api.post("/users/api/auth/signup", {
    email: input.email,
    username: input.username,
    password: input.password,
    fullname: input.fullname,
    phonenumber: input.phonenumber,
    provider: "email",
  });
}

export async function signIn(input: SigninInput): Promise<string> {
  const response = await api.post("/users/api/auth/signin", {
    email: input.email,
    password: input.password,
    ...(input.username?.trim() ? { username: input.username.trim() } : {}),
  });
  return establishSession(response);
}

/* -------------------------------------------------------------------------- */
/* Google                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The claims the backend's Google routes accept. Obtained from the Google SDK in
 * the sign-in screen; nothing here is trusted on its own, because the backend
 * looks the account up by email and issues its own JWT.
 */
export type GoogleIdentity = GoogleSignupInput;

/**
 * Ensures a Google identity maps to a customer account and returns a session.
 *
 * `409` is a success case here, not a failure: it means the account already
 * exists and only the sign-in is needed. Treating it as an error would show
 * "email already in use" to a returning user tapping the same Google button.
 */
export async function signInWithGoogle(input: GoogleIdentity): Promise<string> {
  try {
    const created = await api.post("/users/api/auth/google-signup", {
      email: input.email,
      fullname: input.fullname,
      ...(input.profilepic ? { profilepic: input.profilepic } : {}),
    });

    // Only needed to exercise the endpoint's contract; the token comes from
    // sign-in in both paths.
    void asRecord(created).user;
  } catch (error) {
    const isConflict =
      error instanceof ApiError &&
      (error.status === 409 ||
        error.kind === "validation");
    if (!isConflict) throw error;
  }

  const response = await api.post("/users/api/auth/google-signin", {
    email: input.email,
  });
  return establishSession(response);
}

/* -------------------------------------------------------------------------- */
/* Sign out                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Ends the session.
 *
 * The token is deleted from the device first: signing out has to succeed even if
 * the request fails, otherwise a user on a flaky connection could not sign out
 * at all. The backend call is still made so the cookie is cleared for the web
 * session on the same device, and its failure is deliberately swallowed.
 */
export async function signOut(): Promise<void> {
  await clearToken();
  try {
    await api.post("/users/api/auth/signout");
  } catch {
    // The local session is already gone.
  }
}

/* -------------------------------------------------------------------------- */
/* Identity                                                                   */
/* -------------------------------------------------------------------------- */

export type { CustomerProfile };