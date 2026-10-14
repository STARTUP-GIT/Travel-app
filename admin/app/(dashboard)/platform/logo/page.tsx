"use client";

import * as React from "react";
import { Upload, Trash2, CheckCircle2, RotateCcw, AlertCircle, Eye, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { LoadingState, ErrorState } from "@/components/admin/state";
import { BrandActionBar } from "@/components/admin/brand-action-bar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useBrandSettings } from "@/lib/hooks/use-brand-settings";
import { uploadImage, validateImageFile, describeUploadError } from "@/lib/api/upload";
import type { BrandConfig } from "@/lib/types";

type LogoVariantKey = "primaryLogoUrl" | "symbolLogoUrl" | "lightLogoUrl" | "darkLogoUrl";

interface VariantConfig {
  key: LogoVariantKey;
  title: string;
  subtitle: string;
  defaultPath: string;
  previewBg: "light" | "dark" | "navy" | "checker";
  recommendedDimensions: string;
}

const VARIANTS: VariantConfig[] = [
  {
    key: "primaryLogoUrl",
    title: "Primary Logo (Wordmark + Emblem)",
    subtitle: "The full horizontal lockup used on main headers, landing hero, and invoice documents.",
    defaultPath: "/brand/atlaswanders-primary.svg",
    previewBg: "light",
    recommendedDimensions: "540 x 120 px (SVG or transparent PNG)",
  },
  {
    key: "symbolLogoUrl",
    title: "Symbol-Only Logo (Emblem)",
    subtitle: "Standalone globe, India outline and compass emblem for app icons, compact headers, and avatars.",
    defaultPath: "/brand/atlaswanders-symbol.svg",
    previewBg: "navy",
    recommendedDimensions: "200 x 200 px (1:1 aspect ratio)",
  },
  {
    key: "lightLogoUrl",
    title: "Light-Background Logo Variant",
    subtitle: "Tuned for white and light grey backgrounds with deep navy lettering and vibrant teal accents.",
    defaultPath: "/brand/atlaswanders-light.svg",
    previewBg: "light",
    recommendedDimensions: "540 x 120 px (SVG or transparent PNG)",
  },
  {
    key: "darkLogoUrl",
    title: "Dark-Background Logo Variant",
    subtitle: "Tuned for dark navy and night surfaces with crisp white lettering and warm gold accents.",
    defaultPath: "/brand/atlaswanders-dark.svg",
    previewBg: "dark",
    recommendedDimensions: "540 x 120 px (SVG or transparent PNG)",
  },
];

export default function PlatformLogoPage() {
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

  const [form, setForm] = React.useState<Partial<BrandConfig>>({});
  const [isDirty, setIsDirty] = React.useState(false);
  const [uploadingVariant, setUploadingVariant] = React.useState<LogoVariantKey | null>(null);

  const fileInputRefs = {
    primaryLogoUrl: React.useRef<HTMLInputElement>(null),
    symbolLogoUrl: React.useRef<HTMLInputElement>(null),
    lightLogoUrl: React.useRef<HTMLInputElement>(null),
    darkLogoUrl: React.useRef<HTMLInputElement>(null),
  };

  React.useEffect(() => {
    if (draft) {
      setForm({
        primaryLogoUrl: draft.primaryLogoUrl || "/brand/atlaswanders-primary.svg",
        symbolLogoUrl: draft.symbolLogoUrl || "/brand/atlaswanders-symbol.svg",
        lightLogoUrl: draft.lightLogoUrl || "/brand/atlaswanders-light.svg",
        darkLogoUrl: draft.darkLogoUrl || "/brand/atlaswanders-dark.svg",
      });
      setIsDirty(false);
    }
  }, [draft]);

  const handleFileUpload = async (variant: LogoVariantKey, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validationErr = validateImageFile(file, { allowSvg: true });
    if (validationErr) {
      toast.error("Invalid image file", { description: validationErr });
      return;
    }

    setUploadingVariant(variant);
    try {
      const { url } = await uploadImage(file, "branding/logos");
      setForm((prev) => ({ ...prev, [variant]: url }));
      setIsDirty(true);
      toast.success("Logo uploaded successfully", {
        description: "Click 'Save Changes' to update your draft.",
      });
    } catch (err) {
      toast.error("Upload failed", { description: describeUploadError(err) });
    } finally {
      setUploadingVariant(null);
    }
  };

  const handleResetToDefault = (variant: LogoVariantKey, defaultPath: string) => {
    setForm((prev) => ({ ...prev, [variant]: defaultPath }));
    setIsDirty(true);
    toast.info("Reset to official vector asset", {
      description: "Click 'Save Changes' to apply this asset to your draft.",
    });
  };

  const handleRemoveAsset = (variant: LogoVariantKey) => {
    setForm((prev) => ({ ...prev, [variant]: "" }));
    setIsDirty(true);
    toast.warning("Logo asset cleared", {
      description: "Click 'Save Changes' to update your draft.",
    });
  };

  const handleSave = async () => {
    const success = await saveDraft(form);
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
        title="Logo Management"
        subtitle="Upload, inspect, and manage the official ATLASWANDERS logo variants across dark and light surfaces."
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

      {/* Grid of Logo Variants */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {VARIANTS.map((v) => {
          const currentUrl = form[v.key];
          const isUploading = uploadingVariant === v.key;

          let bgClasses = "bg-white border-zinc-200 text-zinc-900";
          if (v.previewBg === "dark") {
            bgClasses = "bg-[#040D18] border-zinc-800 text-white";
          } else if (v.previewBg === "navy") {
            bgClasses = "bg-[#0B2545] border-[#0E3A6C] text-white";
          }

          return (
            <div
              key={v.key}
              className="rounded-xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">{v.title}</h4>
                  <span className="text-[0.65rem] font-mono text-muted-foreground uppercase px-2 py-0.5 rounded bg-muted">
                    {v.recommendedDimensions}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{v.subtitle}</p>
              </div>

              {/* Preview Box */}
              <div
                className={`relative flex h-36 w-full items-center justify-center rounded-lg border p-4 transition-all duration-200 ${bgClasses}`}
              >
                {currentUrl ? (
                  <img
                    src={currentUrl}
                    alt={v.title}
                    className="max-h-24 max-w-full object-contain drop-shadow-sm"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-muted-foreground space-y-1">
                    <ImageIcon className="h-8 w-8 opacity-40" />
                    <span className="text-xs">No asset configured</span>
                  </div>
                )}
              </div>

              {/* Asset URL Display */}
              <div className="text-[0.7rem] font-mono text-muted-foreground truncate bg-muted/40 p-1.5 rounded border border-border">
                {currentUrl || "None (cleared)"}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <input
                  ref={fileInputRefs[v.key]}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => handleFileUpload(v.key, e)}
                />

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                  onClick={() => fileInputRefs[v.key].current?.click()}
                  className="gap-1.5 text-xs"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>{isUploading ? "Uploading..." : "Upload New"}</span>
                </Button>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResetToDefault(v.key, v.defaultPath)}
                    className="text-xs text-muted-foreground hover:text-foreground gap-1"
                    title="Restore official vector SVG"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span className="hidden sm:inline">Official Vector</span>
                  </Button>

                  {currentUrl && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove {v.title}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove this logo asset? The platform will fall back to the system emblem until a replacement is configured.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemoveAsset(v.key)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remove Asset
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
