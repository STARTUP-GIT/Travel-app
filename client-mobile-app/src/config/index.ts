/**
 * Single configuration seam for the customer mobile app.
 *
 * Everything environment-specific is read here exactly once, validated, and
 * re-exported as plain typed constants. Screens and the API client import from
 * here and never touch `process.env` themselves, so swapping staging for
 * production is a change to `.env` alone — no application code changes.
 *
 * Rules this module enforces:
 *   - No secrets. Everything here is public client configuration. The mobile
 *     bundle is shipped to end users and can be read in full, so nothing that
 *     grants write access may live in this project.
 *   - The backend is the SAME Express backend the customer web frontend uses.
 *     There is no mobile-only API and no mock fallback.
 */

/* -------------------------------------------------------------------------- */
/* Environment                                                                */
/* -------------------------------------------------------------------------- */

function readEnv(key: string): string | undefined {
  // `process.env.EXPO_PUBLIC_*` values are inlined by Metro at build time.
  const value = process.env[key];
  return typeof value === "string" ? value.trim() : undefined;
}

function firstNonEmpty(...values: (string | undefined)[]): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

/**
 * `EXPO_PUBLIC_API_BASE_URL` is the documented name. The two aliases are
 * accepted so an existing web-frontend `.env` can be reused verbatim.
 */
function readApiBaseUrl(): string | undefined {
  return firstNonEmpty(
    readEnv("EXPO_PUBLIC_API_BASE_URL"),
    readEnv("EXPO_PUBLIC_BACKEND_URL"),
    readEnv("BACKEND_URL"),
  );
}

function isValidHttpUrl(value: string): boolean {
  return /^https?:\/\/[^\s/]+/i.test(value);
}

/** Strips trailing slashes so paths can always be joined with a leading `/`. */
function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * `null` means "not configured". Callers surface a configuration screen rather
 * than issuing requests against a guess — the web frontend deliberately fails
 * loudly here too, because silently querying the wrong database and rendering an
 * empty app is worse than an honest error.
 */
export function getApiBaseUrl(): string | null {
  const configured = readApiBaseUrl();
  if (!configured || !isValidHttpUrl(configured)) return null;
  return normalizeBaseUrl(configured);
}

export const isBackendConfigured = (): boolean => getApiBaseUrl() !== null;

/* -------------------------------------------------------------------------- */
/* Google Sign-In                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Google OAuth client ids are always
 * `<project number>-<generated id>.apps.googleusercontent.com`.
 *
 * `.env.example` ships `YOUR_WEB_CLIENT_ID.apps.googleusercontent.com` until the
 * real value is pasted in. That sentinel matches Google's domain but nothing
 * else about the format, so testing the *shape* — rather than comparing against
 * the literal placeholder — is what lets a genuine client id be accepted the
 * moment it is added, with no edit to this file.
 */
const GOOGLE_CLIENT_ID_PATTERN =
  /^[0-9]+-[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/;

/**
 * Second net for placeholders that happen to be shaped like a real id
 * (`123456789012-CHANGEME.apps.googleusercontent.com`), which the shape check
 * alone would wave through.
 *
 * The word must sit between non-alphanumeric boundaries. That is what keeps the
 * short words safe: the generated part of a genuine id is a single unbroken run
 * of random characters, so `example` inside one has letters either side of it and
 * cannot match here. Without those boundaries a real id would be rejected by
 * chance roughly once in six thousand — a bad trade for catching a placeholder
 * the shape check already covers.
 */
const GOOGLE_CLIENT_ID_PLACEHOLDER_PATTERN =
  /(^|[^A-Za-z0-9])(your|replace|todo|fixme|change_?me|placeholder|insert|enter_?here|dummy|fake|sample|example|xxx)([^A-Za-z0-9]|$)/i;

function isUsableGoogleClientId(value: string): boolean {
  if (GOOGLE_CLIENT_ID_PLACEHOLDER_PATTERN.test(value)) return false;
  return GOOGLE_CLIENT_ID_PATTERN.test(value);
}

/**
 * Google *web* client id. Public by design: it identifies this app to Google
 * and cannot authorise anything on its own. The matching client secret is never
 * present in this project — the backend exchanges the auth code, not the app.
 *
 * `null` means "this build has no client id Google would accept". That covers an
 * empty value and the documented placeholder alike, and it is enforced here so a
 * placeholder can never reach `expo-auth-session`: the browser round-trip would
 * end on Google's own error page, which is neither readable by the app nor
 * something a traveller can do anything about.
 */
export const GOOGLE_CLIENT_ID: string | null = readUsableGoogleClientId() ?? null;

function readUsableGoogleClientId(): string | undefined {
  const configured = firstNonEmpty(
    readEnv("EXPO_PUBLIC_GOOGLE_CLIENT_ID"),
    readEnv("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID"),
  );
  return configured && isUsableGoogleClientId(configured) ? configured : undefined;
}

export const isGoogleAuthConfigured = (): boolean => GOOGLE_CLIENT_ID !== null;

/* -------------------------------------------------------------------------- */
/* Maps                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Only consumed if the in-app map view is switched on. The customer app's map
 * cards deep-link to the platform map app, which needs no key at all, so an empty
 * value here is the supported default.
 */
export const GOOGLE_MAPS_ANDROID_KEY: string | null =
  firstNonEmpty(readEnv("EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY")) ?? null;

/* -------------------------------------------------------------------------- */
/* App shell                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Custom scheme. Kept here so `Linking.createURL` and `app.json` describe the
 * same string; `app.json` remains the source of truth for the native build.
 */
export const APP_SCHEME: string =
  firstNonEmpty(readEnv("EXPO_PUBLIC_APP_SCHEME"), "karnatakatourism") as string;

/**
 * Brand shown while the real, admin-controlled branding is still loading.
 * `GET /api/settings` replaces this on every launch.
 */
export const FALLBACK_APP_NAME = "Karnataka Tourism Guide";
export const FALLBACK_TAGLINE = "Explore • Experience • Belong";

/* -------------------------------------------------------------------------- */
/* Networking                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * The backend leaves some guarded routes unanswered on a non-validation crash
 * (see `signIn`'s catch block), so a request can hang forever. A ceiling here
 * turns that into an ordinary user-facing error instead of a frozen screen.
 */
export const REQUEST_TIMEOUT_MS = 20_000;

/* -------------------------------------------------------------------------- */
/* Derived Google OAuth redirect                                              */
/* -------------------------------------------------------------------------- */

import { Platform } from "react-native";
import * as Linking from "expo-linking";

/**
 * OAuth redirect for the current platform.
 *
 * Matches the scheme in `app.json`, which is why the scheme lives in config
 * rather than being sprinkled through the auth code.
 */
export function googleRedirectUri(): string {
  return Linking.createURL("/auth/callback");
}

/** `platform` is threaded through for the `auth.expo.io` proxy used on web. */
export function googleAuthRedirectOptions(platform: string = Platform.OS) {
  const scheme = APP_SCHEME;

  if (platform === "web") {
    return { uri: `${googleRedirectUri()}/`, scheme };
  }
  return { scheme, path: "/auth/callback" };
}