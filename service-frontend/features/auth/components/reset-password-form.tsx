"use client";

import { CheckCircle2, Eye, EyeOff, KeyRound, Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { BackgroundFX } from "@/components/shared/background-fx";
import { GlassCard } from "@/components/shared/glass-card";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitProviderPasswordReset } from "@/features/auth/api/password-reset.actions";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState(false);

  if (!token) {
    return (
      <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
        <BackgroundFX />
        <div className="animate-fade-in-up w-full max-w-md">
          <Link href="/" className="mb-6 flex justify-center">
            <Logo className="scale-110" />
          </Link>
          <GlassCard className="gap-5 p-6 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <XCircle className="size-6 text-destructive" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">Invalid reset link</h1>
              <p className="text-sm text-muted-foreground">
                This reset link is missing its security token or has already expired.
              </p>
            </div>
            <Button asChild variant="action" size="lg" className="w-full rounded-xl">
              <Link href="/forgot-password">Request a new link</Link>
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Back to sign in
              </Link>
            </p>
          </GlassCard>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
        <BackgroundFX />
        <div className="animate-fade-in-up w-full max-w-md">
          <Link href="/" className="mb-6 flex justify-center">
            <Logo className="scale-110" />
          </Link>
          <GlassCard className="gap-5 p-6 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="size-6 text-primary" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight">Password updated</h1>
              <p className="text-sm text-muted-foreground">
                Your password has been reset successfully. You can now sign in with your new credentials.
              </p>
            </div>
            <Button asChild variant="action" size="lg" className="w-full rounded-xl">
              <Link href="/login">Sign in to provider portal</Link>
            </Button>
          </GlassCard>
        </div>
      </div>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setPending(true);
    const result = await submitProviderPasswordReset(token, password, confirmPassword);
    setPending(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success("Password reset successfully.");
    setDone(true);
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
            <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a strong password with at least 6 characters.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-xl py-6 pr-11"
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={pending}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-xl py-6"
                placeholder="Repeat new password"
              />
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
                <KeyRound className="size-5" />
              )}
              Update password
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Remember your password?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
