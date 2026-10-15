"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Image as ImageIcon,
  Inbox,
  Loader2,
  RotateCcw,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import {
  CardDot,
  GeoCardSkeletonGrid,
  GeoMessageCard,
  GeoRetryButton,
  ServiceStatusBadge,
} from "@/components/admin/geo-card";
import { PageHeader } from "@/components/admin/page-header";
import { SearchInput } from "@/components/admin/search-input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { patchJSON } from "@/lib/api/mutate";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { describeUploadError, uploadImage, validateImageFile } from "@/lib/api/upload";
import type { Country, DistrictAdmin, StateAdmin } from "@/lib/types";

type StatusFilter = "all" | "active" | "offline";

export default function DistrictsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState("");
  const [stateFilter, setStateFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [savingIds, setSavingIds] = React.useState<Set<string>>(new Set());
  const [patches, setPatches] = React.useState<Record<string, boolean>>({});

  const routeStateId = searchParams.get("stateId") ?? "";

  const { data: countriesData } = useAdminData<{ countries: Country[] }>('/admin/api/countries');
  const { data: statesData } = useAdminData<{ states: StateAdmin[] }>('/admin/api/states');
  const { data, loading, error, refetch } = useAdminData<{ districts: DistrictAdmin[] }>(
    "/admin/api/districts",
    { query: routeStateId ? { stateId: routeStateId } : undefined }
  );

  const countries = React.useMemo(() => countriesData?.countries ?? [], [countriesData]);
  const states = React.useMemo(() => statesData?.states ?? [], [statesData]);

  React.useEffect(() => {
    if (routeStateId) {
      setStateFilter(routeStateId);
      setStatusFilter("all");
      return;
    }

    const karnataka = states.find((state) => state.name.toLowerCase() === "karnataka");
    if (karnataka) {
      setStateFilter(karnataka.id);
      router.replace(`/districts?stateId=${encodeURIComponent(karnataka.id)}`);
      setStatusFilter("all");
      return;
    }

    setStateFilter("all");
  }, [routeStateId, states, router]);

  const india = countries.find((c) => c.name.toLowerCase() === "india");
  const countryValue = india ? india.id : "india";
  const activeState = React.useMemo(
    () => states.find((state) => state.id === stateFilter) ?? null,
    [states, stateFilter]
  );
  const countryLabel = activeState?.country?.name ?? india?.name ?? "India";

  const displayDistricts = React.useMemo(
    () =>
      (data?.districts ?? []).map((d) =>
        patches[d.id] !== undefined ? { ...d, isServiceAvailable: patches[d.id] } : d
      ),
    [data, patches]
  );

  const filteredDistricts = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return displayDistricts.filter((d) => {
      const matchesSearch = !q || d.name.toLowerCase().includes(q);
      const matchesState = stateFilter === "all" ? true : d.stateId === stateFilter;
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? d.isServiceAvailable
            : !d.isServiceAvailable;
      return matchesSearch && matchesState && matchesStatus;
    });
  }, [displayDistricts, search, stateFilter, statusFilter]);

  async function toggle(id: string, next: boolean) {
    setSavingIds((prev) => new Set(prev).add(id));
    setPatches((prev) => ({ ...prev, [id]: next }));
    try {
      await patchJSON(`/admin/api/districts/${id}`, { isServiceAvailable: next });
      toast.success(next ? "District service enabled" : "District service disabled");
    } catch (err) {
      setPatches((prev) => {
        const nextPatches = { ...prev };
        delete nextPatches[id];
        return nextPatches;
      });
      toast.error("Failed to update district", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSavingIds((prev) => {
        const nextIds = new Set(prev);
        nextIds.delete(id);
        return nextIds;
      });
    }
  }

  return (
    <div>
      <PageHeader
        title="Districts"
        subtitle={routeStateId ? `Districts in ${activeState?.name ?? "selected state"}` : "Manage service availability and landing hero images for all supported districts."}
      />

      <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <button type="button" className="hover:text-foreground" onClick={() => router.push("/states")}>
          Locations
        </button>
        <ChevronRight className="size-3.5" />
        <button type="button" className="hover:text-foreground" onClick={() => router.push("/states")}>
          States
        </button>
        {activeState ? (
          <>
            <ChevronRight className="size-3.5" />
            <button type="button" className="hover:text-foreground" onClick={() => router.push(`/districts?stateId=${activeState.id}`)}>
              {activeState.name}
            </button>
            <ChevronRight className="size-3.5" />
            <span className="text-foreground">Districts</span>
          </>
        ) : (
          <>
            <ChevronRight className="size-3.5" />
            <span className="text-foreground">Districts</span>
          </>
        )}
      </nav>

      {/* Global District Hero Defaults Configuration Card */}
      <GlobalDistrictHeroDefaultsCard />

      <div className="mb-6 grid gap-2 md:flex md:flex-wrap md:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search districts…"
          className="w-full md:w-56"
        />
        <Select disabled value={countryValue}>
          <SelectTrigger className="w-full md:w-44" aria-label="Country">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={countryValue}>{india?.name ?? "India"}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={stateFilter}
          onValueChange={(next) => {
            setStateFilter(next);
            if (next === "all") {
              router.replace("/districts");
              return;
            }
            router.replace(`/districts?stateId=${encodeURIComponent(next)}`);
          }}
        >
          <SelectTrigger className="w-full md:w-44" aria-label="Filter by state">
            <SelectValue placeholder="All States" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            {states.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <SelectTrigger className="w-full md:w-40" aria-label="Filter by service status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <GeoCardSkeletonGrid />
      ) : error ? (
        <GeoMessageCard
          tone="danger"
          icon={AlertTriangle}
          title="Unable to load districts"
          description={error}
          action={<GeoRetryButton onRetry={refetch} />}
        />
      ) : filteredDistricts.length === 0 ? (
        <GeoMessageCard
          icon={Inbox}
          title="No districts found"
          description="There are no districts matching your current filters."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredDistricts.map((district) => (
            <DistrictCard
              key={district.id}
              district={district}
              saving={savingIds.has(district.id)}
              onToggle={(next) => toggle(district.id, next)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function GlobalDistrictHeroDefaultsCard() {
  const { data, refetch } = useAdminData<{
    settings: {
      defaultDistrictHeroImageUrl: string;
      showDistrictHeadingByDefault: boolean;
    };
  }>("/admin/api/districts/settings");

  const [imageUrl, setImageUrl] = React.useState<string>("");
  const [showHeading, setShowHeading] = React.useState<boolean>(true);
  const [uploading, setUploading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [isDirty, setIsDirty] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (data?.settings) {
      setImageUrl(data.settings.defaultDistrictHeroImageUrl || "");
      setShowHeading(data.settings.showDistrictHeadingByDefault ?? true);
      setIsDirty(false);
    }
  }, [data]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const invalid = validateImageFile(file);
    if (invalid) {
      toast.error("Invalid image", { description: invalid });
      return;
    }

    setUploading(true);
    try {
      const { url } = await uploadImage(file, "branding/districts/defaults");
      setImageUrl(url);
      setIsDirty(true);
      toast.success("Default district hero image uploaded", {
        description: "Click 'Save District Defaults' to apply it globally.",
      });
    } catch (err) {
      toast.error("Upload failed", { description: describeUploadError(err) });
    } finally {
      setUploading(false);
    }
  };

  const handleResetToDefault = () => {
    setImageUrl("");
    setIsDirty(true);
    toast.info("Reset to system fallback district atmosphere", {
      description: "Click 'Save District Defaults' to apply.",
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await patchJSON("/admin/api/districts/settings", {
        defaultDistrictHeroImageUrl: imageUrl,
        showDistrictHeadingByDefault: showHeading,
      });
      toast.success("Global district defaults saved successfully");
      setIsDirty(false);
      refetch();
    } catch (err) {
      toast.error("Failed to save district defaults", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-6 rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">
              Global District Configuration
            </span>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Shared Defaults
            </span>
          </div>
          <h3 className="text-base font-semibold text-foreground mt-0.5">
            Default District Hero Image & Heading
          </h3>
          <p className="text-xs text-muted-foreground">
            Applies to all district landing pages that do not have an individual custom hero override.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving || !isDirty}
          >
            {saving ? "Saving…" : isDirty ? "Save District Defaults*" : "Defaults Saved"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-center">
        {/* Preview Container */}
        <div className="lg:col-span-1">
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-border bg-zinc-900 group">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Global District Default Hero"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-102"
              />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950">
                <ImageIcon className="size-8 text-zinc-600 mb-1.5" />
                <p className="text-xs font-medium text-zinc-300">
                  Using Built-In Scenic Fallback
                </p>
                <p className="text-[10px] text-zinc-500">
                  Upload a photo to establish an official brand default.
                </p>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2.5">
              <p className="text-[11px] font-medium text-white truncate">
                {showHeading ? "Welcome to [District Name]" : "Heading Disabled by Default"}
              </p>
            </div>
          </div>
        </div>

        {/* Controls & Specs */}
        <div className="lg:col-span-2 space-y-3.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileUpload}
              disabled={uploading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="gap-1.5 text-xs"
            >
              <Upload className="size-3.5" />
              <span>{uploading ? "Uploading…" : imageUrl ? "Replace Default Image" : "Upload Default District Image"}</span>
            </Button>
            {imageUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetToDefault}
                className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
              >
                <RotateCcw className="size-3.5" />
                <span>Reset to System Fallback</span>
              </Button>
            ) : null}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
            <div className="space-y-0.5 pr-4">
              <p className="text-xs font-medium text-foreground">
                Show &quot;Welcome to [District Name]&quot; heading by default
              </p>
              <p className="text-[11px] text-muted-foreground">
                When enabled, displays the district welcome heading over the hero banner. When disabled, hides the heading while leaving the hero image intact.
              </p>
            </div>
            <Switch
              checked={showHeading}
              onCheckedChange={(checked) => {
                setShowHeading(checked);
                setIsDirty(true);
              }}
              aria-label="Toggle global district welcome heading"
            />
          </div>

          <div className="rounded-lg bg-muted/40 border border-border p-2.5 text-[11px] text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-primary" />
            <span>
              Recommended: <strong>1920 × 1080 px</strong> (16:9 widescreen) · WEBP, JPG or PNG · up to 5 MB. Individual districts can override this image and heading setting.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DistrictCard({
  district,
  saving,
  onToggle,
}: {
  district: DistrictAdmin;
  saving: boolean;
  onToggle: (next: boolean) => void;
}) {
  const state = district.state;
  const country = state?.country;

  return (
    <Card className="flex h-full flex-col gap-0 transition-colors hover:border-white/25">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 p-5 pb-0">
        <div className="min-w-0 space-y-1">
          <CardTitle className="truncate" title={district.name}>
            <Link
              href={`/districts/${district.id}`}
              className="hover:text-primary hover:underline inline-flex items-center gap-1.5"
            >
              <span>{district.name}</span>
              <ExternalLink className="size-3.5 text-muted-foreground shrink-0" />
            </Link>
          </CardTitle>
          <CardDescription
            className="truncate"
            title={`${state?.name ?? "—"}${country ? ` · ${country.name}` : ""}`}
          >
            {state?.name ?? "—"}
            {country ? ` · ${country.name}` : ""}
          </CardDescription>
        </div>
        <ServiceStatusBadge active={district.isServiceAvailable} />
      </CardHeader>
      <Separator className="mt-4" />
      <CardContent className="flex flex-1 items-center p-5">
        <div className="flex w-full items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">Service availability</p>
            <p className="text-xs text-muted-foreground">Offline until enabled.</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {saving ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
            <Switch
              checked={district.isServiceAvailable}
              disabled={saving}
              onCheckedChange={onToggle}
              aria-label={`Service availability for ${district.name}`}
            />
          </div>
        </div>
      </CardContent>
      <Separator />
      <CardFooter className="flex flex-col items-start gap-2 p-5 pt-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 w-full text-xs text-muted-foreground">
          <span>
            {district._count.places} places · {district._count.hotels} hotels ·{" "}
            {district._count.restaurent} restaurants
          </span>
          <CardDot />
          <code
            className="min-w-0 truncate font-mono text-xs text-muted-foreground"
            title={district.id}
          >
            {district.id}
          </code>
        </div>
        <Button asChild variant="outline" size="sm" className="w-full mt-1 h-7 text-xs gap-1.5">
          <Link href={`/districts/${district.id}`}>
            <ImageIcon className="size-3" />
            Manage District &amp; Hero Image
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}