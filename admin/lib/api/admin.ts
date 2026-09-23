import type { AdminProfile } from "@/lib/types";

/**
 * Admin profile API. Only non-authentication profile data is fetched through
 * the server-side proxy (the proxy attaches the verified admin token stored in
 * the encrypted NextAuth session). All authentication is handled by NextAuth
 * at /api/auth/[...nextauth] — nothing here signs in, signs out or creates
 * accounts anymore.
 */
export const adminProfileApi = {
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