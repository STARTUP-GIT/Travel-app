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
  const configured = (
    typeof window === "undefined"
      ? process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL
      : process.env.NEXT_PUBLIC_API_URL ?? process.env.BACKEND_URL
  )?.trim() ?? "";

  if (!configured || !/^https?:\/\/[^\s/]+/i.test(configured)) {
    throw new Error(
      "BACKEND_URL or NEXT_PUBLIC_API_URL is not configured for the service frontend. Set the deployed backend URL for this Vercel project."
    );
  }

  return configured.replace(/\/+$/, "");
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

function isHtml(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const trimmed = text.trim();
  return (
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    /<[a-z][\s\S]*>/i.test(trimmed)
  );
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = "We couldn't process this request. Please try again.";
    let details: unknown;
    try {
      const text = await res.text();
      try {
        const data = JSON.parse(text);
        details = data;
        if (Array.isArray(data) && data.length) {
          // no message in arrays
        } else if (typeof data?.message === "string" && data.message && !isHtml(data.message)) {
          message = data.message.trim();
        } else if (typeof data === "string" && data && !isHtml(data)) {
          message = data.trim();
        }
      } catch {
        // Non-JSON response (e.g. HTML from server/proxy error)
        if (text && !isHtml(text) && text.trim().length < 200) {
          message = text.trim();
        }
      }
    } catch {
      // Body could not be read
    }
    throw new ApiError(message, res.status, details);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

/**
 * Public (unauthenticated) backend client. Used for the read-only endpoints
 * that need no session: app config, districts, places. Every authenticated
 * provider call goes through the server actions in
 * `features/provider/api/provider.actions.ts` instead, so the backend token is
 * only ever read on the server.
 */
export async function http<T>(
  path: string,
  init: HttpInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);

  if (init.body !== undefined && !(init.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }

  const { query, ...rest } = init;
  const finalPath = buildPath(path, query);
  const payload: RequestInit = {
    ...rest,
    headers,
    body: serializeBody(init.body),
  };

  const res = await fetch(`${getApiBaseUrl()}${finalPath}`, {
    ...payload,
    cache: "no-store",
    credentials: "include",
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
