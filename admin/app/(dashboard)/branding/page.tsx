"use client";

import * as React from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { patchJSON } from "@/lib/api/mutate";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import type { AppSettings } from "@/lib/types";

export default function BrandingPage() {
  const { data, loading, error, refetch } = useAdminData<{ settings: AppSettings }>(
    "/admin/api/settings"
  );

  type BrandingForm = Omit<Partial<AppSettings>, "imageBanners"> & { imageBanners: string };

  const [form, setForm] = React.useState<BrandingForm>({ imageBanners: "" });
  const [saving, setSaving] = React.useState(false);

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
        imageBanners: (s.imageBanners ?? []).join("\n"),
      });
    }
  }, [data]);

  const settings = data?.settings;

  const set = (key: keyof BrandingForm, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

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
        imageBanners: form.imageBanners
          .split("\n")
          .map((s: string) => s.trim())
          .filter(Boolean),
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
          <Field label="Icon URL">
            <Input value={form.icon ?? ""} onChange={(e) => set("icon", e.target.value)} placeholder="https://…/icon.png" />
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
          <Field label="Header banner images (one per line)">
            <Textarea
              value={form.imageBanners}
              onChange={(e) => set("imageBanners", e.target.value)}
              rows={4}
              placeholder="https://…/banner-1.jpg"
            />
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