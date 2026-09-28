"use client";

import { Eye, EyeOff, Loader2, LogIn, Mail } from "lucide-react";
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
  const [showPassword, setShowPassword] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [fields, setFields] = React.useState<Record<string, string>>({});
  const announced = React.useRef(false);

  // A failure that arrived through the URL is reported the same way as one the
  // action returns, so every auth message is seen in the same place.
  React.useEffect(() => {
    if (!error || announced.current) return;
    announced.current = true;
    toast.error(error);
  }, [error]);

  const guide = kind ? providerMeta(kind).supportsGoogle : false;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    // Guards the second submit of an in-flight request, which would otherwise
    // sign in twice and race the redirect.
    if (pending || !kind) return;

    setPending(true);
    setFields({});

    const result = await signInWithEmail({ kind, email, password }, next);
    setPending(false);

    if (!result.ok) {
      setFields(result.fields ?? {});
      toast.error(result.message);
      return;
    }

    toast.success("Signed in.");
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

          <ProviderKindPicker
            value={kind}
            onChange={(next) => {
              setKind(next);
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
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(fields.password)}
                  className="rounded-xl py-6 pr-11"
                  placeholder="Your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((shown) => !shown)}
                  disabled={pending}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  aria-pressed={showPassword}
                  title={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              {fields.password ? (
                <p className="text-xs text-destructive">{fields.password}</p>
              ) : null}
            </div>

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
