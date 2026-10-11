"use client";

import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { BackgroundFX } from "@/components/shared/background-fx";
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
  const [photoFile, setPhotoFile] = React.useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
  const announced = React.useRef(false);

  React.useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview);
    };
  }, [photoPreview]);

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
        type={options.type ?? "text"}
        placeholder={options.placeholder}
        autoComplete={options.autoComplete}
        required={options.required}
        value={form[id] as string}
        onChange={(event) =>
          set(id, event.target.value as Form[typeof id])
        }
        aria-invalid={Boolean(fields[id])}
        className="rounded-xl py-6"
      />
    );

    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{label}</Label>
        {field}
        {fields[id] ? (
          <p className="text-xs text-destructive">{fields[id]}</p>
        ) : null}
      </div>
    );
  };

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <BackgroundFX />

      <div className="animate-fade-in-up w-full max-w-md">
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
                ? `Register as a ${meta.label.toLowerCase()} provider to start managing your services.`
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
                placeholder: "+91 98765 43210",
                autoComplete: "tel",
                required: true,
              })}

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    required
                    value={form.password}
                    onChange={(event) => set("password", event.target.value)}
                    aria-invalid={Boolean(fields.password)}
                    className="rounded-xl py-6 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((shown) => !shown)}
                    disabled={pending !== null}
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

              {isGuide ? (
                <>
                  <PhotoUploadField
                    value={photoPreview}
                    fallbackLabel={form.fullname || "Guide"}
                    disabled={pending !== null}
                    onPick={(file: File) => {
                      if (photoPreview) URL.revokeObjectURL(photoPreview);
                      setPhotoFile(file);
                      setPhotoPreview(file ? URL.createObjectURL(file) : null);
                    }}
                    hint="A clear photo helps travellers recognize you."
                  />

                  <PlacePicker
                    multiple={kind === "common_guide"}
                    value={form.placeIds}
                    error={fields.placeid}
                    onChange={(placeIds) => set("placeIds", placeIds)}
                  />

                  <LanguageInput
                    value={form.languages}
                    error={fields.language}
                    onChange={(languages) => set("languages", languages)}
                  />

                  <div className="grid grid-cols-2 gap-3">
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
