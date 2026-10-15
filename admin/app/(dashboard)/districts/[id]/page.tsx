"use client";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Plus,
  RotateCcw,
  Upload,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { StatusBadge } from "@/components/admin/status-badge";
import { ToggleField } from "@/components/admin/toggle-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { patchJSON } from "@/lib/api/mutate";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { describeUploadError, uploadImage, validateImageFile } from "@/lib/api/upload";
import type { DistrictAdmin } from "@/lib/types";

export default function DistrictDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { data, loading, error, refetch } = useAdminData<{ district: DistrictAdmin }>(
    `/admin/api/districts/${id}`
  );

  const district = data?.district;

  // Local state for hero and heading settings
  const [useCustomHero, setUseCustomHero] = React.useState<boolean>(false);
  const [customHeroUrl, setCustomHeroUrl] = React.useState<string>("");
  const [headingOverride, setHeadingOverride] = React.useState<string>("inherit");
  const [isHeroDirty, setIsHeroDirty] = React.useState<boolean>(false);
  const [uploadingHero, setUploadingHero] = React.useState<boolean>(false);
  const [savingHero, setSavingHero] = React.useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (district) {
      setUseCustomHero(district.useCustomHeroImage ?? false);
      setCustomHeroUrl(district.heroImageUrl ?? "");
      setHeadingOverride(district.showWelcomeHeading || "inherit");
      setIsHeroDirty(false);
    }
  }, [district]);

  async function toggleService(next: boolean) {
    await patchJSON(`/admin/api/districts/${id}`, { isServiceAvailable: next });
    toast.success(next ? "District service enabled" : "District service disabled");
    refetch();
  }

  async function toggleAutoApprove(next: boolean) {
    await patchJSON(`/admin/api/districts/${id}`, { autoApprovePlaces: next });
    toast.success(next ? "Auto-approve places enabled" : "Auto-approve places disabled");
    refetch();
  }

  async function handleHeroFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const invalid = validateImageFile(file);
    if (invalid) {
      toast.error("Invalid image file", { description: invalid });
      return;
    }

    setUploadingHero(true);
    try {
      const { url } = await uploadImage(file, `branding/districts/${district?.name || id}`);
      setCustomHeroUrl(url);
      setUseCustomHero(true);
      setIsHeroDirty(true);
      toast.success("Custom district hero image uploaded", {
        description: "Click 'Save Hero Settings' to apply this override.",
      });
    } catch (err) {
      toast.error("Upload failed", { description: describeUploadError(err) });
    } finally {
      setUploadingHero(false);
    }
  }

  function handleResetToDefault() {
    setUseCustomHero(false);
    setIsHeroDirty(true);
    toast.info("Switched to global default district hero image", {
      description: "Click 'Save Hero Settings' to commit this change.",
    });
  }

  async function handleSaveHeroSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingHero(true);
    try {
      await patchJSON(`/admin/api/districts/${id}`, {
        useCustomHeroImage: useCustomHero,
        heroImageUrl: customHeroUrl,
        showWelcomeHeading: headingOverride,
      });
      toast.success("District hero settings updated successfully");
      setIsHeroDirty(false);
      refetch();
    } catch (err) {
      toast.error("Failed to update district hero settings", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSavingHero(false);
    }
  }

  const effectiveHeroImage =
    useCustomHero && customHeroUrl
      ? customHeroUrl
      : district?.globalDefaultHeroImage ||
        "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1920&q=80";

  const isUsingCustom = useCustomHero && Boolean(customHeroUrl);

  const effectiveHeadingVisible =
    headingOverride === "show"
      ? true
      : headingOverride === "hide"
        ? false
        : district?.globalShowHeading ?? true;

  return (
    <div>
      <PageHeader
        title={district?.name ?? "District"}
        subtitle={district ? `Part of ${district.state?.name ?? "—"}` : "Loading…"}
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/districts">
            <ArrowLeft className="size-4" /> All districts
          </Link>
        </Button>
        {district ? (
          <Button asChild size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800">
            <Link href={`/places?districtId=${encodeURIComponent(district.id)}`}>
              <Plus className="size-4" /> Add place
            </Link>
          </Button>
        ) : null}
      </PageHeader>

      {loading ? (
        <LoadingState />
      ) : error || !district ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="mono-card p-4">
              <p className="text-2xl font-bold">{district._count.places}</p>
              <p className="text-xs text-muted-foreground">Places</p>
            </div>
            <div className="mono-card p-4">
              <p className="text-2xl font-bold">{district._count.hotels}</p>
              <p className="text-xs text-muted-foreground">Hotels</p>
            </div>
            <div className="mono-card p-4">
              <p className="text-2xl font-bold">{district._count.restaurent}</p>
              <p className="text-xs text-muted-foreground">Restaurants</p>
            </div>
            <div className="mono-card flex flex-col justify-center gap-1 p-4">
              <StatusBadge status={district.isServiceAvailable ? "Available" : "Offline"} />
              <p className="text-xs text-muted-foreground">Service status</p>
            </div>
          </div>

          {/* District Hero Image & Welcome Heading Card */}
          <form
            onSubmit={handleSaveHeroSettings}
            className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    District Hero &amp; Landing Image
                  </span>
                  {isUsingCustom ? (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Custom District Override Active
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                      Using Global Default District Image
                    </span>
                  )}
                </div>
                <h3 className="text-base font-semibold text-foreground mt-0.5">
                  Hero Banner for {district.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Controls the background photograph and welcome heading on the public landing page for this district.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="submit"
                  disabled={savingHero || !isHeroDirty}
                  size="sm"
                >
                  {savingHero ? "Saving…" : isHeroDirty ? "Save Hero Settings*" : "Settings Saved"}
                </Button>
              </div>
            </div>

            {/* Effective Hero Banner Live Preview */}
            <div className="space-y-3">
              <div className="relative aspect-[21/9] sm:aspect-[16/7] w-full overflow-hidden rounded-xl border border-border bg-zinc-900 shadow-inner group">
                <img
                  src={effectiveHeroImage}
                  alt={`Hero preview for ${district.name}`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-101"
                />

                {/* Dark Contrast Readability Overlay (Matching frontend/district-hero.tsx) */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/30 flex flex-col justify-end p-5 sm:p-6 text-white">
                  <div className="space-y-1">
                    <span className="inline-block rounded-md bg-white/20 backdrop-blur-md px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
                      {district.state?.name || "Karnataka"} · District Destination
                    </span>
                    {effectiveHeadingVisible ? (
                      <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight drop-shadow-md">
                        Welcome to {district.name}
                      </h1>
                    ) : (
                      <div className="rounded-md border border-dashed border-white/40 bg-black/40 px-3 py-1.5 inline-block text-xs font-mono text-zinc-300">
                        [Welcome heading hidden by configuration]
                      </div>
                    )}
                    <p className="text-xs text-zinc-300 max-w-lg line-clamp-1">
                      Explore places, verified tour guides, hotel stays and local restaurants in {district.name}.
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-white/15 pt-2 text-[11px] text-zinc-400">
                    <span>
                      Effective Image Source:{" "}
                      <strong className="text-white">
                        {isUsingCustom ? "Custom District Override" : "Global Default District Image"}
                      </strong>
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400 truncate max-w-[280px]">
                      {effectiveHeroImage}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Controls: Override Toggle, Upload, Heading Override */}
            <div className="grid gap-5 md:grid-cols-2 pt-1">
              {/* Left Column: Image Override Controls */}
              <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-3">
                    <Label className="text-xs font-semibold text-foreground">
                      Use custom hero image for this district
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Enable to override the global default with a photo unique to {district.name}.
                    </p>
                  </div>
                  <Switch
                    checked={useCustomHero}
                    onCheckedChange={(checked) => {
                      setUseCustomHero(checked);
                      setIsHeroDirty(true);
                    }}
                    aria-label="Use custom hero image"
                  />
                </div>

                <div className="border-t border-border pt-3 space-y-2.5">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleHeroFileUpload}
                    disabled={uploadingHero}
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingHero}
                      className="gap-1.5 text-xs"
                    >
                      <Upload className="size-3.5" />
                      <span>{uploadingHero ? "Uploading…" : customHeroUrl ? "Replace Custom Image" : "Upload Custom District Image"}</span>
                    </Button>

                    {customHeroUrl ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleResetToDefault}
                        className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                      >
                        <RotateCcw className="size-3.5" />
                        <span>Use Global Default</span>
                      </Button>
                    ) : null}
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Recommended: <strong>1920 × 1080 px</strong> (16:9 widescreen) · WEBP, JPG or PNG · up to 5 MB.
                  </p>
                </div>
              </div>

              {/* Right Column: Welcome Heading Controls */}
              <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-foreground">
                    District Welcome Heading Display
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Controls the &quot;Welcome to {district.name}&quot; headline overlay on the public district page.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Select
                    value={headingOverride}
                    onValueChange={(val) => {
                      setHeadingOverride(val);
                      setIsHeroDirty(true);
                    }}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="Select heading visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inherit">
                        Inherit global setting ({district.globalShowHeading ?? true ? "Currently Show" : "Currently Hide"})
                      </SelectItem>
                      <SelectItem value="show">
                        Show heading (&quot;Welcome to {district.name}&quot;)
                      </SelectItem>
                      <SelectItem value="hide">
                        Hide heading (Keeps hero image visible, hides text)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg bg-muted/40 border border-border p-2.5 text-[11px] text-muted-foreground space-y-1">
                  <p className="font-semibold text-foreground flex items-center gap-1">
                    <CheckCircle2 className="size-3 text-primary" />
                    <span>Heading Behavior Guarantee</span>
                  </p>
                  <p>
                    Hiding the heading does not disable the district hero, and preserves all navigation, search tabs, and SEO tags.
                  </p>
                </div>
              </div>
            </div>
          </form>

          {/* Operational Settings */}
          <div className="mono-card space-y-4 p-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              District Operational Settings
            </h4>
            <ToggleField
              label="Service available"
              description="Runs only when the parent state and country are also enabled."
              checked={district.isServiceAvailable}
              onChange={toggleService}
            />
            <div className="my-3 border-t border-border" />
            <ToggleField
              label="Auto-approve places"
              description="New places submitted for this district are approved automatically."
              checked={district.autoApprovePlaces ?? false}
              onChange={toggleAutoApprove}
            />
          </div>

          {district.state ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{district.state.name}</Badge>
              <span className="text-xs">
                Country · {district.state.country?.name ?? "—"} ·
                {district.state.isServiceAvailable ? " State available" : " State offline"}
              </span>
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}