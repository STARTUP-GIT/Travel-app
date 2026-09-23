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
import type { StateAdmin } from "@/lib/types";

type StatusFilter = "all" | "active" | "offline";

export default function StatesPage() {
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [savingIds, setSavingIds] = React.useState<Set<string>>(new Set());
  const [patches, setPatches] = React.useState<Record<string, boolean>>({});

  const { data, loading, error, refetch } = useAdminData<{ states: StateAdmin[] }>(
    "/admin/api/states"
  );

  const displayStates = React.useMemo(
    () =>
      (data?.states ?? []).map((s) =>
        patches[s.id] !== undefined ? { ...s, isServiceAvailable: patches[s.id] } : s
      ),
    [data, patches]
  );

  const filteredStates = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return displayStates.filter((s) => {
      const matchesSearch = !q || s.name.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "active"
            ? s.isServiceAvailable
            : !s.isServiceAvailable;
      return matchesSearch && matchesStatus;
    });
  }, [displayStates, search, statusFilter]);

  async function toggle(id: string, next: boolean) {
    setSavingIds((prev) => new Set(prev).add(id));
    setPatches((prev) => ({ ...prev, [id]: next }));
    try {
      await patchJSON(`/admin/api/states/${id}`, { isServiceAvailable: next });
      toast.success(next ? "State service enabled" : "State service disabled");
    } catch (err) {
      setPatches((prev) => {
        const nextPatches = { ...prev };
        delete nextPatches[id];
        return nextPatches;
      });
      toast.error("Failed to update state", {
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
        title="States"
        subtitle="Manage service availability for all supported states."
      />

      <div className="mb-6 grid gap-2 sm:flex sm:flex-wrap sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search states…"
          className="w-full sm:w-72"
        />
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as StatusFilter)}
        >
          <SelectTrigger className="w-full sm:w-44" aria-label="Filter by service status">
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
          title="Unable to load states"
          description={error}
          action={<GeoRetryButton onRetry={refetch} />}
        />
      ) : filteredStates.length === 0 ? (
        <GeoMessageCard
          icon={Inbox}
          title="No states found"
          description="There are no states matching your current filters."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredStates.map((state) => (
            <StateCard
              key={state.id}
              state={state}
              saving={savingIds.has(state.id)}
              onToggle={(next) => toggle(state.id, next)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StateCard({
  state,
  saving,
  onToggle,
}: {
  state: StateAdmin;
  saving: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <Card className="flex h-full flex-col gap-0 transition-colors hover:border-white/25">
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0 p-5 pb-0">
        <div className="min-w-0 space-y-1">
          <CardTitle className="truncate" title={state.name}>
            {state.name}
          </CardTitle>
          <CardDescription className="truncate" title={state.country?.name}>
            {state.country?.name ?? "—"}
          </CardDescription>
        </div>
        <ServiceStatusBadge active={state.isServiceAvailable} />
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
              checked={state.isServiceAvailable}
              disabled={saving}
              onCheckedChange={onToggle}
              aria-label={`Service availability for ${state.name}`}
            />
          </div>
        </div>
      </CardContent>
      <Separator />
      <CardFooter className="flex flex-wrap items-center gap-x-3 gap-y-1 p-5 pt-4">
        <span className="text-xs text-muted-foreground">
          {state._count.districts} district{state._count.districts === 1 ? "" : "s"}
        </span>
        <CardDot />
        <code className="min-w-0 truncate font-mono text-xs text-muted-foreground" title={state.id}>
          {state.id}
        </code>
      </CardFooter>
    </Card>
  );
}