import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/features/auth/components/login-form";
import { getProviderSession } from "@/features/provider/state/provider-session";
import { isProviderKind } from "@/features/provider/types";

export const metadata: Metadata = { title: "Sign in" };

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
