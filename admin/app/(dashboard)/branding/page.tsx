"use client";

import * as React from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { ImageThumb } from "@/components/admin/image-thumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { patchJSON } from "@/lib/api/mutate";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import {
  describeUploadError,
  uploadImage,
  validateImageFile,
} from "@/lib/api/upload";
import type { AppSettings } from "@/lib/types";

export default function BrandingPage() {
  const { data, loading, error, refetch } = useAdminData<{ settings: AppSettings }>(
    "/admin/api/settings"
  );

  type BrandingForm = Omit<Partial<AppSettings>, "imageBanners"> & {
    imageBanners: string[];
  };

  const [form, setForm] = React.useState<BrandingForm>({ imageBanners: [] });
  const [saving, setSaving] = React.useState(false);
  const [uploadingIcon, setUploadingIcon] = React.useState(false);
  const [uploadingBanners, setUploadingBanners] = React.useState(false);
  const iconInputRef = React.useRef<HTMLInputElement>(null);
  const bannersInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (data?.settings) {
      const s = data.settings;
      setForm({
        app_name: s.app_name,
        webTitle: s.webTitle,
        icon: s.icon,
        text: s.text,
        app_description: s.app_description,
        contacts: s.contacts,
        termsandconditions: s.termsandconditions,
        privacy: s.privacy,
        imageBanners: s.imageBanners ?? [],
      });
    }
  }, [data]);

  const settings = data?.settings;

  const set = (key: keyof BrandingForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  async function handleIconFile(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen) return;

    const invalid = validateImageFile(chosen, { allowSvg: true });
    if (invalid) {
      toast.error("Invalid icon image", { description: invalid });
      return;
    }

    setUploadingIcon(true);
    try {
      const { url } = await uploadImage(chosen, "branding");
      set("icon", url);
      toast.success("Icon uploaded", {
        description: "Click 'Save settings' to apply it.",
      });
    } catch (err) {
      toast.error("Icon upload failed", {
        description: describeUploadError(err),
      });
    } finally {
      setUploadingIcon(false);
    }
  }

  async function handleBannerFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length === 0) return;

    for (const file of files) {
      const invalid = validateImageFile(file);
      if (invalid) {
        toast.error(`Skipped "${file.name}"`, { description: invalid });
        return;
      }
    }

    setUploadingBanners(true);
    const uploaded: string[] = [];
    try {
      for (const file of files) {
        const { url } = await uploadImage(file, "branding");
        uploaded.push(url);
      }
      setForm((f) => ({ ...f, imageBanners: [...f.imageBanners, ...uploaded] }));
      toast.success(`${uploaded.length} banner image(s) uploaded`, {
        description: "Click 'Save settings' to apply them.",
      });
    } catch (err) {
      toast.error("Banner upload failed", {
        description: describeUploadError(err),
      });
    } finally {
      setUploadingBanners(false);
    }
  }

  function removeBanner(url: string) {
    setForm((f) => ({ ...f, imageBanners: f.imageBanners.filter((b) => b !== url) }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await patchJSON("/admin/api/settings", {
        app_name: form.app_name,
        webTitle: form.webTitle,
        icon: form.icon,
        text: form.text,
        app_description: form.app_description,
        contacts: form.contacts,
        termsandconditions: form.termsandconditions,
        privacy: form.privacy,
        imageBanners: form.imageBanners,
      });
      toast.success("Settings saved");
      refetch();
    } catch (err) {
      toast.error("Save failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Branding & landing"
        subtitle="Controls the app name, icon, tagline and banner images used across the customer app."
      />
      {loading ? (
        <LoadingState rows={6} />
      ) : error || !settings ? (
        <ErrorState message={error ?? "Settings not found"} onRetry={refetch} />
      ) : (
        <form onSubmit={save} className="mono-card max-w-2xl space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="App name">
              <Input value={form.app_name ?? ""} onChange={(e) => set("app_name", e.target.value)} required />
            </Field>
            <Field label="Web title">
              <Input value={form.webTitle ?? ""} onChange={(e) => set("webTitle", e.target.value)} />
            </Field>
          </div>

          <Field label="App icon">
            <div className="flex items-center gap-4 rounded-xl border border-border p-4">
              <ImageThumb
                src={form.icon}
                alt="App icon"
                className="size-16 rounded-xl"
              />
              <div className="min-w-0 flex-1">
                <input
                  ref={iconInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={handleIconFile}
                  disabled={uploadingIcon}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => iconInputRef.current?.click()}
                  disabled={uploadingIcon}
                >
                  {uploadingIcon ? (
                    <>
                      <Loader2 className="animate-spin" /> Uploading…
                    </>
                  ) : (
                    <>
                      <Upload /> Upload image
                    </>
                  )}
                </Button>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  PNG, JPG, WEBP or SVG · up to 5 MB
                </p>
              </div>
            </div>
          </Field>

          <Field label="Tagline">
            <Input value={form.text ?? ""} onChange={(e) => set("text", e.target.value)} />
          </Field>
          <Field label="App description">
            <Textarea
              value={form.app_description ?? ""}
              onChange={(e) => set("app_description", e.target.value)}
              rows={3}
            />
          </Field>
          <Field label="Contacts">
            <Textarea
              value={form.contacts ?? ""}
              onChange={(e) => set("contacts", e.target.value)}
              rows={3}
            />
          </Field>
          <Field label="Terms & conditions">
            <Textarea
              value={form.termsandconditions ?? ""}
              onChange={(e) => set("termsandconditions", e.target.value)}
              rows={4}
            />
          </Field>
          <Field label="Privacy policy">
            <Textarea
              value={form.privacy ?? ""}
              onChange={(e) => set("privacy", e.target.value)}
              rows={4}
            />
          </Field>

          <Field label="Banner images">
            <div className="space-y-3">
              {form.imageBanners.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {form.imageBanners.map((url) => (
                    <div
                      key={url}
                      className="group relative overflow-hidden rounded-lg border border-border"
                    >
                      <ImageThumb
                        src={url}
                        alt="Banner image"
                        className="h-24 w-full rounded-none"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute right-1 top-1 size-6 rounded-md"
                        onClick={() => removeBanner(url)}
                        aria-label="Remove banner image"
                      >
                        <X className="size-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : null}
              <input
                ref={bannersInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="hidden"
                onChange={handleBannerFiles}
                disabled={uploadingBanners}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => bannersInputRef.current?.click()}
                disabled={uploadingBanners}
              >
                {uploadingBanners ? (
                  <>
                    <Loader2 className="animate-spin" /> Uploading…
                  </>
                ) : (
                  <>
                    <Upload /> Upload images
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground">
                PNG, JPG or WEBP · up to 5 MB each
              </p>
            </div>
          </Field>

          <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button type="submit" className="bg-zinc-900 text-white hover:bg-zinc-800" disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}