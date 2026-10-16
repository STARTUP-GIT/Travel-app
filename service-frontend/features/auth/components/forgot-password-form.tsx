"use client";

import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { BackgroundFX } from "@/components/shared/background-fx";
import { GlassCard } from "@/components/shared/glass-card";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestProviderPasswordReset } from "@/features/auth/api/password-reset.actions";

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending || !email.trim()) return;

    setPending(true);
    const result = await requestProviderPasswordReset(email);
    setPending(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    setSubmitted(true);
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <BackgroundFX />

      <div className="animate-fade-in-up w-full max-w-md">
        <Link href="/" className="mb-6 flex justify-center">
          <Logo className="scale-110" />
        </Link>

        <GlassCard className="gap-5 p-6">
          {submitted ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <CheckCircle2 className="size-6 text-primary" />
              </div>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
                <p className="text-sm text-muted-foreground">
                  If <strong>{email}</strong> is registered as a service provider, you will receive a reset link shortly.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                The link expires in 1 hour. Be sure to check your spam or junk folder if it doesn&apos;t arrive soon.
              </p>
              <Button asChild variant="action" size="lg" className="w-full rounded-xl">
                <Link href="/login">Return to sign in</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-bold tracking-tight">Forgot password</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter your provider account email and we&apos;ll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="rounded-xl py-6 pl-9"
                      placeholder="provider@example.com"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="action"
                  size="lg"
                  className="w-full rounded-xl"
                  disabled={pending}
                >
                  {pending ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Mail className="size-5" />
                  )}
                  Send reset link
                </Button>
              </form>

              <div className="text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                >
                  <ArrowLeft className="size-4" />
                  Back to sign in
                </Link>
              </div>
            </>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
