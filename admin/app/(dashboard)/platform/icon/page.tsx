"use client";

import * as React from "react";
import { Upload, Sparkles, CheckCircle2, RotateCcw, Monitor, Smartphone, Globe, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { LoadingState, ErrorState } from "@/components/admin/state";
import { BrandActionBar } from "@/components/admin/brand-action-bar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useBrandSettings } from "@/lib/hooks/use-brand-settings";
import { uploadImage, validateImageFile, describeUploadError } from "@/lib/api/upload";
import type { BrandConfig } from "@/lib/types";

const SIZES = [
  { size: 16, label: "16 x 16 px", context: "Standard Browser Tab" },
  { size: 32, label: "32 x 32 px", context: "Retina Tab & Bookmarks" },
  { size: 48, label: "48 x 48 px", context: "Windows / Desktop Shortcut" },
  { size: 64, label: "64 x 64 px", context: "Taskbar & Dock" },
  { size: 128, label: "128 x 128 px", context: "Apple Touch / Mobile Icon" },
];

type AppScope = "client" | "service" | "admin";

export default function PlatformIconPage() {
  const {
    draft,
    published,
    draftForm,
    isDirty,
    hasUnpublishedChanges,
    loading,
    error,
    refetch,
    updateField,
    saveDraft,
    publish,
    discard,
    saving,
    publishing,
    discarding,
  } = useBrandSettings();

  const [activeScope, setActiveScope] = React.useState<AppScope>("client");
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const scopeFieldMap: Record<AppScope, keyof BrandConfig> = {
    client: "clientFaviconUrl",
    service: "serviceFaviconUrl",
    admin: "adminFaviconUrl",
  };

  const currentField = scopeFieldMap[activeScope];
  const faviconUrl =
    (draftForm[currentField] as string | undefined) ||
    draftForm.faviconUrl ||
    "/brand/atlaswanders-favicon.svg";

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validationErr = validateImageFile(file, { allowSvg: true });
    if (validationErr) {
      toast.error("Invalid icon file", { description: validationErr });
      return;
    }

    setUploading(true);
    try {
      const folder = `branding/icons/${activeScope}`;
      const { url } = await uploadImage(file, folder);

      // Update the specific scope icon
      updateField(currentField, url);

      // Also keep the legacy global favicon in sync if updating client scope
      if (activeScope === "client") {
        updateField("faviconUrl", url);
      }

      toast.success(`${scopeMeta[activeScope].name} icon uploaded`, {
        description: "Click 'Save Changes' and 'Publish' to deploy this icon to the live website.",
      });
    } catch (err) {
      toast.error("Upload failed", { description: describeUploadError(err) });
    } finally {
      setUploading(false);
    }
  };

  const handleResetToDefault = () => {
    const defaultUrl = "/brand/atlaswanders-favicon.svg";
    updateField(currentField, defaultUrl);
    if (activeScope === "client") {
      updateField("faviconUrl", defaultUrl);
    }
    toast.info(`Reset ${scopeMeta[activeScope].name} to official vector icon`, {
      description: "Click 'Save Changes' to apply this icon to your draft.",
    });
  };

  const handleSave = async () => {
    await saveDraft();
  };

  if (loading && !draft) {
    return <LoadingState rows={4} />;
  }

  if (error && !draft) {
    return <ErrorState message={error} onRetry={refetch} />;
  }

  const scopeMeta: Record<
    AppScope,
    { name: string; target: string; urlPreview: string; tabTitle: string; note: string }
  > = {
    client: {
      name: "Client App",
      target: "Customer Website & Mobile (frontend/)",
      urlPreview: "https://www.atlaswanders.com",
      tabTitle: draft?.defaultTitle || "ATLASWANDERS | Discover Places. Experience Local.",
      note: "Live customer favicon. Changing this updates http://localhost:3000 browser tabs without affecting Service App or Admin.",
    },
    service: {
      name: "Service App",
      target: "Partner & Service Provider Portal (service-frontend/)",
      urlPreview: "https://partner.atlaswanders.com",
      tabTitle: "ATLASWANDERS | Provider Portal",
      note: "Live partner portal favicon. Changing this updates http://localhost:3001 browser tabs without affecting Client App or Admin.",
    },
    admin: {
      name: "Admin Portal",
      target: "Operations & Administration Suite (admin/)",
      urlPreview: "https://admin.atlaswanders.com",
      tabTitle: "ATLASWANDERS | Admin Suite",
      note: "Internal administrator portal favicon. Changing this updates internal admin browser tabs.",
    },
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Icon & Favicon Management"
        subtitle="Manage the browser tab icon, bookmark badge, and web app icons independently across Client App, Service App, and Admin."
      />

      <BrandActionBar
        hasUnpublishedChanges={hasUnpublishedChanges || isDirty}
        onSave={handleSave}
        onPublish={publish}
        onDiscard={discard}
        saving={saving}
        publishing={publishing}
        discarding={discarding}
        saveLabel={isDirty ? "Save Changes*" : "Saved"}
      />

      {/* Scope Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        {(["client", "service", "admin"] as AppScope[]).map((scopeKey) => {
          const isActive = activeScope === scopeKey;
          const targetUrl =
            (draftForm[scopeFieldMap[scopeKey]] as string | undefined) ||
            draftForm.faviconUrl ||
            "/brand/atlaswanders-favicon.svg";

          return (
            <button
              key={scopeKey}
              type="button"
              onClick={() => setActiveScope(scopeKey)}
              className={`flex items-center gap-2.5 rounded-xl px-4 py-2 text-xs font-medium transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <div className="size-5 rounded-md bg-[#0B2545] p-0.5 shrink-0 flex items-center justify-center">
                <img src={targetUrl} alt="" className="h-full w-full object-contain" />
              </div>
              <div className="text-left leading-tight">
                <p className="font-semibold">{scopeMeta[scopeKey].name}</p>
                <p className={`text-[10px] ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {scopeKey === "client" ? "Customer" : scopeKey === "service" ? "Service" : "Admin"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload & Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">
                  {scopeMeta[activeScope].name} Icon
                </h3>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Scoped Asset
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {scopeMeta[activeScope].target}
              </p>
            </div>

            {/* Main Icon Card */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-gradient-to-b from-muted/30 to-muted/80 p-6 space-y-3">
              <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-[#0B2545] p-2 shadow-md border border-[#0E3A6C]">
                {faviconUrl ? (
                  <img src={faviconUrl} alt={`${scopeMeta[activeScope].name} Favicon`} className="h-full w-full object-contain" />
                ) : (
                  <Sparkles className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px]" title={faviconUrl}>
                {faviconUrl}
              </span>
            </div>

            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
                className="hidden"
                onChange={handleFileUpload}
              />

              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full gap-2"
              >
                <Upload className="h-4 w-4" />
                <span>{uploading ? "Uploading..." : `Upload ${scopeMeta[activeScope].name} Icon`}</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleResetToDefault}
                className="w-full gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Restore Official Vector Icon</span>
              </Button>
            </div>

            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 text-xs text-blue-900 dark:text-blue-300 space-y-1">
              <span className="font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                <span>Scope Isolation</span>
              </span>
              <p className="text-muted-foreground leading-normal">
                {scopeMeta[activeScope].note}
              </p>
            </div>

            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <span className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Mobile vs Web Icon Note</span>
              </span>
              <p className="text-muted-foreground leading-normal">
                Runtime web favicon and PWA icons update dynamically. Native mobile launcher icons (Android/iOS home screens) are compiled at app build time and require a native app rebuild.
              </p>
            </div>
          </div>
        </div>

        {/* Multi-Size Previews */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Multi-Resolution Display Previews ({scopeMeta[activeScope].name})
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Verify that India, the compass points, and flight route remain crisp at all tab and bookmark sizes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SIZES.map((s) => (
                <div
                  key={s.size}
                  className="flex items-center gap-4 rounded-lg border border-border p-4 bg-muted/20"
                >
                  <div
                    className="flex shrink-0 items-center justify-center rounded-lg bg-[#0B2545] p-1.5 shadow-xs border border-[#0E3A6C]"
                    style={{ width: Math.max(s.size + 16, 44), height: Math.max(s.size + 16, 44) }}
                  >
                    <img
                      src={faviconUrl}
                      alt={`${s.size}px preview`}
                      style={{ width: s.size, height: s.size }}
                      className="object-contain"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.context}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Simulated Browser Tab Bar Preview */}
            <div className="mt-6 pt-5 border-t border-border space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Simulated Browser Tab Bar ({scopeMeta[activeScope].name})
                </h4>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {scopeMeta[activeScope].urlPreview}
                </span>
              </div>
              <div className="rounded-xl border border-border bg-zinc-200 dark:bg-zinc-800 p-2 overflow-hidden shadow-inner">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg bg-card text-foreground text-xs font-medium shadow-xs border border-border">
                    <img src={faviconUrl} alt="tab icon" className="h-3.5 w-3.5 object-contain" />
                    <span className="truncate max-w-[220px]">
                      {scopeMeta[activeScope].tabTitle}
                    </span>
                  </div>
                  <div className="text-[0.65rem] text-muted-foreground px-2">
                    + New Tab
                  </div>
                </div>
                <div className="bg-card rounded-b-lg p-2.5 flex items-center gap-2 text-xs text-muted-foreground border-t border-border">
                  <Globe className="h-3.5 w-3.5" />
                  <span className="font-mono text-[0.7rem] text-foreground">
                    {scopeMeta[activeScope].urlPreview}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
