import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/features/auth/components/login-form";
import { getProviderSession } from "@/features/provider/state/provider-session";
import { isProviderKind } from "@/features/provider/types";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  Configuration:
    "Sign in is not configured correctly. Please contact support.",
  AccessDenied: "That account is not allowed to sign in here.",
  Verification:
    "That sign-in link is no longer valid. Please try signing in again.",
  default: "Sign in failed. Please try again.",
};

type SearchParams = Promise<{ kind?: string; next?: string; error?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Anyone who already has a usable provider session goes straight to work.
  if (await getProviderSession()) redirect("/dashboard");

  const params = await searchParams;
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
