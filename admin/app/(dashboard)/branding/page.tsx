"use client";

import * as React from "react";
import { Loader2, Store, Upload, User, X } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { ImageThumb } from "@/components/admin/image-thumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { patchJSON } from "@/lib/api/mutate";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import {
  describeUploadError,
  uploadImage,
  validateImageFile,
} from "@/lib/api/upload";
import type { AppSettings } from "@/lib/types";

type Scope = "client" | "service";

export default function BrandingPage() {
  const [scope, setScope] = React.useState<Scope>("client");

  return (
    <div>
      <PageHeader
        title="Branding & Landing"
        subtitle="Manage brand identity, landing text, icons, and hero banners separately for Client App and Service App."
      />

      <Tabs value={scope} onValueChange={(v) => setScope(v as Scope)} className="mb-6">
        <TabsList>
          <TabsTrigger value="client" className="gap-2">
            <User className="h-4 w-4" />
            Client App (Customer Web & Mobile)
          </TabsTrigger>
          <TabsTrigger value="service" className="gap-2">
            <Store className="h-4 w-4" />
            Service App (Guides & Owners Web & Mobile)
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className={scope === "client" ? "block" : "hidden"}>
        <BrandingFormScope scope="client" />
      </div>
      <div className={scope === "service" ? "block" : "hidden"}>
        <BrandingFormScope scope="service" />
      </div>
    </div>
  );
}

