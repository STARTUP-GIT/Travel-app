import "server-only";

import { getApiBaseUrl } from "@/lib/api/client";

export type BackendRequestInit = {
  method?: string;
  body?: BodyInit | null;
  token?: string | null;
  headers?: Record<string, string>;
};

export async function backendRequest(
  path: string,
  { method = "GET", body, token, headers }: BackendRequestInit = {}
): Promise<Response> {
  const finalHeaders = new Headers(headers);

  if (body) {
    finalHeaders.set("content-type", "application/json");
  }

  if (token) {
    finalHeaders.set("cookie", `token=${token}`);
  }

  return fetch(`${getApiBaseUrl()}${path}`, {
    method,
    headers: finalHeaders,
    body: body ?? undefined,
    cache: "no-store",
  });
}

/**
 * Calls the backend Google sign-in to obtain a fresh user session token for a
 * given email. Used to heal expired backend tokens transparently.
 */
export async function backendSigninWithEmail(
  email: string
): Promise<string | null> {
  try {
    const res = await backendRequest("/users/api/auth/google-signin", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { token?: string };
    return data.token ?? null;
  } catch {
    return null;
  }
}