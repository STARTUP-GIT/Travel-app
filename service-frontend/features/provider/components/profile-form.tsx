"use client";

import { Eye, EyeOff, Loader2, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  saveProfile,
  uploadProfilePhoto,
} from "@/features/provider/api/provider.actions";
import { PhotoUploadField } from "@/features/provider/components/photo-upload-field";
import type { ProviderProfile } from "@/features/provider/types";
import { LanguageInput } from "@/features/auth/components/place-picker";

type Values = {
  name: string;
  username: string;
  email: string;
  phone: string;
  photo: string;
  tagline: string;
  agencyName: string;
  agencyAddress: string;
  agencyMapsUrl: string;
  agencyBanner: string;
  description: string;
  experience: string;
  cost: string;
  languages: string[];
  password: string;
};

type Errors = Partial<Record<keyof Values, string>>;

function isValidGoogleMapsUrl(urlStr: string): boolean {
  const trimmed = urlStr.trim();
  if (!trimmed) return true;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host === "maps.app.goo.gl" ||
      host === "goo.gl" ||
      /(^|\.)google\.(com|[a-z]{2,3}(?:\.[a-z]{2})?)$/i.test(host)
    );
  } catch {
    return false;
  }
}

/**
 * What a failed save says when the failure is not the guide's to fix.
 *
 * A 4xx from the backend is a rejection the guide can act on and carries a
 * hand-written sentence ("Email already exists"), which is shown as-is. A 5xx is
 * a fault on our side — a database error, a timeout — and its body is written for
 * whoever is debugging, not for the person who pressed Save. So the server's
 * wording is dropped and this is shown instead.
 */
const PROFILE_SAVE_FAILED_MESSAGE =
  "Unable to save your profile right now. Please try again.";

function saveFailureMessage(result: {
  message: string;
  status?: number;
}): string {
  return typeof result.status === "number" && result.status >= 500
    ? PROFILE_SAVE_FAILED_MESSAGE
    : result.message;
}

function initialValues(profile: ProviderProfile): Values {
  return {
    name: profile.name,
    username: profile.username,
    email: profile.email,
    phone: profile.phone,
    photo: profile.photo ?? "",
    tagline: profile.tagline,
    agencyName: profile.agencyName,
    agencyAddress: profile.agencyAddress ?? "",
    agencyMapsUrl: profile.agencyMapsUrl ?? "",
    agencyBanner: profile.agencyBanner ?? "",
    description: profile.description,
    experience: String(profile.experience ?? 0),
    cost: String(profile.cost ?? 0),
    languages: profile.languages,
    password: "",
  };
}

/**
 * The backend profile update schema makes every field optional, so a partial
 * change is sent as just the fields that were actually edited.
 */
