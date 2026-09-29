import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/features/auth/components/login-form";
import { getProviderSession } from "@/features/provider/state/provider-session";
import { isProviderKind } from "@/features/provider/types";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Shown when Auth.js sends the browser back here with `?error=…`.
 *
 * `Configuration` is Auth.js reporting that it could not stand up its own
 * config — in practice a missing `AUTH_SECRET` in the deployed environment.
 * That is a server fault raised by `assertConfig` *before* `authorize()` runs,
 * so the backend is never contacted and the sign-in is not the provider's
 * fault; "Something went wrong." said nothing about either. The precise cause
 * is written to the server log by `auth.ts`; nothing about the environment is
 * exposed here.
 */
const ERRORS: Record<string, string> = {
  Configuration: "Unable to sign in. Please try again.",
  AccessDenied: "Invalid email or password.",
  Verification: "Unable to sign in. Please try again.",
  CredentialsSignin: "Invalid email or password.",
  default: "Unable to sign in. Please try again.",
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
