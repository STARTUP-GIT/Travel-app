import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SignupForm } from "@/features/auth/components/signup-form";
import { getProviderSession } from "@/features/provider/state/provider-session";
import { isProviderKind } from "@/features/provider/types";

export const metadata: Metadata = { title: "Create a provider account" };

const ERRORS: Record<string, string> = {
  // Auth.js collapses both a genuine misconfiguration and a sign-in it simply
  // refused into `Configuration`, so this cannot claim to be either one.
  Configuration:
    "We could not complete that registration. Please try again, and let us know if it keeps happening.",
  AccessDenied: "That account is not allowed to sign in here.",
  default: "Registration failed. Please try again.",
};

type SearchParams = Promise<{ kind?: string; error?: string }>;

export default async function SignupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  if (await getProviderSession()) redirect("/dashboard");

  const params = await searchParams;

  return (
    <SignupForm
      initialKind={isProviderKind(params.kind) ? params.kind : null}
      error={params.error ? (ERRORS[params.error] ?? ERRORS.default) : null}
    />
  );
}
