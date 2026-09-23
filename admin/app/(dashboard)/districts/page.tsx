"use client";

import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
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
import type { Country, DistrictAdmin, StateAdmin } from "@/lib/types";

type StatusFilter = "all" | "active" | "offline";

export default function DistrictsPage() {
  const [search, setSearch] = React.useState("");
  const [stateFilter, setStateFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [savingIds, setSavingIds] = React.useState<Set<string>>(new Set());
  const [patches, setPatches] = React.useState<Record<string, boolean>>({});

  const { data: countriesData } = useAdminData<{ countries: Country[] }>("/admin/api/countries");
  const { data: statesData } = useAdminData<{ states: StateAdmin[] }>("/admin/api/states");
  const { data, loading, error, refetch } = useAdminData<{ districts: DistrictAdmin[] }>(
    "/admin/api/districts"
  );

  const countries = React.useMemo(() => countriesData?.countries ?? [], [countriesData]);
  const states = React.useMemo(() => statesData?.states ?? [], [statesData]);

  const india = countries.find((c) => c.name.toLowerCase() === "india");
  const countryValue = india ? india.id : "india";

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
        subtitle="Manage service availability for all supported districts."
      />

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
        <Select value={stateFilter} onValueChange={setStateFilter}>
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
            {district.name}
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
      <CardFooter className="flex flex-wrap items-center gap-x-3 gap-y-1 p-5 pt-4">
        <span className="text-xs text-muted-foreground">
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
      </CardFooter>
    </Card>
  );
}