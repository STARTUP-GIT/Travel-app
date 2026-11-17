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

import { GOOGLE_CLIENT_ID, googleRedirectUri } from "@/config";
import type { GoogleIdentity } from "@/services/auth.service";

const SCOPES = ["openid", "email", "profile"];

/**
 * Shown whenever Google Sign-In cannot be started — this build has no client id
 * Google would accept, or the browser flow failed before it began.
 */
export const GOOGLE_UNAVAILABLE_MESSAGE =
  "Google Sign-In is temporarily unavailable. Please try again later.";

export type GoogleResult =
  | { status: "success"; identity: GoogleIdentity }
  | { status: "cancelled" }
  | { status: "unavailable"; reason: string };

export async function signInWithGoogleAccount(): Promise<GoogleResult> {
  if (!GOOGLE_CLIENT_ID) {
    return { status: "unavailable", reason: GOOGLE_UNAVAILABLE_MESSAGE };
  }

  try {
    const AuthSession = await import("expo-auth-session");
    const WebBrowser = await import("expo-web-browser");
    WebBrowser.maybeCompleteAuthSession();

    const redirectUri = googleRedirectUri();

    const request = new AuthSession.AuthRequest({
      clientId: GOOGLE_CLIENT_ID,
      scopes: SCOPES,
      responseType: AuthSession.ResponseType.IdToken,
      redirectUri,
      extraParams: { prompt: "select_account" },
    });

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
      reason: "Google sign-in could not be started on this device. Please try again.",
    };
  }
}

/**
 * Pulls the claims out of Google's response.
 */
function extractIdentity(result: unknown): GoogleIdentity | null {
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

    const decode = globalThis.atob;
    if (typeof decode !== "function") return {};

    const json = decode(padded);
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
