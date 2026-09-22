export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function getApiBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_API_URL ?? process.env.BACKEND_URL ?? "";

  if (!url) {
    throw new ApiError(
      "Backend API URL is not configured. Set BACKEND_URL or NEXT_PUBLIC_API_URL.",
      500
    );
  }

  return url.replace(/\/+$/, "");
}

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
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `${path}${path.includes("?") ? "&" : "?"}${qs}` : path;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    let details: unknown;
    try {
      const data = await res.json();
      details = data;
      if (Array.isArray(data) && data.length) {
        // no message in arrays
      } else if (typeof data?.message === "string" && data.message) {
        message = data.message;
      } else if (typeof data === "string" && data) {
        message = data;
      }
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
 * Central API client. On the browser it goes through the server-side proxy
 * (/api/proxy) so the backend token is never exposed to the client. On the
 * server it calls the backend directly (public endpoints only).
 */
export async function http<T>(
  path: string,
  init: HttpInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body !== undefined && !(init.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }

  const finalPath = buildPath(path, init.query);
  const { query: _query, ...rest } = init;
  const payload: RequestInit = {
    ...rest,
    headers,
    body: serializeBody(init.body),
  };

  if (isBrowser()) {
    const res = await fetch(`/api/proxy${finalPath}`, {
      ...payload,
      credentials: "same-origin",
      cache: "no-store",
    });
    return handle<T>(res);
  }

  if (!process.env.BACKEND_URL && !process.env.NEXT_PUBLIC_API_URL) {
    throw new ApiError("Backend API URL is not configured.", 500);
  }

  const res = await fetch(`${getApiBaseUrl()}${finalPath}`, {
    ...payload,
    cache: "no-store",
  });
  return handle<T>(res);
}

export const api = {
  get: <T>(path: string, init?: HttpInit) =>
    http<T>(path, { ...init, method: "GET" }),
  post: <T>(path: string, init?: HttpInit) =>
    http<T>(path, { ...init, method: "POST" }),
  patch: <T>(path: string, init?: HttpInit) =>
    http<T>(path, { ...init, method: "PATCH" }),
  put: <T>(path: string, init?: HttpInit) =>
    http<T>(path, { ...init, method: "PUT" }),
  del: <T>(path: string, init?: HttpInit) =>
    http<T>(path, { ...init, method: "DELETE" }),
};