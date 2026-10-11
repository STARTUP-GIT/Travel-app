import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignupForm } from "@/features/auth/components/signup-form";
import { getProviderSession } from "@/features/provider/state/provider-session";
import { isProviderKind } from "@/features/provider/types";

export const metadata: Metadata = { title: "Create a provider account" };

const ERRORS: Record<string, string> = {
  Configuration: "Something went wrong.",
  AccessDenied: "Sign up failed.",
  default: "Sign up failed.",
};

type SearchParams = Promise<{ kind?: string; error?: string }>;

export default async function SignupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  if (await getProviderSession()) {
    redirect("/dashboard");
  }

  return (
    <SignupForm
      initialKind={isProviderKind(params.kind) ? params.kind : null}
      error={params.error ? (ERRORS[params.error] ?? ERRORS.default) : null}
    />
  );
}
