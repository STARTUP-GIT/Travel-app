/**
 * All admin mutations go through the server-side data route (/api/proxy — a
 * data forwarder only; it rejects backend /api/auth/ paths, and authentication
 * itself happens exclusively via NextAuth at /api/auth/[...nextauth]).
 * Paths written as /admin/api/* are normalised to the backend's real mounts
 * (/api/admin/*) so PATCH/POST requests reach the existing endpoints instead
 * of 404ing on the admin origin.
 */
function toProxyUrl(path: string): string {
  if (path.startsWith("/api/proxy/")) return path;
  return `/api/proxy${path.replace(/^\/admin\/api\//, "/api/admin/")}`;
}

async function request(path: string, init: RequestInit): Promise<unknown> {
  const res = await fetch(toProxyUrl(path), { ...init, credentials: "same-origin" });
  if (res.status === 401 && typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
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
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function postJSON(path: string, body: unknown): Promise<unknown> {
  return request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}