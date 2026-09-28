"use client";

import { Loader2, LogIn, Mail, TriangleAlert } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { BackgroundFX } from "@/components/shared/background-fx";
import { GoogleIcon } from "@/components/shared/google-icon";
import { GlassCard } from "@/components/shared/glass-card";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ProviderKindPicker } from "@/features/auth/components/provider-kind-picker";
import { signInWithEmail } from "@/features/auth/api/auth.actions";
import { providerMeta } from "@/features/provider/config";
import type { ProviderKind } from "@/features/provider/types";

type Props = {
  initialKind: ProviderKind | null;
  next: string;
  error: string | null;
};

export function LoginForm({ initialKind, next, error }: Props) {
  const [kind, setKind] = React.useState<ProviderKind | null>(initialKind);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<Record<string, string>>({});

  const guide = kind ? providerMeta(kind).supportsGoogle : false;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!kind) return;

    setPending(true);
    setFormError(null);
    setFields({});

    const result = await signInWithEmail({ kind, email, password }, next);
    setPending(false);

    if (!result.ok) {
      setFormError(result.message);
      setFields(result.fields ?? {});
      return;
    }

    toast.success("Welcome back");
    // The session cookie is set by the server action, so a full navigation is
    // what makes the new session visible to the server components.
    window.location.assign(result.redirectTo);
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <BackgroundFX />

      <div className="animate-fade-in-up w-full max-w-md">
        <Link href="/" className="mb-6 flex justify-center">
          <Logo className="scale-110" />
        </Link>

        <GlassCard className="gap-5 p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage your listings and requests from one place.
            </p>
          </div>

          {error ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/8 p-3 text-sm text-destructive"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          ) : null}

          <ProviderKindPicker
            value={kind}
            onChange={(next) => {
              setKind(next);
              setFormError(null);
              setFields({});
            }}
          />

          {guide ? (
            <p className="flex items-start gap-2 rounded-xl border border-border bg-card/60 p-3 text-xs text-muted-foreground">
              <GoogleIcon className="mt-0.5 size-4 shrink-0" />
              <span>
                Prefer Google? The{" "}
                <Link
                  href={`/signup?kind=${kind}`}
                  className="font-semibold text-primary hover:underline"
                >
                  guide sign-up
                </Link>{" "}
                creates your guide account with Google, or signs you in if it
                already exists.
              </span>
            </p>
          ) : null}

          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  aria-invalid={Boolean(fields.email)}
                  className="rounded-xl py-6 pl-9"
                  placeholder="you@example.com"
                />
              </div>
              {fields.email ? (
                <p className="text-xs text-destructive">{fields.email}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={Boolean(fields.password)}
                className="rounded-xl py-6"
                placeholder="Your password"
              />
              {fields.password ? (
                <p className="text-xs text-destructive">{fields.password}</p>
              ) : null}
            </div>

            {formError ? (
              <p role="alert" className="text-sm text-destructive">
                {formError}
              </p>
            ) : null}

            <Button
              type="submit"
              variant="action"
              size="lg"
              className="w-full rounded-xl"
              disabled={pending || !kind}
            >
              {pending ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <LogIn className="size-5" />
              )}
              Sign in
            </Button>

            {!kind ? (
              <p className="text-center text-xs text-muted-foreground">
                Choose the type of account you are signing in to.
              </p>
            ) : null}
          </form>
        </GlassCard>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link
            href={`/signup${kind ? `?kind=${kind}` : ""}`}
            className="font-semibold text-primary hover:underline"
          >
            Create a provider account
          </Link>
        </p>
      </div>
    </div>
  );
}
