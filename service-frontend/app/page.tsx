import { redirect } from "next/navigation";

import { getProviderSession } from "@/features/provider/state/provider-session";

/**
 * Single entry point. A usable provider session goes straight to the dashboard;
 * everyone else picks the account type on the sign-in screen, because the four
 * provider kinds live behind four different backend routers.
 */
export default async function Home() {
  const session = await getProviderSession();
  redirect(session ? "/dashboard" : "/login");
}
