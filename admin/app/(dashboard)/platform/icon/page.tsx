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

const SIZES = [
  { size: 16, label: "16 x 16 px", context: "Standard Browser Tab" },
  { size: 32, label: "32 x 32 px", context: "Retina Tab & Bookmarks" },
  { size: 48, label: "48 x 48 px", context: "Windows / Desktop Shortcut" },
  { size: 64, label: "64 x 64 px", context: "Taskbar & Dock" },
  { size: 128, label: "128 x 128 px", context: "Apple Touch / Mobile Icon" },
];

export default function PlatformIconPage() {
  const {
    draft,
    published,
    hasUnpublishedChanges,
    loading,
    error,
    refetch,
    saveDraft,
    publish,
    discard,
    saving,
    publishing,
    discarding,
  } = useBrandSettings();

  const [faviconUrl, setFaviconUrl] = React.useState<string>("");
  const [isDirty, setIsDirty] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (draft) {
      setFaviconUrl(draft.faviconUrl || "/brand/atlaswanders-favicon.svg");
      setIsDirty(false);
    }
  }, [draft]);

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
      const { url } = await uploadImage(file, "branding/icons");
      setFaviconUrl(url);
      setIsDirty(true);
      toast.success("Icon uploaded successfully", {
        description: "Click 'Save Changes' to update your draft.",
      });
    } catch (err) {
      toast.error("Upload failed", { description: describeUploadError(err) });
    } finally {
      setUploading(false);
    }
  };

  const handleResetToDefault = () => {
    setFaviconUrl("/brand/atlaswanders-favicon.svg");
    setIsDirty(true);
    toast.info("Reset to official vector favicon", {
      description: "Click 'Save Changes' to apply this icon to your draft.",
    });
  };

  const handleSave = async () => {
    const success = await saveDraft({ faviconUrl });
    if (success) {
      setIsDirty(false);
    }
  };

  if (loading && !draft) {
    return <LoadingState rows={4} />;
  }

  if (error && !draft) {
    return <ErrorState message={error} onRetry={refetch} />;
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Icon & Favicon Management"
        subtitle="Manage the browser tab icon, bookmark badge, and mobile home screen app icon across devices."
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload & Controls */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-semibold text-foreground">Active Browser Icon</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Must be an authentic standalone emblem (SVG or square PNG). Never use a cropped wordmark.
              </p>
            </div>

            {/* Main Icon Card */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-gradient-to-b from-muted/30 to-muted/80 p-6 space-y-3">
              <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-[#0B2545] p-2 shadow-md border border-[#0E3A6C]">
                {faviconUrl ? (
                  <img src={faviconUrl} alt="Favicon" className="h-full w-full object-contain" />
                ) : (
                  <Sparkles className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <span className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">
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
                <span>{uploading ? "Uploading..." : "Upload New Favicon"}</span>
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

            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <span className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Design Specification</span>
              </span>
              <p className="text-muted-foreground leading-normal">
                The approved ATLASWANDERS favicon depicts the centered India globe with gold compass points and flight trajectory. Avoid generic globe icons or text words.
              </p>
            </div>
          </div>
        </div>

        {/* Multi-Size Previews */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
            <div>
              <h3 className="text-base font-semibold text-foreground">Multi-Resolution Display Previews</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Verify that India, the compass points, and flight route remain crisp at small icon sizes.
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
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Simulated Browser Tab Bar
              </h4>
              <div className="rounded-xl border border-border bg-zinc-200 dark:bg-zinc-800 p-2 overflow-hidden shadow-inner">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg bg-card text-foreground text-xs font-medium shadow-xs border border-border">
                    <img src={faviconUrl} alt="tab icon" className="h-3.5 w-3.5 object-contain" />
                    <span className="truncate max-w-[180px]">
                      {draft?.defaultTitle || "ATLASWANDERS | Discover Places. Experience Local."}
                    </span>
                  </div>
                  <div className="text-[0.65rem] text-muted-foreground px-2">
                    + New Tab
                  </div>
                </div>
                <div className="bg-card rounded-b-lg p-2.5 flex items-center gap-2 text-xs text-muted-foreground border-t border-border">
                  <Globe className="h-3.5 w-3.5" />
                  <span className="font-mono text-[0.7rem] text-foreground">
                    https://www.atlaswanders.com
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