export function ProfileForm({ profile }: { profile: ProviderProfile }) {
  const router = useRouter();
  const [values, setValues] = React.useState<Values>(() => initialValues(profile));
  const [errors, setErrors] = React.useState<Errors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const isGuide = profile.kind === "common_guide" || profile.kind === "specific_guide";
  // The agency is a Common Guide concept: a specific guide is tied to one place
  // rather than trading as a business, so the field is not shown at all and
  // never sent for them.
  const isCommonGuide = profile.kind === "common_guide";

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const next: Errors = {};
    if (values.name.trim().length === 0) next.name = "Your name is required";
    if (values.username.trim().length < 3)
      next.username = "Usernames need at least 3 characters";
    if (values.email.trim().length > 0 && !/^\S+@\S+\.\S+$/.test(values.email))
      next.email = "Enter a valid email address";
    if (values.phone.length > 0 && !/^[0-9+\-\s]{10,15}$/.test(values.phone))
      next.phone = "Enter a valid phone number";
    // `photo` is not user input any more: it is either the saved Cloudinary URL
    // or a new one returned by the upload action, so there is nothing to check.
    if (isGuide) {
      if (Number(values.experience) < 0)
        next.experience = "Years of experience cannot be negative";
      if (Number(values.cost) < 0) next.cost = "The price cannot be negative";
    }
    // Optional by design, so there is no "required" case here — only a length
    // cap, to stop a long string being pushed onto every card that shows it.
    if (values.agencyName.length > 120)
      next.agencyName = "Keep the agency name under 120 characters";
    if (!isValidGoogleMapsUrl(values.agencyMapsUrl))
      next.agencyMapsUrl = "Please enter a valid Google Maps sharing link";
    if (values.password.length > 0 && values.password.length < 6)
      next.password = "Passwords need at least 6 characters";

    if (Object.keys(next).length > 0) {
      setErrors(next);
      toast.error("Please fix the highlighted fields");
      return;
    }

    setBusy(true);
    const changed = Object.entries(values).filter(([key, value]) => {
      const original = initialValues(profile)[key as keyof Values];
      return value !== original;
    });

    // A blank agency is sent as an empty string on purpose: that is how the
    // backend clears a previously saved agency, so a guide who deletes the text
    // goes back to being shown as an individual.
    if (!isCommonGuide) {
      for (const k of ["agencyName", "agencyAddress", "agencyMapsUrl", "agencyBanner"]) {
        const index = changed.findIndex(([key]) => key === k);
        if (index >= 0) changed.splice(index, 1);
      }
    }

    if (changed.length === 0) {
      setBusy(false);
      toast.info("Nothing to save");
      return;
    }

    const result = await saveProfile(
      Object.fromEntries(changed) as Partial<Parameters<typeof saveProfile>[0]>
    );
    setBusy(false);

    if (!result.ok) {
      if (result.fields && Object.keys(result.fields).length > 0) {
        setErrors(result.fields as Errors);
      }
      const message = saveFailureMessage(result);
      setFormError(message);
      toast.error(message);
      return;
    }

    toast.success("Profile updated");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      {formError ? (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/40 bg-destructive/6 p-4 text-sm"
        >
          <p className="font-semibold">Your profile was not saved</p>
          <p className="mt-1 text-muted-foreground">{formError}</p>
        </div>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Identity</h2>

        <Field label="Full name" error={errors.name}>
          <Input
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
            aria-invalid={Boolean(errors.name)}
          />
        </Field>

        <Field label="Username" error={errors.username}>
          <Input
            value={values.username}
            onChange={(event) => set("username", event.target.value)}
            aria-invalid={Boolean(errors.username)}
          />
        </Field>

        <Field
          label="Email"
          error={errors.email}
          hint={
            profile.authProvider === "google"
              ? "Signed in with Google, so this is your Google address."
              : undefined
          }
        >
          <Input
            value={values.email}
            onChange={(event) => set("email", event.target.value)}
            type="email"
            aria-invalid={Boolean(errors.email)}
          />
        </Field>

        <Field label="Phone" error={errors.phone}>
          <Input
            value={values.phone}
            onChange={(event) => set("phone", event.target.value)}
            type="tel"
            placeholder="+91 98765 43210"
            aria-invalid={Boolean(errors.phone)}
          />
        </Field>

        <PhotoUploadField
          value={values.photo}
          fallbackLabel={values.name}
          disabled={busy}
          onChange={(url) => set("photo", url)}
          upload={async (file) => {
            const result = await uploadProfilePhoto(file);
            if (!result.ok) throw new Error(result.message);
            return result.data;
          }}
        />
      </section>

      {isGuide ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm font-semibold">Guide details</h2>

          <Field label="Tagline" error={errors.tagline}>
            <Input
              value={values.tagline}
              onChange={(event) => set("tagline", event.target.value)}
              placeholder="Local historian and food storyteller"
            />
          </Field>

          {isCommonGuide ? (
            <>
              <Field
                label="Agency Name"
                error={errors.agencyName}
                hint="Shown to customers as the agency behind your packages. Leave blank to trade in your own name."
              >
                <Input
                  value={values.agencyName}
                  onChange={(event) => set("agencyName", event.target.value)}
                  maxLength={120}
                  placeholder="Mysuru Heritage Tours"
                />
              </Field>

              <Field
                label="Agency Address"
                error={errors.agencyAddress}
                hint="Physical address or office location of your agency."
              >
                <Input
                  value={values.agencyAddress}
                  onChange={(event) => set("agencyAddress", event.target.value)}
                  placeholder="123 Heritage Way, Mysuru"
                />
              </Field>

              <Field
                label="Agency Google Maps Location"
                error={errors.agencyMapsUrl}
                hint="Share your agency's office or meeting location so customers can open it directly in Google Maps."
              >
                <Input
                  value={values.agencyMapsUrl}
                  onChange={(event) => set("agencyMapsUrl", event.target.value)}
                  placeholder="Paste your agency's Google Maps sharing link"
                />
              </Field>

              <div className="flex flex-col gap-1.5">
                <Label>Agency Banner Image</Label>
                <PhotoUploadField
                  value={values.agencyBanner}
                  fallbackLabel="Agency Banner"
                  disabled={busy}
                  onChange={(url) => set("agencyBanner", url)}
                  upload={async (file) => {
                    const result = await uploadProfilePhoto(file);
                    if (!result.ok) throw new Error(result.message);
                    return result.data;
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Banner image displayed on package details and agency cards.
                </p>
              </div>
            </>
          ) : null}

          <Field label="About you" error={errors.description}>
            <Textarea
              value={values.description}
              onChange={(event) => set("description", event.target.value)}
              rows={4}
              placeholder="What you love showing travellers, and how you work."
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Years of experience" error={errors.experience}>
              <Input
                value={values.experience}
                onChange={(event) => set("experience", event.target.value)}
                type="number"
                inputMode="numeric"
                min={0}
                aria-invalid={Boolean(errors.experience)}
              />
            </Field>
            <Field label="Price per day (₹)" error={errors.cost}>
              <Input
                value={values.cost}
                onChange={(event) => set("cost", event.target.value)}
                type="number"
                inputMode="numeric"
                min={0}
                aria-invalid={Boolean(errors.cost)}
              />
            </Field>
          </div>

          <LanguageInput
            value={values.languages}
            onChange={(languages) => set("languages", languages)}
            error={errors.languages}
          />
        </section>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Password</h2>
        <Field
          label="New password"
          error={errors.password}
          hint="Leave blank to keep your current password."
        >
          <div className="relative">
            <Input
              value={values.password}
              onChange={(event) => set("password", event.target.value)}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((shown) => !shown)}
              disabled={busy}
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
        </Field>
      </section>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button type="submit" disabled={busy} className="rounded-full">
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {busy ? "Saving…" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="rounded-full"
          disabled={busy}
          onClick={() => {
            setValues(initialValues(profile));
            setErrors({});
            setFormError(null);
          }}
        >
          <X className="size-4" />
          Reset
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
