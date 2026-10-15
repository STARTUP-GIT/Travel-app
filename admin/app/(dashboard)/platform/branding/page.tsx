"use client";

import * as React from "react";
import { Sparkles, Palette, ShieldCheck, Info, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { LoadingState, ErrorState } from "@/components/admin/state";
import { BrandActionBar } from "@/components/admin/brand-action-bar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBrandSettings } from "@/lib/hooks/use-brand-settings";
import type { BrandConfig } from "@/lib/types";

export default function PlatformBrandingPage() {
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

  const handleSave = async () => {
    if (!form.brandName?.trim()) {
      toast.error("Validation error", { description: "Brand name cannot be empty." });
      return;
    }
    await saveDraft();
  };

  const handleResetToOfficialDefaults = () => {
    resetToDefaults({
      brandName: "ATLASWANDERS",
      tagline: "Discover Places. Experience Local.",
      primaryColor: "#0B2545",
      secondaryColor: "#087E8B",
      accentColor: "#D9A441",
      brandDescription:
        "Global travel discovery, local tourism marketplace, and travel-services platform connecting travellers with authentic experiences.",
      themePreference: "light",
    });
    toast.info("Reset to official ATLASWANDERS defaults", {
      description: "Click 'Save Changes' to apply these values to your draft.",
    });
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
        title="Brand Identity & Palette"
        subtitle="Configure the central brand name, tagline, theme colors, and core platform identity across customer and provider websites."
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
        {/* Core Brand Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Official Brand Identity</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Core identity tokens shared across all customer-facing and service-provider touchpoints.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetToOfficialDefaults}
                className="gap-1.5 text-xs"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Restore Defaults</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brandName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Brand Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="brandName"
                  value={form.brandName ?? ""}
                  onChange={(e) => updateField("brandName", e.target.value)}
                  placeholder="e.g. ATLASWANDERS"
                  className="font-medium text-foreground tracking-wide"
                />
                <p className="text-[0.7rem] text-muted-foreground">
                  Displayed in navigation bars, copyright notices, page headers, and system emails.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tagline" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Official Tagline
                </Label>
                <Input
                  id="tagline"
                  value={form.tagline ?? ""}
                  onChange={(e) => updateField("tagline", e.target.value)}
                  placeholder="e.g. Discover Places. Experience Local."
                />
                <p className="text-[0.7rem] text-muted-foreground">
                  The primary brand slogan paired with the logo emblem.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="brandDescription" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Brand & Platform Description
              </Label>
              <Textarea
                id="brandDescription"
                rows={3}
                value={form.brandDescription ?? ""}
                onChange={(e) => updateField("brandDescription", e.target.value)}
                placeholder="Describe ATLASWANDERS mission and offerings..."
                className="resize-none"
              />
              <p className="text-[0.7rem] text-muted-foreground">
                Used in footer summaries, about cards, and meta description fallbacks.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="themePreference" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Default Logo & Theme Preference
              </Label>
              <Select
                value={form.themePreference || "light"}
                onValueChange={(val) => updateField("themePreference", val)}
              >
                <SelectTrigger id="themePreference" className="w-full sm:w-60">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light Background (Primary)</SelectItem>
                  <SelectItem value="dark">Dark Background (Night Mode)</SelectItem>
                  <SelectItem value="system">System / Adaptive</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[0.7rem] text-muted-foreground">
                Determines which logo lockup is prioritized when render background is ambiguous.
              </p>
            </div>
          </div>

          {/* Color Palette Management */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
            <div className="border-b border-border pb-4">
              <h3 className="text-base font-semibold text-foreground">Brand Color Palette</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Harmonious travel tech palette: Deep Navy, Travel Teal, Warm Gold, and Clean White.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Primary Color */}
              <div className="space-y-2.5 rounded-lg border border-border p-3.5 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Deep Navy (Primary)
                  </span>
                  <div
                    className="h-6 w-6 rounded-md shadow-inner border border-black/10"
                    style={{ backgroundColor: form.primaryColor || "#0B2545" }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.primaryColor || "#0B2545"}
                    onChange={(e) => updateField("primaryColor", e.target.value)}
                    className="h-9 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  />
                  <Input
                    value={form.primaryColor ?? ""}
                    onChange={(e) => updateField("primaryColor", e.target.value)}
                    placeholder="#0B2545"
                    className="font-mono text-xs uppercase"
                  />
                </div>
                <p className="text-[0.7rem] text-muted-foreground">
                  Applied to primary headers, main nav bars, and dominant surfaces.
                </p>
              </div>

              {/* Secondary Color */}
              <div className="space-y-2.5 rounded-lg border border-border p-3.5 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Travel Teal (Secondary)
                  </span>
                  <div
                    className="h-6 w-6 rounded-md shadow-inner border border-black/10"
                    style={{ backgroundColor: form.secondaryColor || "#087E8B" }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.secondaryColor || "#087E8B"}
                    onChange={(e) => updateField("secondaryColor", e.target.value)}
                    className="h-9 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  />
                  <Input
                    value={form.secondaryColor ?? ""}
                    onChange={(e) => updateField("secondaryColor", e.target.value)}
                    placeholder="#087E8B"
                    className="font-mono text-xs uppercase"
                  />
                </div>
                <p className="text-[0.7rem] text-muted-foreground">
                  Applied to interactive links, active tabs, buttons, and badges.
                </p>
              </div>

              {/* Accent Color */}
              <div className="space-y-2.5 rounded-lg border border-border p-3.5 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Warm Gold (Accent)
                  </span>
                  <div
                    className="h-6 w-6 rounded-md shadow-inner border border-black/10"
                    style={{ backgroundColor: form.accentColor || "#D9A441" }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.accentColor || "#D9A441"}
                    onChange={(e) => updateField("accentColor", e.target.value)}
                    className="h-9 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
                  />
                  <Input
                    value={form.accentColor ?? ""}
                    onChange={(e) => updateField("accentColor", e.target.value)}
                    placeholder="#D9A441"
                    className="font-mono text-xs uppercase"
                  />
                </div>
                <p className="text-[0.7rem] text-muted-foreground">
                  Reserved for the compass rose, India highlight, ratings, and featured tags.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Live Identity Card & Quick Stats */}
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#087E8B]" />
              <span>Live Brand Card</span>
            </h4>

            {/* Visual Lockup Preview Box */}
            <div
              className="rounded-xl p-5 flex flex-col items-center justify-center text-center shadow-md transition-all duration-300"
              style={{
                backgroundColor: form.primaryColor || "#0B2545",
                color: "#FFFFFF",
              }}
            >
              <div className="flex items-center justify-center p-2 mb-2">
                <img
                  src="/brand/atlaswanders-symbol.svg"
                  alt="Emblem"
                  className="h-16 w-16 drop-shadow-md"
                />
              </div>

              <h2 className="text-xl font-extrabold tracking-wide mt-1">
                {form.brandName || "ATLASWANDERS"}
              </h2>

              <p
                className="text-xs font-semibold tracking-[0.2em] uppercase mt-1"
                style={{ color: form.accentColor || "#D9A441" }}
              >
                {form.tagline || "Discover Places. Experience Local."}
              </p>

              <div className="mt-4 pt-3 border-t border-white/10 w-full flex items-center justify-center gap-2">
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded text-[0.65rem] font-medium"
                  style={{ backgroundColor: form.secondaryColor || "#087E8B" }}
                >
                  Global Travel Discovery
                </span>
                <span className="text-[0.65rem] text-white/70">
                  Karnataka & Worldwide
                </span>
              </div>
            </div>

            {/* Synchronization Notice */}
            <div className="rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 p-3.5 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-blue-900 dark:text-blue-300">
                <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Synchronized Deployments</span>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                When you click <strong>Publish to Live</strong>, this branding configuration is broadcast immediately to both the Customer frontend and Provider portal via the centralized backend.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
