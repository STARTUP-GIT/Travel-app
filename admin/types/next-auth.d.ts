import type { DefaultSession } from "next-auth";

import type { AdminProfile } from "@/lib/types";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
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