function BrandingFormScope({ scope }: { scope: Scope }) {
  const endpoint = `/admin/api/settings/${scope}`;
  const { data, loading, error, refetch } = useAdminData<{ settings: AppSettings }>(endpoint);

  type FormState = Omit<Partial<AppSettings>, "imageBanners"> & {
    imageBanners: string[];
  };

  const [form, setForm] = React.useState<FormState>({ imageBanners: [] });
  const [isDirty, setIsDirty] = React.useState(false);
  const isDirtyRef = React.useRef(false);
  const [saving, setSaving] = React.useState(false);
  const [uploadingIcon, setUploadingIcon] = React.useState(false);
  const [uploadingBanners, setUploadingBanners] = React.useState(false);
  const iconInputRef = React.useRef<HTMLInputElement>(null);
  const bannersInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (data?.settings && !isDirtyRef.current) {
      const s = data.settings;
      setForm({
        app_name: s.app_name ?? "",
        webTitle: s.webTitle ?? "",
        icon: s.icon ?? "",
        text: s.text ?? "",
        app_description: s.app_description ?? "",
        contacts: s.contacts ?? "",
        termsandconditions: s.termsandconditions ?? "",
        privacy: s.privacy ?? "",
        imageBanners: s.imageBanners ?? [],
      });
    }
  }, [data]);

  const set = (key: keyof FormState, value: string) => {
    isDirtyRef.current = true;
    setIsDirty(true);
    setForm((f) => ({ ...f, [key]: value }));
  };

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
      toast.success("Icon uploaded", { description: "Click 'Save settings' to apply it." });
    } catch (err) {
      toast.error("Icon upload failed", { description: describeUploadError(err) });
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
      isDirtyRef.current = true;
      setIsDirty(true);
      setForm((f) => ({ ...f, imageBanners: [...f.imageBanners, ...uploaded] }));
      toast.success(`${uploaded.length} banner image(s) uploaded`, {
        description: "Click 'Save settings' to apply them.",
      });
    } catch (err) {
      toast.error("Banner upload failed", { description: describeUploadError(err) });
    } finally {
      setUploadingBanners(false);
    }
  }

  function removeBanner(url: string) {
    isDirtyRef.current = true;
    setIsDirty(true);
    setForm((f) => ({ ...f, imageBanners: f.imageBanners.filter((b) => b !== url) }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await patchJSON(endpoint, {
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
      toast.success(`${scope === "client" ? "Client" : "Service"} app settings saved successfully`);
      isDirtyRef.current = false;
      setIsDirty(false);
      refetch();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to save settings right now. Please try again.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) return <LoadingState rows={6} />;
  if (error && !data?.settings) {
    return (
      <ErrorState
        message="Unable to load branding settings right now. Please try again."
        onRetry={refetch}
      />
    );
  }

  const scopeInfo = {
    client: {
      title: "CLIENT BRANDING SCOPE",
      subtitle: "Customer Web + Customer Mobile",
      description: "Controls branding exclusively for customer web (frontend/) and customer mobile (client-mobile-app/). Does not alter Service App.",
    },
    service: {
      title: "SERVICE BRANDING SCOPE",
      subtitle: "Guides & Owners Web + Service Mobile",
      description: "Controls branding exclusively for partner web (service-frontend/) and service mobile (service-mobile-app/). Does not alter Client App.",
    },
  };

  return (
    <div className="max-w-2xl space-y-4">
      <div className="mono-card border-l-4 border-l-primary bg-muted/20 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            {scopeInfo[scope].title}
          </span>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            {scope === "client" ? "Customer Product" : "Partner Product"}
          </span>
        </div>
        <h4 className="mt-1 text-sm font-semibold text-foreground">{scopeInfo[scope].subtitle}</h4>
        <p className="mt-0.5 text-xs text-muted-foreground">{scopeInfo[scope].description}</p>
      </div>

      {/* Live Scope Header Preview */}
      <div className="mono-card overflow-hidden border border-border bg-card p-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Live {scope === "client" ? "Customer" : "Service Provider"} Header Preview
            </span>
          </div>
          <a
            href={scope === "client" ? "http://localhost:3000" : "http://localhost:3001"}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1"
          >
            Open Live App ↗
          </a>
        </div>
        <div className="mt-4 rounded-xl border border-border/80 bg-background/95 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2.5 sm:gap-3 font-bold tracking-tight select-none">
              <img
                src={form.icon || "/brand/atlaswanders-symbol.svg"}
                alt={form.app_name || "Brand Icon"}
                className="size-9 sm:size-10 shrink-0 object-contain drop-shadow-xs"
              />
              <div className="flex flex-col leading-none">
                <span className="text-[1.15rem] sm:text-[1.3rem] font-black tracking-tight text-[#0B2545] dark:text-white">
                  {form.app_name || "ATLASWANDERS"}
                </span>
                <span className="text-[0.62rem] sm:text-[0.72rem] font-bold tracking-[0.14em] uppercase mt-0.5 whitespace-nowrap text-[#D9A441]">
                  {form.text || (scope === "client" ? "Discover Places. Experience Local." : "Partner & Service Provider Portal")}
                </span>
              </div>
            </div>
            {data?.settings && isDirty ? (
              <span className="inline-flex rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                Unsaved Draft Preview
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Live Published
              </span>
            )}
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          {form.text ? `Tagline: "${form.text}" (${form.text.length} chars, rendered without truncation)` : "Using default scope tagline"}
        </p>
      </div>

      <form onSubmit={save} className="mono-card space-y-5 p-6">
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
            <ImageThumb src={form.icon} alt="App icon" className="size-16 rounded-xl" />
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
              <p className="mt-1.5 text-xs text-muted-foreground">PNG, JPG, WEBP or SVG · up to 5 MB</p>
            </div>
          </div>
        </Field>

        <Field label="Tagline / Subtitle">
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
                  <div key={url} className="group relative overflow-hidden rounded-lg border border-border">
                    <ImageThumb src={url} alt="Banner image" className="h-24 w-full rounded-none" />
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
            <p className="text-xs text-muted-foreground">PNG, JPG or WEBP · up to 5 MB each</p>
          </div>
        </Field>

        <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : isDirty ? `Save ${scope === "client" ? "Client" : "Service"} Settings*` : `Save ${scope === "client" ? "Client" : "Service"} Settings`}
          </Button>
        </div>
      </form>
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