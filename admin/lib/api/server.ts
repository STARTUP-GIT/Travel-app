import "server-only";

import { getApiBaseUrl } from "@/lib/api/config";

/**
 * Direct fetch to the backend from server-side route handlers. The admin
 * origin's browser token cookie (raw, as the browser sent it) is forwarded to
 * the backend so adminAuthMiddleware can authenticate.
 */
export async function backendRequest(
  path: string,
  init: {
    method?: string;
    body?: BodyInit | null;
    cookie?: string | null;
    headers?: Record<string, string>;
  } = {}
): Promise<Response> {
  const { method = "GET", body, cookie, headers } = init;

  const finalHeaders = new Headers(headers);

  if (body) {
    finalHeaders.set("content-type", "application/json");
  }

  if (cookie) {
    finalHeaders.set("cookie", cookie);
  }

  return fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers: finalHeaders,
    body: body ?? undefined,
    cache: "no-store",
  });
}