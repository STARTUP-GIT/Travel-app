"use client";

import { Loader2, TriangleAlert, UserPlus } from "lucide-react";
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
import {
  LanguageInput,
  PlacePicker,
} from "@/features/auth/components/place-picker";
import {
  registerWithEmail,
  signInWithGoogleGuide,
} from "@/features/auth/api/auth.actions";
import { providerMeta } from "@/features/provider/config";
import type { ProviderKind } from "@/features/provider/types";

type Props = {
  initialKind: ProviderKind | null;
  error: string | null;
};

type Form = {
  fullname: string;
  username: string;
  email: string;
  phonenumber: string;
  password: string;
  profilePic: string;
  placeIds: string[];
  experience: string;
  cost: string;
  languages: string[];
};

const EMPTY: Form = {
  fullname: "",
  username: "",
  email: "",
  phonenumber: "",
  password: "",
  profilePic: "",
  placeIds: [],
  experience: "0",
  cost: "0",
  languages: [],
};

export function SignupForm({ initialKind, error }: Props) {
  const [kind, setKind] = React.useState<ProviderKind | null>(initialKind);
  const [form, setForm] = React.useState<Form>(EMPTY);
  const [pending, setPending] = React.useState<"email" | "google" | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<Record<string, string>>({});

  const meta = kind ? providerMeta(kind) : null;
  const isGuide = kind === "common_guide" || kind === "specific_guide";
  const nameLabel = meta?.managesVenues ? "Owner name" : "Full name";

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetErrors() {
    setFormError(null);
    setFields({});
  }

  async function handleResult(
    result: Awaited<ReturnType<typeof registerWithEmail>>
  ) {
    if (!result.ok) {
      setFormError(result.message);
      setFields(result.fields ?? {});
      return;
    }
    toast.success("Account created");
    window.location.assign(result.redirectTo);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!kind) return;

    setPending("email");
    resetErrors();

    const result = await registerWithEmail({
      kind,
      fullname: form.fullname,
      username: form.username,
      email: form.email,
      phonenumber: form.phonenumber,
      password: form.password,
      profilePic: form.profilePic,
      placeIds: form.placeIds,
      experience: form.experience,
      cost: form.cost,
      languages: form.languages,
    });

    setPending(null);
    await handleResult(result);
  }

  async function submitGoogle() {
    if (kind !== "common_guide" && kind !== "specific_guide") return;

    setPending("google");
    resetErrors();

    const result = await signInWithGoogleGuide(
      {
        kind,
        phonenumber: form.phonenumber,
        placeIds: form.placeIds,
        experience: form.experience,
        cost: form.cost,
        languages: form.languages,
      },
      "/dashboard"
    );

    setPending(null);
    await handleResult(result);
  }

  const textField = (
    id: keyof Form,
    label: string,
    options: {
      type?: string;
      placeholder?: string;
      autoComplete?: string;
      required?: boolean;
    } = {}
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={options.type ?? "text"}
        autoComplete={options.autoComplete}
        required={options.required}
        placeholder={options.placeholder}
        value={form[id] as string}
        onChange={(event) => set(id, event.target.value)}
        aria-invalid={Boolean(fields[id])}
        className="rounded-xl py-6"
      />
      {fields[id] ? (
        <p className="text-xs text-destructive">{fields[id]}</p>
      ) : null}
    </div>
  );

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <BackgroundFX />

      <div className="animate-fade-in-up w-full max-w-xl">
        <Link href="/" className="mb-6 flex justify-center">
          <Logo className="scale-110" />
        </Link>

        <GlassCard className="gap-5 p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">
              Create a provider account
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {meta
                ? `Register as a ${meta.label.toLowerCase()} to start managing your services.`
                : "Choose the kind of account you are registering."}
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
              resetErrors();
            }}
          />

          {kind ? (
            <form onSubmit={submit} className="space-y-3.5">
              {textField("fullname", nameLabel, {
                placeholder: "Your full name",
                autoComplete: "name",
                required: true,
              })}
              {textField("username", "Username", {
                placeholder: "At least 3 characters",
                autoComplete: "username",
                required: true,
              })}
              {textField("email", "Email", {
                type: "email",
                placeholder: "you@example.com",
                autoComplete: "email",
                required: true,
              })}
              {textField("phonenumber", "Phone number", {
                type: "tel",
                placeholder: "10 to 15 digits",
                autoComplete: "tel",
                required: true,
              })}
              {textField("password", "Password", {
                type: "password",
                placeholder: "At least 6 characters",
                autoComplete: "new-password",
                required: true,
              })}
              {textField("profilePic", "Profile photo URL", {
                type: "url",
                placeholder: "https://… (optional)",
              })}

              {isGuide ? (
                <>
                  <PlacePicker
                    value={form.placeIds}
                    onChange={(next) => set("placeIds", next)}
                    multiple={kind === "common_guide"}
                    error={fields.placeIds}
                  />
                  <LanguageInput
                    value={form.languages}
                    onChange={(next) => set("languages", next)}
                    error={fields.languages}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    {textField("experience", "Years of experience", {
                      type: "number",
                      placeholder: "3",
                    })}
                    {textField("cost", "Your price per trip (₹)", {
                      type: "number",
                      placeholder: "1200",
                    })}
                  </div>
                </>
              ) : null}

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
                disabled={pending !== null}
              >
                {pending === "email" ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <UserPlus className="size-5" />
                )}
                Create account
              </Button>
            </form>
          ) : null}

          {isGuide ? (
            <>
              <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-muted-foreground">
                <span className="h-px flex-1 bg-border" /> or{" "}
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full rounded-xl"
                onClick={submitGoogle}
                disabled={pending !== null}
              >
                {pending === "google" ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <GoogleIcon className="size-5" />
                )}
                Continue with Google
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Google creates your guide account the first time, and signs you
                in on every visit after that. Your name, email and photo come
                from Google; the details above are still required.
              </p>
            </>
          ) : null}
        </GlassCard>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already registered?{" "}
          <Link
            href={`/login${kind ? `?kind=${kind}` : ""}`}
            className="font-semibold text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
