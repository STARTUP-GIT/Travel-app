import type { AdminProfile } from "@/lib/types";

type AdminErrorBody = Partial<{
  error: string | { message?: string };
}>;

function extractError(data: unknown, fallback: string): string {
  if (!data) return fallback;
  const body = data as AdminErrorBody;
  if (typeof body.error === "string" && body.error) return body.error;
  if (
    typeof body.error === "object" &&
    typeof body.error.message === "string" &&
    body.error.message
  ) {
    return body.error.message;
  }
  return fallback;
}

/** Admin session API. All requests go through the proxy with the httpOnly cookie. */
export const adminSessionApi = {
  async signUp(input: {
    fullname: string;
    username: string;
    email: string;
    password: string;
  }): Promise<void> {
    const res = await fetch("/api/proxy/admin/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => undefined);
      throw new Error(extractError(data, "Account creation failed"));
    }
  },

  async signIn(input: { email: string; password: string }): Promise<void> {
    const res = await fetch("/api/proxy/admin/api/auth/signin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => undefined);
      throw new Error(extractError(data, "Sign-in failed"));
    }
  },

  async signOut(): Promise<void> {
    await fetch("/api/proxy/admin/api/auth/signout", {
      method: "POST",
      credentials: "same-origin",
    });
  },

  async getProfile(): Promise<AdminProfile> {
    const res = await fetch("/api/proxy/admin/profile/api/getprofile", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Unauthorized");
    const data = (await res.json()) as { admin: AdminProfile };
    return data.admin;
  },
};