"use client";

import * as React from "react";
import { Globe, Share2, Upload, RotateCcw, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { LoadingState, ErrorState } from "@/components/admin/state";
import { BrandActionBar } from "@/components/admin/brand-action-bar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useBrandSettings } from "@/lib/hooks/use-brand-settings";
import { uploadImage, validateImageFile, describeUploadError } from "@/lib/api/upload";
import type { BrandConfig } from "@/lib/types";

export default function PlatformSeoPage() {
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
  const [uploadingOg, setUploadingOg] = React.useState(false);
  const ogFileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (draft) {
      setForm({
        defaultTitle: draft.defaultTitle || "ATLASWANDERS | Discover Places. Experience Local.",
        defaultMetaDescription:
          draft.defaultMetaDescription ||
          "Discover tourist destinations, verified local guides, tour packages, stays and dining across Karnataka and beyond with ATLASWANDERS.",
        canonicalUrl: draft.canonicalUrl || "https://www.atlaswanders.com",
        openGraphTitle: draft.openGraphTitle || "ATLASWANDERS — Discover Places. Experience Local.",
        openGraphDescription:
          draft.openGraphDescription ||
          "Global travel discovery and local-services marketplace connecting travellers with authentic experiences.",
        openGraphImageUrl: draft.openGraphImageUrl || "/brand/atlaswanders_og_banner.jpg",
      });
      setIsDirty(false);
    }
  }, [draft]);

  const updateField = (field: keyof BrandConfig, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleOgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validationErr = validateImageFile(file);
    if (validationErr) {
      toast.error("Invalid image", { description: validationErr });
      return;
    }

    setUploadingOg(true);
    try {
      const { url } = await uploadImage(file, "branding/og");
      updateField("openGraphImageUrl", url);
      toast.success("Social sharing image uploaded", {
        description: "Click 'Save Changes' to update your draft.",
      });
    } catch (err) {
      toast.error("Upload failed", { description: describeUploadError(err) });
    } finally {
      setUploadingOg(false);
    }
  };

  const handleResetToDefaults = () => {
    setForm({
      defaultTitle: "ATLASWANDERS | Discover Places. Experience Local.",
      defaultMetaDescription:
        "Discover tourist destinations, verified local guides, tour packages, stays and dining across Karnataka and beyond with ATLASWANDERS.",
      canonicalUrl: "https://www.atlaswanders.com",
      openGraphTitle: "ATLASWANDERS — Discover Places. Experience Local.",
      openGraphDescription:
        "Global travel discovery and local-services marketplace connecting travellers with authentic experiences.",
      openGraphImageUrl: "/brand/atlaswanders_og_banner.jpg",
    });
    setIsDirty(true);
    toast.info("Reset SEO settings to official ATLASWANDERS defaults");
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
        title="SEO & Metadata Configuration"
        subtitle="Configure default search engine titles, descriptions, canonical URLs, and Open Graph social cards."
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
        {/* Form Fields */}
        <div className="lg:col-span-2 space-y-6">
          {/* Default Search Engine Metadata */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Global Search Engine Defaults</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Fallback metadata used when a specific page does not declare custom tags.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetToDefaults}
                className="gap-1.5 text-xs"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Restore Defaults</span>
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="defaultTitle" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Default SEO Title <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-[0.65rem] text-muted-foreground font-mono">
                    {(form.defaultTitle || "").length} / 60 recommended
                  </span>
                </div>
                <Input
                  id="defaultTitle"
                  value={form.defaultTitle ?? ""}
                  onChange={(e) => updateField("defaultTitle", e.target.value)}
                  placeholder="e.g. ATLASWANDERS | Discover Places. Experience Local."
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="defaultMetaDescription" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Default Meta Description
                  </Label>
                  <span className="text-[0.65rem] text-muted-foreground font-mono">
                    {(form.defaultMetaDescription || "").length} / 160 recommended
                  </span>
                </div>
                <Textarea
                  id="defaultMetaDescription"
                  rows={3}
                  value={form.defaultMetaDescription ?? ""}
                  onChange={(e) => updateField("defaultMetaDescription", e.target.value)}
                  placeholder="Compelling summary for search engine result snippets..."
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="canonicalUrl" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Default Canonical Origin
                </Label>
                <Input
                  id="canonicalUrl"
                  value={form.canonicalUrl ?? ""}
                  onChange={(e) => updateField("canonicalUrl", e.target.value)}
                  placeholder="https://www.atlaswanders.com"
                />
                <p className="text-[0.7rem] text-muted-foreground">
                  Standardizes canonical URLs to prevent duplicate content penalties.
                </p>
              </div>
            </div>
          </div>

          {/* Open Graph & Social Sharing */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
            <div className="border-b border-border pb-4">
              <h3 className="text-base font-semibold text-foreground">Open Graph & Social Sharing</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Controls the title, description, and preview banner rendered on social platforms and messaging apps.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="openGraphTitle" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Open Graph Title
                </Label>
                <Input
                  id="openGraphTitle"
                  value={form.openGraphTitle ?? ""}
                  onChange={(e) => updateField("openGraphTitle", e.target.value)}
                  placeholder="e.g. ATLASWANDERS — Discover Places. Experience Local."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="openGraphDescription" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Open Graph Description
                </Label>
                <Textarea
                  id="openGraphDescription"
                  rows={2}
                  value={form.openGraphDescription ?? ""}
                  onChange={(e) => updateField("openGraphDescription", e.target.value)}
                  placeholder="Short description displayed on Facebook, LinkedIn, X, and WhatsApp..."
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="openGraphImageUrl" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Social Sharing Card Image (1200 x 630 px)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="openGraphImageUrl"
                    value={form.openGraphImageUrl ?? ""}
                    onChange={(e) => updateField("openGraphImageUrl", e.target.value)}
                    placeholder="/brand/atlaswanders_og_banner.jpg or https://..."
                    className="font-mono text-xs"
                  />
                  <input
                    ref={ogFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleOgUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploadingOg}
                    onClick={() => ogFileInputRef.current?.click()}
                    className="shrink-0 gap-1.5"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{uploadingOg ? "Uploading..." : "Upload Image"}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Social Preview Card */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Share2 className="h-4 w-4 text-[#087E8B]" />
              <span>Social Share Card Simulator</span>
            </h4>

            {/* Social Card Mock */}
            <div className="rounded-xl border border-border bg-card overflow-hidden shadow-md">
              <div className="relative aspect-video w-full bg-zinc-900 overflow-hidden">
                {form.openGraphImageUrl ? (
                  <img
                    src={form.openGraphImageUrl}
                    alt="Social preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    No image configured
                  </div>
                )}
              </div>
              <div className="p-4 space-y-1.5 bg-muted/20">
                <span className="text-[0.65rem] font-mono text-muted-foreground uppercase tracking-wider">
                  atlaswanders.com
                </span>
                <h5 className="text-sm font-bold text-foreground line-clamp-1 leading-snug">
                  {form.openGraphTitle || form.defaultTitle || "ATLASWANDERS"}
                </h5>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {form.openGraphDescription || form.defaultMetaDescription}
                </p>
              </div>
            </div>

            {/* Preservation Notice */}
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3.5 space-y-1 text-xs text-emerald-800 dark:text-emerald-300">
              <div className="flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Page-Specific SEO Preserved</span>
              </div>
              <p className="text-muted-foreground leading-normal">
                Destination details, places, and tour packages maintain their customized dynamic titles and meta tags. Global defaults apply safely as fallbacks.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
