import { redirect } from "next/navigation";

import { isAdminAuthenticated } from "@/lib/api/auth-helpers";

export default async function RootPage() {
  const authorized = await isAdminAuthenticated();
  redirect(authorized ? "/dashboard" : "/login");
}