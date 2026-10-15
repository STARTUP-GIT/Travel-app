"use client";

import * as React from "react";
import {
  Eye,
  Send,
  RotateCcw,
  Sparkles,
  Compass,
  MapPin,
  Calendar,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Laptop,
  Smartphone,
  Sun,
  Moon,
  ArrowRight,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin/page-header";
import { LoadingState, ErrorState } from "@/components/admin/state";
import { BrandActionBar } from "@/components/admin/brand-action-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBrandSettings } from "@/lib/hooks/use-brand-settings";
import type { BrandConfig } from "@/lib/types";

export default function PlatformLivePreviewPage() {
  const {
    draft,
    published,
    draftForm: preview,
    isDirty: isTweaked,
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

  const [previewMode, setPreviewMode] = React.useState<"light" | "dark">("light");

  const handleSaveDraft = async () => {
    await saveDraft();
  };

  const handlePublish = async () => {
    await publish();
  };

  if (loading && !draft) {
    return <LoadingState rows={4} />;
  }

  if (error && !draft) {
    return <ErrorState message={error} onRetry={refetch} />;
  }

  const primary = preview.primaryColor || "#0B2545";
  const secondary = preview.secondaryColor || "#087E8B";
  const accent = preview.accentColor || "#D9A441";
  const brandName = preview.brandName || "ATLASWANDERS";
  const tagline = preview.tagline || "Discover Places. Experience Local.";

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Live Brand Preview"
        subtitle="Real-time interactive canvas showing how published and draft branding looks on customer and provider frontends."
      />

      <BrandActionBar
        hasUnpublishedChanges={hasUnpublishedChanges}
        onSave={handleSaveDraft}
        onPublish={handlePublish}
        onDiscard={discard}
        saving={saving}
        publishing={publishing}
        discarding={discarding}
        saveLabel={isTweaked ? "Save Tweaks to Draft*" : "Draft In Sync"}
        hidePreviewLink={true}
      />

      {/* Control Strip & Theme Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Preview Mode:
          </span>
          <Tabs
            value={previewMode}
            onValueChange={(v) => setPreviewMode(v as "light" | "dark")}
            className="w-auto"
          >
            <TabsList className="h-8">
              <TabsTrigger value="light" className="text-xs gap-1.5 h-7">
                <Sun className="h-3.5 w-3.5" />
                <span>Light Theme</span>
              </TabsTrigger>
              <TabsTrigger value="dark" className="text-xs gap-1.5 h-7">
                <Moon className="h-3.5 w-3.5" />
                <span>Dark Theme</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-3">
          {isTweaked && (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400 animate-pulse">
              ● Unsaved local canvas tweaks
            </span>
          )}
          <span className="text-xs text-muted-foreground font-mono">
            {published?.publishedAt
              ? `Live since: ${new Date(published.publishedAt).toLocaleDateString()}`
              : "No live publish yet"}
          </span>
        </div>
      </div>

      {/* Main Interactive Canvas */}
      <div className="space-y-8">
        {/* Mock Browser Window */}
        <div className="rounded-2xl border border-border shadow-lg overflow-hidden bg-card transition-colors duration-300">
          {/* Browser Window Header */}
          <div className="flex items-center gap-3 border-b border-border bg-zinc-100 dark:bg-zinc-900 px-4 py-2.5">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-red-400 inline-block"></span>
              <span className="h-3 w-3 rounded-full bg-amber-400 inline-block"></span>
              <span className="h-3 w-3 rounded-full bg-emerald-400 inline-block"></span>
            </div>

            {/* Active Browser Tab */}
            <div className="flex items-center gap-2 rounded-t-lg bg-card px-3.5 py-1.5 text-xs font-medium text-foreground border border-b-0 border-border shadow-xs">
              <img
                src={preview.faviconUrl || "/brand/atlaswanders-favicon.svg"}
                alt="Favicon"
                className="h-3.5 w-3.5 object-contain"
              />
              <span className="truncate max-w-[220px]">
                {preview.defaultTitle || "ATLASWANDERS | Discover Places. Experience Local."}
              </span>
            </div>

            <div className="hidden sm:flex flex-1 items-center justify-center">
              <div className="flex items-center gap-2 rounded-full bg-zinc-200 dark:bg-zinc-800 px-4 py-1 text-xs text-muted-foreground font-mono w-full max-w-sm">
                <Globe className="h-3 w-3 text-emerald-600" />
                <span className="text-foreground">https://www.atlaswanders.com</span>
              </div>
            </div>
          </div>

          {/* Web Page Content Simulation */}
          <div
            className={`p-6 transition-colors duration-300 ${
              previewMode === "dark" ? "bg-[#040D18] text-white" : "bg-white text-zinc-900"
            }`}
          >
            {/* Mock Navigation Header */}
            <header
              className={`rounded-xl border p-4 flex items-center justify-between shadow-xs mb-8 ${
                previewMode === "dark"
                  ? "bg-[#0B2545]/90 border-white/10"
                  : "bg-white border-zinc-200"
              }`}
            >
              <div className="flex items-center gap-6">
                {/* Logo Display */}
                <div className="flex items-center gap-2.5">
                  <img
                    src={preview.symbolLogoUrl || "/brand/atlaswanders-symbol.svg"}
                    alt={brandName}
                    className="h-9 w-9 object-contain"
                  />
                  <div className="flex flex-col leading-none">
                    <span
                      className="text-lg font-black tracking-tight"
                      style={{ color: previewMode === "dark" ? "#FFFFFF" : primary }}
                    >
                      {brandName}
                    </span>
                    <span
                      className="text-[0.6rem] font-bold tracking-[0.2em] uppercase mt-0.5"
                      style={{ color: accent }}
                    >
                      {tagline}
                    </span>
                  </div>
                </div>

                {/* Nav Links */}
                <nav className="hidden md:flex items-center gap-4 text-xs font-semibold">
                  <span
                    className="cursor-pointer transition-colors"
                    style={{ color: secondary }}
                  >
                    Destinations
                  </span>
                  <span className="text-muted-foreground hover:text-foreground cursor-pointer">
                    Tour Packages
                  </span>
                  <span className="text-muted-foreground hover:text-foreground cursor-pointer">
                    Local Guides
                  </span>
                  <span className="text-muted-foreground hover:text-foreground cursor-pointer">
                    Stays & Dining
                  </span>
                </nav>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  className="rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all"
                  style={{
                    borderColor: secondary,
                    color: previewMode === "dark" ? "#FFFFFF" : secondary,
                  }}
                >
                  Provider Portal
                </button>
                <button
                  type="button"
                  className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-all"
                  style={{ backgroundColor: secondary }}
                >
                  Sign In
                </button>
              </div>
            </header>

            {/* Mock Hero Section */}
            <div
              className={`rounded-2xl p-8 mb-8 border relative overflow-hidden ${
                previewMode === "dark"
                  ? "bg-gradient-to-br from-[#0B2545] via-[#061527] to-[#040D18] border-white/10"
                  : "bg-gradient-to-br from-blue-50/50 via-teal-50/30 to-amber-50/20 border-zinc-200"
              }`}
            >
              <div className="max-w-2xl space-y-4">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
                  style={{
                    backgroundColor: `${secondary}20`,
                    color: secondary,
                    border: `1px solid ${secondary}40`,
                  }}
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Karnataka & Global Tourism Marketplace</span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                  Discover Places. <br />
                  <span style={{ color: secondary }}>Experience Local.</span>
                </h1>

                <p className="text-sm opacity-80 leading-relaxed max-w-xl">
                  Connect with certified tour guides, curated multi-stop itineraries, heritage monuments, boutique stays, and authentic culinary experiences across Karnataka.
                </p>

                {/* Mock Search Bar */}
                <div className="flex items-center gap-2 rounded-xl bg-card border border-border p-2 max-w-md shadow-md text-foreground">
                  <Search className="h-4 w-4 text-muted-foreground ml-2" />
                  <input
                    type="text"
                    disabled
                    placeholder="Search Mysuru, Hampi, Coorg, Gokarna..."
                    className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-hidden"
                  />
                  <button
                    type="button"
                    className="rounded-lg px-4 py-2 text-xs font-bold text-white shrink-0"
                    style={{ backgroundColor: secondary }}
                  >
                    Explore
                  </button>
                </div>
              </div>
            </div>

            {/* Component & Token Showcase */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Palette Card */}
              <div
                className={`rounded-xl border p-5 space-y-3 ${
                  previewMode === "dark" ? "bg-card/50 border-white/10" : "bg-card border-border"
                }`}
              >
                <h4 className="text-xs font-bold uppercase tracking-wider opacity-70">
                  Active Brand Palette
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-4 w-4 rounded-full border border-black/10"
                        style={{ backgroundColor: primary }}
                      />
                      <span>Deep Navy</span>
                    </span>
                    <span className="font-mono opacity-60">{primary}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-4 w-4 rounded-full border border-black/10"
                        style={{ backgroundColor: secondary }}
                      />
                      <span>Travel Teal</span>
                    </span>
                    <span className="font-mono opacity-60">{secondary}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-4 w-4 rounded-full border border-black/10"
                        style={{ backgroundColor: accent }}
                      />
                      <span>Warm Gold</span>
                    </span>
                    <span className="font-mono opacity-60">{accent}</span>
                  </div>
                </div>
              </div>

              {/* Button System Card */}
              <div
                className={`rounded-xl border p-5 space-y-3 ${
                  previewMode === "dark" ? "bg-card/50 border-white/10" : "bg-card border-border"
                }`}
              >
                <h4 className="text-xs font-bold uppercase tracking-wider opacity-70">
                  Button & Link Hierarchy
                </h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-xs"
                    style={{ backgroundColor: primary }}
                  >
                    Primary Action
                  </button>
                  <button
                    type="button"
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-white shadow-xs"
                    style={{ backgroundColor: secondary }}
                  >
                    Secondary Action
                  </button>
                  <button
                    type="button"
                    className="rounded-lg px-3 py-1.5 text-xs font-semibold text-zinc-900 shadow-xs"
                    style={{ backgroundColor: accent }}
                  >
                    Accent Tag
                  </button>
                </div>
              </div>

              {/* Logo Lockups Card */}
              <div
                className={`rounded-xl border p-5 space-y-3 ${
                  previewMode === "dark" ? "bg-card/50 border-white/10" : "bg-card border-border"
                }`}
              >
                <h4 className="text-xs font-bold uppercase tracking-wider opacity-70">
                  Logo Lockup Variant
                </h4>
                <div className="flex items-center justify-center p-3 rounded-lg bg-black/10 dark:bg-white/5 border border-border">
                  <img
                    src={
                      previewMode === "dark"
                        ? preview.darkLogoUrl || "/brand/atlaswanders-dark.svg"
                        : preview.lightLogoUrl || "/brand/atlaswanders-light.svg"
                    }
                    alt="Active logo lockup"
                    className="max-h-12 max-w-full object-contain"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
