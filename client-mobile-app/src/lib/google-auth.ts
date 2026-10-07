/**
 * Google Sign-In.
 *
 * Uses `expo-auth-session`'s request flow through Google's native web view, which
 * needs only a public *web* OAuth client id — the client secret is never in this
 * app, and the identity is exchanged by the backend for a session JWT.
 *
 * Three platform notes that matter:
 *   - The redirect must match `scheme` in `app.json` or the browser returns
 *     without ever reaching the app.
 *   - A dismissed browser is a normal user action, so it is reported as
 *     "cancelled" and never surfaced as an error.
 *   - Until a real client id is in the environment, this reports
 *     `unavailable` up front rather than opening a browser that can only fail.
 *     Dropping the real id into `EXPO_PUBLIC_GOOGLE_CLIENT_ID` is all that is
 *     needed to switch the flow back on.
 */

import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { GOOGLE_CLIENT_ID, googleRedirectUri } from "@/config";
import type { GoogleIdentity } from "@/services/auth.service";

// Required for the session to complete on iOS; harmless on Android and web.
WebBrowser.maybeCompleteAuthSession();

const SCOPES = ["openid", "email", "profile"];

/**
 * Shown whenever Google Sign-In cannot be started — this build has no client id
 * Google would accept, or the browser flow failed before it began.
 *
 * One message covers every case on purpose. An unset or placeholder environment
 * variable is not something a traveller can act on, and the underlying reason
 * (OAuth, configuration, network) must never be surfaced to them.
 */
export const GOOGLE_UNAVAILABLE_MESSAGE =
  "Google Sign-In is temporarily unavailable. Please try again later.";

export type GoogleResult =
  | { status: "success"; identity: GoogleIdentity }
  | { status: "cancelled" }
  | { status: "unavailable"; reason: string };

export async function signInWithGoogleAccount(): Promise<GoogleResult> {
  // Checked before anything from `expo-auth-session` runs. `@/config` already
  // discards a missing or placeholder client id, so this is the last place the
  // OAuth session could otherwise be built from a value Google would reject.
  if (!GOOGLE_CLIENT_ID) {
    return { status: "unavailable", reason: GOOGLE_UNAVAILABLE_MESSAGE };
  }

  try {
    // `redirectUri` must match `scheme` in `app.json`, otherwise the browser
    // closes without ever handing control back to the app.
    const redirectUri = googleRedirectUri();

    const request = new AuthSession.AuthRequest({
      clientId: GOOGLE_CLIENT_ID,
      scopes: SCOPES,
      responseType: AuthSession.ResponseType.IdToken,
      redirectUri,
      extraParams: { prompt: "select_account" },
    });

    // This version of expo-auth-session takes the issuer alone; the client id is
    // supplied on the AuthRequest above.
    const discovery = await AuthSession.fetchDiscoveryAsync(
      "https://accounts.google.com",
    );

    const result = await request.promptAsync(discovery);

    if (result.type === "cancel" || result.type === "dismiss") {
      return { status: "cancelled" };
    }

    if (result.type !== "success") {
      return { status: "unavailable", reason: "Google sign-in could not be completed." };
    }

    const identity = extractIdentity(result);
    if (!identity) {
      return {
        status: "unavailable",
        reason: "Google did not share an email address. Choose an account that has one.",
      };
    }

    return { status: "success", identity };
  } catch {
    return {
      status: "unavailable",
      reason: "Google sign-in could not be started. Please try again.",
    };
  }
}

/**
 * Pulls the claims out of Google's response.
 *
 * Only email and name are read. The backend identifies the account by email and
 * issues its own token, so nothing else in Google's response is trusted.
 */
function extractIdentity(result: AuthSession.AuthSessionResult): GoogleIdentity | null {
  const response = (result as { authentication?: { idToken?: string } }).authentication;
  const idToken = response?.idToken;
  if (typeof idToken !== "string" || idToken.length === 0) return null;

  const claims = decodeJwtPayload(idToken);
  const email = typeof claims.email === "string" ? claims.email.trim() : "";
  if (!email) return null;

  return {
    email,
    fullname:
      typeof claims.name === "string" && claims.name.trim()
        ? claims.name
        : email.split("@")[0] || "Traveller",
    profilepic: typeof claims.picture === "string" ? claims.picture : undefined,
  };
}

/** Base64url-decodes a JWT payload to read claims. Verification is the backend's job. */
function decodeJwtPayload(token: string): Record<string, unknown> {
  const segment = token.split(".")[1];
  if (!segment) return {};

  try {
    const normalized = segment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");

    // `atob` is present in React Native and in every browser engine this app
    // targets. `Buffer` is deliberately not used: it is a Node global and would
    // throw on a device even though the fallback branch is unreachable there.
    const decode = globalThis.atob;
    if (typeof decode !== "function") return {};

    const json = decode(padded);
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}