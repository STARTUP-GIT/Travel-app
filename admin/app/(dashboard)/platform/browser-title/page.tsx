"use client";

import * as React from "react";
import { Bookmark, Compass, RotateCcw, CheckCircle2, Globe, Laptop, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { LoadingState, ErrorState } from "@/components/admin/state";
import { BrandActionBar } from "@/components/admin/brand-action-bar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useBrandSettings } from "@/lib/hooks/use-brand-settings";
import type { BrandConfig } from "@/lib/types";

export default function PlatformBrowserTitlePage() {
  const {
    draft,
    published,
    draftForm: form,
    isDirty,
    hasUnpublishedChanges,
    loading,
    error,
    refetch,
    updateField,
    resetToDefaults,
    saveDraft,
    publish,
    discard,
    saving,
    publishing,
    discarding,
  } = useBrandSettings();

  const handleResetToDefaults = () => {
    resetToDefaults({
      defaultTitle: "ATLASWANDERS | Discover Places. Experience Local.",
      titleFormat: "%s | ATLASWANDERS",
    });
    toast.info("Reset to default title conventions", {
      description: "Click 'Save Changes' to apply these values to your draft.",
    });
  };

  const handleSave = async () => {
    if (!form.defaultTitle?.trim()) {
      toast.error("Validation error", { description: "Default browser title cannot be empty." });
      return;
    }
    await saveDraft();
  };

  // Helper to format simulated title
  const formatTitle = (pageName: string) => {
    const template = form.titleFormat || "%s | ATLASWANDERS";
    return template.replace("%s", pageName);
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
        title="Browser Title & Naming Conventions"
        subtitle="Configure the root browser title and dynamic page title templates across customer and provider websites."
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
        {/* Settings Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Title Templates</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Applied by Next.js metadata API (supports Next.js App Router <code>title.template</code>).
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
                <Label htmlFor="defaultTitle" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Default Home Browser Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="defaultTitle"
                  value={form.defaultTitle ?? ""}
                  onChange={(e) => updateField("defaultTitle", e.target.value)}
                  placeholder="e.g. ATLASWANDERS | Discover Places. Experience Local."
                />
                <p className="text-[0.7rem] text-muted-foreground">
                  The primary browser tab title when a visitor lands on the homepage.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="titleFormat" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Dynamic Page Title Template (Use <code>%s</code> for page name)
                </Label>
                <Input
                  id="titleFormat"
                  value={form.titleFormat ?? ""}
                  onChange={(e) => updateField("titleFormat", e.target.value)}
                  placeholder="e.g. %s | ATLASWANDERS"
                  className="font-mono text-sm"
                />
                <p className="text-[0.7rem] text-muted-foreground">
                  Sub-pages substitute their title in place of <code>%s</code>. Example: <code>%s | ATLASWANDERS</code> or <code>%s — ATLASWANDERS</code>.
                </p>
              </div>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Quick Format Presets
            </h4>
            <div className="flex flex-wrap gap-2">
              {[
                "%s | ATLASWANDERS",
                "%s — ATLASWANDERS",
                "%s · ATLASWANDERS",
                "ATLASWANDERS | %s",
              ].map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => updateField("titleFormat", preset)}
                  className={`font-mono text-xs ${
                    form.titleFormat === preset ? "border-primary bg-primary/10 text-primary" : ""
                  }`}
                >
                  {preset}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Simulator */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Laptop className="h-4 w-4 text-[#087E8B]" />
              <span>Page Title Simulator</span>
            </h4>
            <p className="text-xs text-muted-foreground">
              Simulated browser tab titles across critical platform journeys:
            </p>

            <div className="space-y-3">
              {/* Home */}
              <div className="rounded-lg border border-border p-3 bg-muted/20 space-y-1">
                <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground uppercase font-bold">
                  <span>Home Landing Page</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Root</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <img src={draft?.faviconUrl || "/brand/atlaswanders-favicon.svg"} alt="" className="h-3.5 w-3.5 object-contain" />
                  <span className="truncate">{form.defaultTitle || "ATLASWANDERS | Discover Places. Experience Local."}</span>
                </div>
              </div>

              {/* Destination */}
              <div className="rounded-lg border border-border p-3 bg-muted/20 space-y-1">
                <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground uppercase font-bold">
                  <span>Destination Guide</span>
                  <span className="font-mono text-[0.6rem]">/karnataka/mysuru</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <img src={draft?.faviconUrl || "/brand/atlaswanders-favicon.svg"} alt="" className="h-3.5 w-3.5 object-contain" />
                  <span className="truncate">{formatTitle("Mysuru Palace & Chamundi Hill")}</span>
                </div>
              </div>

              {/* Tour Package */}
              <div className="rounded-lg border border-border p-3 bg-muted/20 space-y-1">
                <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground uppercase font-bold">
                  <span>Tour Package</span>
                  <span className="font-mono text-[0.6rem]">/packages/coorg-trail</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <img src={draft?.faviconUrl || "/brand/atlaswanders-favicon.svg"} alt="" className="h-3.5 w-3.5 object-contain" />
                  <span className="truncate">{formatTitle("Coorg Coffee Trail & Waterfalls 3D2N")}</span>
                </div>
              </div>

              {/* Booking */}
              <div className="rounded-lg border border-border p-3 bg-muted/20 space-y-1">
                <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground uppercase font-bold">
                  <span>Checkout & Booking</span>
                  <span className="font-mono text-[0.6rem]">/booking/checkout</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <img src={draft?.faviconUrl || "/brand/atlaswanders-favicon.svg"} alt="" className="h-3.5 w-3.5 object-contain" />
                  <span className="truncate">{formatTitle("Confirm Your Experience")}</span>
                </div>
              </div>

              {/* Provider Portal */}
              <div className="rounded-lg border border-border p-3 bg-muted/20 space-y-1">
                <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground uppercase font-bold">
                  <span>Service Provider Portal</span>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">Service Web</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <img src={draft?.faviconUrl || "/brand/atlaswanders-favicon.svg"} alt="" className="h-3.5 w-3.5 object-contain" />
                  <span className="truncate">{formatTitle("Guide & Partner Portal")}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
