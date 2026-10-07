/**
 * Central HTTP client.
 *
 * The mobile app talks to the SAME Express backend the customer web frontend
 * uses — there is no mobile-only API, no secondary backend and no mock data.
 * Screens never call `fetch`; they import the domain functions in
 * `src/services/*`, which all go through here.
 *
 * Responsibilities kept in this one place:
 *   - base URL resolution (and failing loudly when it is not configured)
 *   - auth header for the backend session token
 *   - common headers / JSON parsing
 *   - timeouts (the backend can leave a guarded request unanswered)
 *   - normalising the backend's four different response envelopes
 *   - mapping every failure onto one clean, user-safe error message
 */

import { getApiBaseUrl, REQUEST_TIMEOUT_MS } from "@/config";

/* -------------------------------------------------------------------------- */
/* Errors                                                                     */
/* -------------------------------------------------------------------------- */

export type ApiErrorKind =
  | "not_configured"
  | "network"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "server"
  | "unknown";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  /** Field-level messages from the backend's Zod mapping, when present. */
  readonly fieldErrors?: { field: string; message: string }[];

  constructor(
    kind: ApiErrorKind,
    message: string,
    status = 0,
    fieldErrors?: { field: string; message: string }[],
  ) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  get isAuthError(): boolean {
    return this.kind === "unauthorized" || this.kind === "forbidden";
  }
}

/**
 * A configuration problem rather than a runtime failure. Callers route this to
 * a "finish setting up the app" screen rather than to a retry button.
 */
export class ConfigError extends ApiError {
  constructor(message: string) {
    super("not_configured", message);
    this.name = "ConfigError";
  }
}

/* -------------------------------------------------------------------------- */
/* Token                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Reads the current session token. Implemented by the auth layer and injected
 * here at module load, which keeps this file free of any storage import and so
 * free of a circular dependency (auth → api → auth).
 */
type TokenReader = () => string | null;

let readToken: TokenReader = () => null;

/** Called once by the auth provider when it mounts. */
export function setTokenReader(reader: TokenReader): void {
  readToken = reader;
}

/**
 * Invoked when a request fails with 401/403, so the auth layer can drop an
 * expired session instead of leaving the UI in a signed-in-looking state.
 */
type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler = () => {};

export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorized = handler;
}

/* -------------------------------------------------------------------------- */
/* Messages                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * User-safe wording for every failure mode.
 *
 * Prisma error, SQL text, a stack trace, a
 * backend hostname or a migration name — those either leak internals or help
 * nobody. Only messages the backend produced for humans are forwarded, and even
 * those are whitelisted by shape below.
 */
function messageForStatus(status: number, body: unknown): string {
  const serverMessage = extractServerMessage(body);

  switch (status) {
    case 400:
      return serverMessage ?? "Please check the details you entered and try again.";
    case 401:
      return "Your session has expired. Please sign in again.";
    case 403:
      return serverMessage ?? "You do not have access to this right now.";
    case 404:
      return "We couldn't find what you were looking for.";
    case 409:
      return serverMessage ?? "That already exists.";
    case 413:
      return "That file is too large. Please choose a smaller one.";
    default:
      return status >= 500
        ? "Our servers had a problem. Please try again in a moment."
        : "Something went wrong. Please try again.";
  }
}

/**
 * Pulls a human-readable message out of the backend's error bodies.
 *
 * The backend is not consistent here — most routes send `{ message }`, but
 * `signIn` sends a bare JSON *string* for a bad password, and the upload route
 * uses `{ success, error }`. All three are handled; anything else is ignored
 * rather than stringified, so an unexpected shape can never leak a stack trace
 * into the UI.
 */
function extractServerMessage(body: unknown): string | undefined {
  if (typeof body === "string") {
    return isSafeMessage(body) ? body : undefined;
  }
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    for (const key of ["message", "error"] as const) {
      const value = record[key];
      if (typeof value === "string" && isSafeMessage(value)) return value;
    }
  }
  return undefined;
}

const MAX_SERVER_MESSAGE_LENGTH = 200;

/** Rejects anything that looks like a stack trace or internal diagnostic. */
function isSafeMessage(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_SERVER_MESSAGE_LENGTH) return false;
  if (/\n\s*at\s|\bat\s+\w+\s*\(|prisma|sqlstate|syntax error|relation "|column does not exist/i.test(trimmed)) {
    return false;
  }
  return true;
}

/* -------------------------------------------------------------------------- */
/* Envelope helpers                                                           */
/* -------------------------------------------------------------------------- */

/**
 * The backend has no single envelope convention. These two helpers normalise
 * the two shapes that appear most: a bare array / bare object, and a single-key
 * wrapper such as `{ states }`, `{ booking }`, `{ reservation }`.
 */
export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/* -------------------------------------------------------------------------- */
/* Request                                                                    */
/* -------------------------------------------------------------------------- */

export type QueryValue = string | number | boolean | undefined | null;

