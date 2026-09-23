"use client";

import * as React from "react";
import { Loader2, UserPlus } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { GoogleIcon } from "@/components/shared/google-icon";
import { ScreenHeader } from "@/components/shared/screen-header";
import { useBranding } from "@/features/app-config/state/app-config-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupWithEmail } from "@/features/auth/api/auth.actions";

export default function SignupPage() {
  const router = useRouter();
  const { appName } = useBranding();
  const [form, setForm] = React.useState({
    fullname: "",
    username: "",
    email: "",
    phonenumber: "",
    password: "",
  });
  const [submitting, setSubmitting] = React.useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullname || !form.email || !form.password) {
      toast.error("Please fill the required fields");
      return;
    }
    setSubmitting(true);
    try {
      await signupWithEmail({
        email: form.email,
        username: form.username || form.email.split("@")[0],
        password: form.password,
        fullname: form.fullname,
        phonenumber: form.phonenumber,
      });
      toast.success("Account created", { description: "You can now log in." });
      router.push("/login");
    } catch (err) {
      toast.error("Couldn't create account", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function google() {
    setSubmitting(true);
    try {
      await signIn("google", { callbackUrl: "/profile" });
    } catch {
      toast.error("Google sign-up failed. Please try again.");
      setSubmitting(false);
    }
  }

  const fields: { key: keyof typeof form; label: string; type: string; placeholder: string; auto?: string }[] = [
    { key: "fullname", label: "Full name", type: "text", placeholder: "Your name", auto: "name" },
    { key: "username", label: "Username", type: "text", placeholder: "Optional public handle" },
    { key: "email", label: "Email", type: "email", placeholder: "you@example.com", auto: "email" },
    { key: "phonenumber", label: "Phone number", type: "tel", placeholder: "+91 98765 43210", auto: "tel" },
    { key: "password", label: "Password", type: "password", placeholder: "Create a password", auto: "new-password" },
  ];

  return (
    <div className="pb-8">
      <ScreenHeader title="Create account" subtitle={`Start exploring ${appName}`} />
      <div className="app-container">
        <div className="mx-auto mt-2 flex w-full max-w-sm flex-col gap-5">
          <Button
            variant="outline"
            size="lg"
            className="h-12 rounded-xl"
            onClick={google}
            disabled={submitting}
          >
            <GoogleIcon className="size-5" /> Continue with Google
          </Button>

          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or sign up with email{" "}
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={f.key}>{f.label}</Label>
                <Input
                  id={f.key}
                  type={f.type}
                  placeholder={f.placeholder}
                  autoComplete={f.auto}
                  value={form[f.key]}
                  onChange={(e) => set(f.key, e.target.value)}
                  className="rounded-xl py-6"
                />
              </div>
            ))}
            <Button
              type="submit"
              variant="action"
              size="lg"
              className="w-full rounded-xl"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="size-5 animate-spin" /> : <UserPlus className="size-5" />}
              Create account
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}