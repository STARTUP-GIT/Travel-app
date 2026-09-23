import { getApiBaseUrl } from "@/lib/api/config";
import {
  clearCachedAdminToken,
  toBackendPath,
  withAuthHeaders,
} from "@/lib/api/client";

/**
 * Admin mutations call the Express backend DIRECTLY. Paths are normalised to
 * the backend's real mounts (toBackendPath: /admin/api/* -> /api/admin/), and
 * the admin bearer token from the NextAuth session is attached as an
 * Authorization header (the backend middleware accepts it as an alternative to
 * the httpOnly cookie).
 */
function toDirectUrl(path: string): string {
  return `${getApiBaseUrl()}${toBackendPath(path)}`;
}

async function request(path: string, init: RequestInit): Promise<unknown> {
  const headers = await withAuthHeaders(init.headers);

  if (init.body && !(init.body instanceof FormData)) {
    headers.set("content-type", "application/json");
  }

  const res = await fetch(toDirectUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });
  if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    clearCachedAdminToken();
    window.location.assign("/login");
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = (await res.json()) as { message?: string };
      if (data?.message) message = data.message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  return res.json();
}

export function patchJSON(path: string, body: unknown): Promise<unknown> {
  return request(path, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function postJSON(path: string, body: unknown): Promise<unknown> {
  return request(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function deleteJSON(path: string): Promise<unknown> {
  return request(path, {
    method: "DELETE",
  });
}