import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/features/auth/components/login-form";
import { getProviderSession } from "@/features/provider/state/provider-session";
import { isProviderKind } from "@/features/provider/types";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  // Auth.js collapses both a genuine misconfiguration and a sign-in it simply
  // refused into `Configuration`, so this cannot claim to be either one.
  Configuration: "Something went wrong.",
  AccessDenied: "Sign in failed.",
  Verification: "Sign in failed.",
  default: "Sign in failed.",
};

type SearchParams = Promise<{
  kind?: string;
  next?: string;
  error?: string;
  reauth?: string;
}>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  // Explicit sign-in links must be able to show the form even when a stale
  // session would otherwise send the provider straight back to the dashboard.
  if (params.reauth !== "1" && (await getProviderSession())) {
    redirect("/dashboard");
  }

  const next =
    params.next && params.next.startsWith("/") && !params.next.startsWith("//")
      ? params.next
      : "/dashboard";

  return (
    <LoginForm
      initialKind={isProviderKind(params.kind) ? params.kind : null}
      next={next}
      error={params.error ? (ERRORS[params.error] ?? ERRORS.default) : null}
    />
  );
}