type HttpInit = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
  /** Overrides the global timeout for slow uploads. */
  timeoutMs?: number;
  /** Set for multipart bodies so no content-type is forced. */
  isMultipart?: boolean;
};

const BASE_URL_MISSING_MESSAGE =
  "The app is not connected to a backend yet. Add EXPO_PUBLIC_API_BASE_URL to your .env and restart the app.";

/**
 * Retains the module-level base URL resolution from config so callers get the
 * ConfigError instead of silently building a relative URL.
 */
function resolveBaseUrl(): string {
  return getApiBaseUrl() ?? "";
}

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const base = resolveBaseUrl();
  const suffix = path.startsWith("/") ? path : `/${path}`;

  if (!query) return `${base}${suffix}`;

  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  }
  if (parts.length === 0) return `${base}${suffix}`;
  const separator = suffix.includes("?") ? "&" : "?";
  return `${base}${suffix}${separator}${parts.join("&")}`;
}

/** True for React Native's FormData, which must not be JSON-stringified. */
function isFormData(body: unknown): body is FormData {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

function isPlainObject(body: unknown): body is Record<string, unknown> {
  if (body === null || typeof body !== "object") return false;
  if (Array.isArray(body) || isFormData(body)) return false;
  const proto = Object.getPrototypeOf(body);
  return proto === Object.prototype || proto === null;
}

export async function http<T>(path: string, init: HttpInit = {}): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new ConfigError(BASE_URL_MISSING_MESSAGE);
  }

  const {
    method = "GET",
    body,
    query,
    headers: extraHeaders,
    timeoutMs = REQUEST_TIMEOUT_MS,
    isMultipart = false,
  } = init;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...extraHeaders,
  };

  // `Authorization: Bearer` is the reliable path from a native client — the
  // backend's cookie is httpOnly + SameSite=Strict, and React Native's fetch
  // does not keep a cookie jar. `auth.middleware.ts` reads the header directly.
  const token = readToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (isFormData(body) || isMultipart) {
      payload = body as BodyInit;
      // No Content-Type: the runtime must add the multipart boundary itself.
    } else if (typeof body === "string") {
      payload = body;
      headers["Content-Type"] ??= "application/json";
    } else if (isPlainObject(body) || Array.isArray(body)) {
      payload = JSON.stringify(body);
      headers["Content-Type"] = "application/json";
    } else {
      payload = body as BodyInit;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: payload,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("timeout", "That took too long. Please try again.");
    }
    throw new ApiError(
      "network",
      "We couldn't reach the server. Check your connection and try again.",
    );
  } finally {
    clearTimeout(timer);
  }

  return handleResponse<T>(response);
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const raw = await readBody(response);

  if (!response.ok) {
    const kind: ApiErrorKind =
      response.status === 401
        ? "unauthorized"
        : response.status === 403
          ? "forbidden"
          : response.status === 404
            ? "not_found"
            : response.status === 400 || response.status === 409 || response.status === 413
              ? "validation"
              : response.status >= 500
                ? "server"
                : "unknown";

    const fieldErrors = Array.isArray(asRecord(raw).errors)
      ? (asRecord(raw).errors as { field: string; message: string }[])
      : undefined;

    const error = new ApiError(
      kind,
      messageForStatus(response.status, raw),
      response.status,
      fieldErrors,
    );

    // An expired token must not leave the app looking signed in.
    if (error.isAuthError) onUnauthorized();

    throw error;
  }

  return raw as T;
}

/**
 * Reads the body defensively.
 *
 * The backend has no catch-all 404 handler, so an unmatched path falls through
 * to Express's default HTML error page. Checking the content type keeps that
 * from being surfaced as a parse error or, worse, as a stringified blob.
 */
async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("json")) {
    // Drain so the connection can be reused, then treat it as an opaque body.
    try {
      await response.text();
    } catch {
      // ignore
    }
    return null;
  }

  try {
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/* -------------------------------------------------------------------------- */
/* Verb helpers                                                               */
/* -------------------------------------------------------------------------- */

export const api = {
  get: <T>(path: string, init?: Omit<HttpInit, "body" | "method">) =>
    http<T>(path, { ...init, method: "GET" }),
  post: <T>(path: string, body?: unknown, init?: Omit<HttpInit, "body" | "method">) =>
    http<T>(path, { ...init, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, init?: Omit<HttpInit, "body" | "method">) =>
    http<T>(path, { ...init, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, init?: Omit<HttpInit, "body" | "method">) =>
    http<T>(path, { ...init, method: "PUT", body }),
  delete: <T>(path: string, init?: Omit<HttpInit, "body" | "method">) =>
    http<T>(path, { ...init, method: "DELETE" }),
};

/**
 * Turns any thrown value into a message safe to show a user.
 * Keeps error handling in one place so no screen can leak a raw rejection.
 */
export function toUserMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message && error.name !== "TypeError") {
    return isSafeMessage(error.message) ? error.message : fallback;
  }
  return fallback;
}