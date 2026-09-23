import { getApiBaseUrl } from "@/lib/api/config";
import { withAuthHeaders } from "@/lib/api/client";
import type { AdminProfile } from "@/lib/types";

/**
 * Admin profile API. Called DIRECTLY against the Express backend: the absolute
 * backend URL is resolved with getApiBaseUrl (the same
 * NEXT_PUBLIC_API_URL ?? BACKEND_URL mechanism used by the customer frontend)
 * and the admin bearer token from the NextAuth session is attached as an
 * Authorization header. Authentication itself is handled exclusively by
 * NextAuth at /api/auth/[...nextauth] — nothing here signs in, signs out or
 * creates accounts.
 */
export const adminProfileApi = {
  async getProfile(): Promise<AdminProfile> {
    const headers = await withAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/admin/profile/api/getprofile`, {
      headers,
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Unauthorized");
    const data = (await res.json()) as { admin: AdminProfile };
    return data.admin;
  },
};