import { redirect } from "next/navigation";

import { isAdminAuthenticated } from "@/lib/api/auth-helpers";

export default async function AdminEntryPage() {
  const authorized = await isAdminAuthenticated();
  redirect(authorized ? "/dashboard" : "/login");
}