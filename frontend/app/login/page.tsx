"use client";

import * as React from "react";
import { Suspense } from "react";
import { Loader2, LogIn, Mail } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { GoogleIcon } from "@/components/shared/google-icon";
import { Logo } from "@/components/shared/logo";
import { ScreenHeader } from "@/components/shared/screen-header";
import { useBranding } from "@/features/app-config/state/app-config-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SIGN_IN_ERRORS: Record<string, string> = {
  invalid_credentials: "Check your email and password.",
  backend_unavailable:
    "The sign-in service is unavailable. Please try again later.",
  Configuration: "Authentication is not configured correctly.",
  CredentialsSignin: "Check your email and password.",
  default: "Sign-in failed. Please try again.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/profile";
  const { appName } = useBranding();

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [mode, setMode] = React.useState<"google" | "credentials" | null>(null);

  async function google() {
    setMode("google");
    try {
      await signIn("google", { callbackUrl });
    } catch {
      toast.error("Google sign-in failed. Please try again.");
      setMode(null);
    }
  }

  async function credentials(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Enter your email and password");
      return;
    }
    setMode("credentials");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setMode(null);
    if (res?.error || res?.code) {
      toast.error("Sign-in failed", {
        description:
          SIGN_IN_ERRORS[res?.code ?? res?.error ?? "default"] ??
          SIGN_IN_ERRORS.default,
      });
      return;
    }
    toast.success("Welcome back!");
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="pb-8">
      <ScreenHeader title="Log in" subtitle="Continue your journey" />
      <div className="app-container">
        <div className="mx-auto mt-2 flex w-full max-w-sm flex-col gap-5">
          <div className="flex items-center gap-3">
            <Logo className="text-2xl" />
            <p className="text-sm text-muted-foreground">
              Sign in to book guides, hotels and restaurants, and to keep your Saved list with you.
            </p>
          </div>

          <Button
            variant="outline"
            size="lg"
            className="h-12 rounded-xl"
            onClick={google}
            disabled={mode !== null}
          >
            {mode === "google" ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <GoogleIcon className="size-5" />
            )}
            Continue with Google
          </Button>

          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={credentials} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl py-6 pl-9"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl py-6"
                placeholder="Your password"
              />
            </div>
            <Button
              type="submit"
              variant="action"
              size="lg"
              className="w-full rounded-xl"
              disabled={mode !== null}
            >
              {mode === "credentials" ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <LogIn className="size-5" />
              )}
              Log in with email
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            New to {appName}?{" "}
            <Link href="/signup" className="font-semibold text-primary hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}