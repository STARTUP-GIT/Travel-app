import { getApiBaseUrl } from "@/lib/api/config";
import { ApiError } from "@/lib/api/errors";

export { ApiError };

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

type HttpInit = Omit<RequestInit, "body"> & {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
};

function serializeBody(body: unknown): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;
  if (body instanceof FormData) return body;
  if (body instanceof URLSearchParams) return body;
  if (typeof body === "string") return body;
  return JSON.stringify(body);
}

function buildPath(path: string, query?: HttpInit["query"]): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}${path.includes("?") ? "&" : "?"}${qs}` : path;
}

/**
 * The admin config routes are mounted at /api/admin/* (backend app.ts:
 * app.use('/api/admin', adminConfigRoutes)). Admin CRUD pages address them as
 * /admin/api/* for readability; toBackendPath normalises that prefix to the
 * backend's real mount.
 */
export function toBackendPath(path: string): string {
  return path
    .replace(/^\/api\/proxy/, "")
    .replace(/^\/admin\/api\//, "/api/admin/");
}

// The admin backend token is the JWT returned by the backend sign-in endpoints
// (/admin/api/auth/signin, /admin/api/auth/google-signin) and stored inside the
// encrypted NextAuth JWT, then exposed to the browser through the NextAuth
// session endpoint (/api/auth/session).
let cachedToken: string | null | undefined;
let tokenPromise: Promise<string | null> | null = null;

async function fetchSessionToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/auth/session", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as
      | { adminToken?: string; admin?: { id?: string; email?: string; name?: string } }
      | null;
    // Prefer the backend token; fall back to nothing (caller decides what to do).
    return data?.adminToken ?? null;
  } catch {
    return null;
  }
}

/** Returns the backend admin token for the current NextAuth session. */
export async function getAdminToken(): Promise<string | null> {
  if (!isBrowser()) return null;
  if (cachedToken !== undefined) return cachedToken;
  tokenPromise ??= fetchSessionToken().then(
    (token) => (cachedToken = token)
  );
  await tokenPromise;
  return cachedToken ?? null;
}

/** Clears the cached token (e.g. after the session expires / user signs out). */
export function clearCachedAdminToken(): void {
  cachedToken = undefined;
  tokenPromise = null;
}

/** Builds request headers, attaching the backend bearer token when available. */
export async function withAuthHeaders(
  headers?: HeadersInit
): Promise<Headers> {
  const finalHeaders = new Headers(headers);
  if (isBrowser()) {
    const token = await getAdminToken();
    if (typeof token === "string" && token) {
      finalHeaders.set("authorization", `Bearer ${token}`);
    }
  }
  return finalHeaders;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (
      res.status === 401 &&
      isBrowser() &&
      !window.location.pathname.startsWith("/login")
    ) {
      clearCachedAdminToken();
      window.location.assign("/login");
    }

    let message = `Request failed with status ${res.status}`;
    let details: unknown;
    try {
      const data = await res.json();
      details = data;
      if (typeof data?.message === "string" && data.message) message = data.message;
      else if (typeof data?.error === "string" && data.error) message = data.error;
      else if (typeof data === "string" && data) message = data;
    } catch {
      // non-JSON error body
    }
    throw new ApiError(message, res.status, details);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

/**
 * Central API client for the admin panel. The browser calls the Express
 * backend DIRECTLY: the absolute backend base URL is resolved with
 * getApiBaseUrl() (the same NEXT_PUBLIC_API_URL ?? BACKEND_URL mechanism used
 * by the customer frontend) and the admin bearer token from the NextAuth
 * session is attached as an Authorization header.
 */
export async function http<T>(
  path: string,
  init: HttpInit = {}
): Promise<T> {
  const headers = await withAuthHeaders(init.headers);

  if (init.body !== undefined && !(init.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }

  const finalPath = buildPath(toBackendPath(path), init.query);
  const rest = { ...init };
  delete rest.query;
  const payload: RequestInit = {
    ...rest,
    headers,
    body: serializeBody(init.body),
  };

  const res = await fetch(`${getApiBaseUrl()}${finalPath}`, {
    ...payload,
    credentials: "include",
    cache: "no-store",
  });
  return handle<T>(res);
}

export const api = {
  get: <T>(path: string, init?: HttpInit) => http<T>(path, { ...init, method: "GET" }),
  post: <T>(path: string, init?: HttpInit) => http<T>(path, { ...init, method: "POST" }),
  patch: <T>(path: string, init?: HttpInit) => http<T>(path, { ...init, method: "PATCH" }),
  put: <T>(path: string, init?: HttpInit) => http<T>(path, { ...init, method: "PUT" }),
  del: <T>(path: string, init?: HttpInit) => http<T>(path, { ...init, method: "DELETE" }),
};