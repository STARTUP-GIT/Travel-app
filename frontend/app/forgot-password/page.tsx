"use client";

import * as React from "react";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Logo } from "@/components/shared/logo";
import { ScreenHeader } from "@/components/shared/screen-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/features/auth/api/password-reset.actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || !email.trim()) return;

    setPending(true);
    const result = await requestPasswordReset(email);
    setPending(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="pb-8">
        <ScreenHeader title="Check your email" subtitle="Reset link sent" />
        <div className="app-container">
          <div className="mx-auto mt-2 flex w-full max-w-md flex-col gap-5">
            <div className="space-y-1.5">
              <Logo className="text-2xl" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                We sent a reset link to your inbox. Check your email and follow the instructions.
              </p>
            </div>

            <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-muted/40 px-6 py-8 text-center">
              <CheckCircle2 className="size-12 text-green-500" />
              <div>
                <p className="font-semibold">Reset link sent</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  If <strong>{email}</strong> is registered with us, you will receive an email with
                  a password reset link shortly.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                The link expires in 1 hour. Check your spam folder if you don&apos;t see it.
              </p>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="font-semibold text-primary hover:underline">
                ← Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <ScreenHeader title="Forgot password" subtitle="We'll email you a reset link" />
      <div className="app-container">
        <div className="mx-auto mt-2 flex w-full max-w-md flex-col gap-5">
          <div className="space-y-1.5">
            <Logo className="text-2xl" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Enter your registered email address and we will send you a link to reset your password.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="fp-email">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="fp-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl py-6 pl-9"
                  placeholder="you@example.com"
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

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
              <ArrowLeft className="size-3.5" />
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
