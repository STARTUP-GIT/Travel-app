"use client";

import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
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
import { PhotoUploadField } from "@/features/provider/components/photo-upload-field";
import {
  registerWithEmail,
  signInWithGoogleGuide,
} from "@/features/auth/api/auth.actions";
import { providerMeta } from "@/features/provider/config";
import type { ProviderKind } from "@/features/provider/types";
import { cn } from "@/lib/utils";

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
  placeIds: [],
  experience: "0",
  cost: "0",
  languages: [],
};

export function SignupForm({ initialKind, error }: Props) {
  const [kind, setKind] = React.useState<ProviderKind | null>(initialKind);
  const [form, setForm] = React.useState<Form>(EMPTY);
  const [pending, setPending] = React.useState<"email" | "google" | null>(null);
  const [fields, setFields] = React.useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = React.useState(false);
  // The chosen photo, held as a file until the account exists. No URL is ever
  // typed or kept in form state.
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const announced = React.useRef(false);

  React.useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

  // A failure that arrived through the URL is reported the same way as one the
  // action returns, so every auth message is seen in the same place.
  React.useEffect(() => {
    if (!error || announced.current) return;
    announced.current = true;
    toast.error(error);
  }, [error]);

  const meta = kind ? providerMeta(kind) : null;
  const isGuide = kind === "common_guide" || kind === "specific_guide";
  const nameLabel = meta?.managesVenues ? "Owner name" : "Full name";

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleResult(
    result: Awaited<ReturnType<typeof registerWithEmail>>,
    success: string
  ) {
    if (!result.ok) {
      setFields(result.fields ?? {});
      toast.error(result.message);
      return;
    }
    toast.success(success);
    window.location.assign(result.redirectTo);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    // Guards the second submit of an in-flight request, which would otherwise
    // try to create the same account twice.
    if (pending || !kind) return;

    setPending("email");
    setFields({});

    const result = await registerWithEmail(
      {
        kind,
        fullname: form.fullname,
        username: form.username,
        email: form.email,
        phonenumber: form.phonenumber,
        password: form.password,
        placeIds: form.placeIds,
        experience: form.experience,
        cost: form.cost,
        languages: form.languages,
      },
      "/dashboard",
      photoFile
    );

    setPending(null);
    if (result.ok && result.warning) toast.warning(result.warning);
    await handleResult(result, "Account created.");
  }

  async function submitGoogle() {
    if (kind !== "common_guide" && kind !== "specific_guide") return;
    if (pending) return;

    setPending("google");
    setFields({});

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
    await handleResult(result, "Signed in.");
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
  ) => {
    const field = (
      <Input
        id={id}
        type={
          id === "password" && showPassword
            ? "text"
            : (options.type ?? "text")
        }
        autoComplete={options.autoComplete}
        required={options.required}
        placeholder={options.placeholder}
        value={form[id] as string}
        onChange={(event) => set(id, event.target.value)}
        aria-invalid={Boolean(fields[id])}
        className={cn("rounded-xl py-6", id === "password" && "pr-11")}
      />
    );

    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        {id === "password" ? (
          <div className="relative">
            {field}
            <button
              type="button"
              onClick={() => setShowPassword((shown) => !shown)}
              disabled={pending !== null}
              aria-label={showPassword ? "Hide password" : "Show password"}
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
        ) : (
          field
        )}
        {fields[id] ? (
          <p className="text-xs text-destructive">{fields[id]}</p>
        ) : null}
      </div>
    );
  };

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

          <ProviderKindPicker
            value={kind}
            onChange={(next) => {
              setKind(next);
              setFields({});
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

              <PhotoUploadField
                value={photoPreview}
                fallbackLabel={form.fullname || "P"}
                disabled={pending !== null}
                hint={
                  photoFile
                    ? "Your photo uploads to Cloudinary when the account is created."
                    : "Optional — you can add one later from your profile."
                }
                onPick={(file) => {
                  setPhotoFile(file ?? null);
                  setPhotoPreview((current) => {
                    if (current) URL.revokeObjectURL(current);
                    return file ? URL.createObjectURL(file) : null;
                  });
                }}
              />

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
            href={`/login?reauth=1${kind ? `&kind=${kind}` : ""}`}
            className="cursor-pointer font-semibold text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
