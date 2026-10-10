import "server-only";

import { getApiBaseUrl } from "@/lib/api/client";

export type BackendRequestInit = {
  method?: string;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
};

/**
 * Single server-side entry point to the Express backend.
 *
 * Authenticated provider calls identify the caller with the backend JWT stored
 * in this app's httpOnly `token` cookie. The Express middleware accepts either
 * the API host's `token` cookie or `Authorization: Bearer`; the Bearer header
 * is used here so the backend domain cookie jar is never involved.
 */
export async function backendRequest(
  path: string,
  { method = "GET", body, token, headers }: BackendRequestInit = {}
): Promise<Response> {
  const finalHeaders = new Headers(headers);

  if (body !== undefined && body !== null && !(body instanceof FormData)) {
    finalHeaders.set("content-type", "application/json");
  }

  if (token) {
    finalHeaders.set("authorization", `Bearer ${token}`);
  }

  return fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers: finalHeaders,
    body:
      body === undefined || body === null
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
    cache: "no-store",
  });
}

export function isHtml(text: string): boolean {
  if (!text || typeof text !== "string") return false;
  const trimmed = text.trim();
  return (
    trimmed.startsWith("<!DOCTYPE") ||
    trimmed.startsWith("<html") ||
    /<[a-z][\s\S]*>/i.test(trimmed)
  );
}

/** Reads a JSON body, tolerating the empty/plain-text bodies some handlers use. */
export async function readJson<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

export function errorMessage(data: unknown, fallback: string): string {
  if (typeof data === "string") {
    const trimmed = data.trim();
    if (trimmed && !isHtml(trimmed)) {
      return trimmed;
    }
    return fallback;
  }
  if (
    data &&
    typeof data === "object" &&
    "message" in data &&
    typeof (data as { message?: unknown }).message === "string"
  ) {
    const msg = (data as { message: string }).message.trim();
    if (msg && !isHtml(msg)) {
      return msg;
    }
    return fallback;
  }
  return fallback;
}

/** Backend validation errors arrive as `errors: [{ field, message }]`. */
export function fieldErrors(data: unknown): Record<string, string> {
  if (!data || typeof data !== "object" || !("errors" in data)) return {};
  const list = (data as { errors?: unknown }).errors;
  if (!Array.isArray(list)) return {};
  const out: Record<string, string> = {};
  for (const entry of list) {
    if (entry && typeof entry === "object" && "field" in entry) {
      const { field, message } = entry as { field: string; message: string };
      if (field) out[field] = message;
    }
  }
  return out;
}
