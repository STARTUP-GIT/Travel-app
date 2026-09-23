"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { AtSign, Loader2, Lock, Mail, User } from "lucide-react";
import { toast } from "sonner";

import { AdminLogo } from "@/components/admin/admin-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminSessionApi } from "@/lib/api/admin";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-5 shrink-0" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fullname, setFullname] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);

  const error = searchParams.get("error");

  React.useEffect(() => {
    if (!error) return;

    const message =
      error === "AccessDenied"
        ? "Google sign-up failed. Please try again."
        : "Sign-up failed. Please try again.";

    toast.error("Sign-up failed", { description: message });

    void signOut({ redirect: false }).finally(() => {
      router.replace("/signup");
    });
  }, [error, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!fullname.trim() || !username.trim() || !email || !password) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (username.trim().length < 3) {
      toast.error("Username must be at least 3 characters");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }

    setSubmitting(true);
    try {
      await adminSessionApi.signUp({
        fullname: fullname.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
      });
      toast.success("Admin account created");
      router.push("/admin");
      router.refresh();
    } catch (err) {
      toast.error("Account creation failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    // Tell the backend this OAuth callback is a SIGN-UP: if the verified
    // Google account is not already an admin, the backend creates an Admin
    // record using the existing Admin model (never a customer account).
    document.cookie = `admin_auth_intent=signup; path=/; samesite=lax; max-age=600`;
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/admin" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <AdminLogo />
        </div>
        <div className="mono-card p-6">
          <h1 className="text-lg font-bold tracking-tight">
            Create admin account
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Sign up to manage the tourism application.
          </p>

          <div className="mt-5">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full rounded-lg border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100"
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <Loader2 className="size-4 animate-spin text-muted-foreground" />
              ) : (
                <GoogleIcon />
              )}
              Continue with Google
            </Button>
          </div>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              or
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fullname">Full name</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="fullname"
                  name="fullname"
                  type="text"
                  autoComplete="name"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  className="rounded-lg py-5 pl-9"
                  placeholder="Admin Name"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="rounded-lg py-5 pl-9"
                  placeholder="admin_name"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-lg py-5 pl-9"
                  placeholder="admin@example.com"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-lg py-5 pl-9"
                  placeholder="At least 6 characters"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="confirm"
                  name="confirm"
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="rounded-lg py-5 pl-9"
                  placeholder="Repeat your password"
                />
              </div>
            </div>
            <Button
              type="submit"
              size="lg"
              className="w-full rounded-lg bg-zinc-900 text-white hover:bg-zinc-800"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <User className="size-4" />
              )}
              Create account
            </Button>
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-zinc-900 underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}