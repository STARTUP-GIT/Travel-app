import type { AdminProfile } from "@/lib/types";

declare module "next-auth" {
  interface Session {
    /** Verified existing admin (backend-authorized), only present for admins. */
    admin: AdminProfile | null;
    /** Backend admin JWT used to authenticate proxied admin API calls. */
    adminToken: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    admin?: AdminProfile;
    adminToken?: string;
  }
}

export {};