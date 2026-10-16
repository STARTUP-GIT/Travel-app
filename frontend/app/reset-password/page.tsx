"use client";

import * as React from "react";
import { Suspense } from "react";
import { Loader2, Eye, EyeOff, KeyRound, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { Logo } from "@/components/shared/logo";
import { ScreenHeader } from "@/components/shared/screen-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitPasswordReset } from "@/features/auth/api/password-reset.actions";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState(false);

  if (!token) {
    return (
      <div className="pb-8">
        <ScreenHeader title="Invalid link" subtitle="This reset link is not valid" />
        <div className="app-container">
          <div className="mx-auto mt-2 flex w-full max-w-md flex-col gap-5">
            <div className="space-y-1.5">
              <Logo className="text-2xl" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                This reset link is missing its token. Please use the link from your email.
              </p>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
                Request a new reset link
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="pb-8">
        <ScreenHeader title="Password updated" subtitle="You can now sign in" />
        <div className="app-container">
          <div className="mx-auto mt-2 flex w-full max-w-md flex-col gap-5">
            <div className="space-y-1.5">
              <Logo className="text-2xl" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your password has been updated successfully.
              </p>
            </div>
            <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-muted/40 px-6 py-8 text-center">
              <CheckCircle2 className="size-12 text-green-500" />
              <div>
                <p className="font-semibold">Password updated</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  You can now sign in with your new password.
                </p>
              </div>
            </div>
            <Button asChild variant="action" size="lg" className="w-full rounded-xl">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;

    setPending(true);
    const result = await submitPasswordReset(token, password, confirmPassword);
    setPending(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success("Password updated successfully.");
    setDone(true);
  }

  return (
    <div className="pb-8">
      <ScreenHeader title="Reset password" subtitle="Choose a new password" />
      <div className="app-container">
        <div className="mx-auto mt-2 flex w-full max-w-md flex-col gap-5">
          <div className="space-y-1.5">
            <Logo className="text-2xl" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Enter your new password below. Use at least 6 characters.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="rp-password">New password</Label>
              <div className="relative">
                <Input
                  id="rp-password"
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
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-1 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rp-confirm">Confirm new password</Label>
              <Input
                id="rp-confirm"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-xl py-6"
                placeholder="Repeat your password"
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
        </div>
      </div>
    </div>
  );
}
