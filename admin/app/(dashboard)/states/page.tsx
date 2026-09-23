"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/admin/data-table";
import { DeleteButton } from "@/components/admin/delete-button";
import { PageHeader } from "@/components/admin/page-header";
import { SearchInput } from "@/components/admin/search-input";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import type { Country, StateAdmin } from "@/lib/types";

export default function StatesPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const { data, loading, error, refetch } = useAdminData<{ states: StateAdmin[] }>(
    "/admin/api/states",
    { query: search ? { search } : undefined }
  );

  const columns: Column<StateAdmin>[] = [
    { key: "name", header: "State", cell: (s) => <span className="font-medium">{s.name}</span> },
    {
      key: "country",
      header: "Country",
      cell: (s) => <span className="text-muted-foreground">{s.country?.name ?? "—"}</span>,
    },
    {
      key: "districts",
      header: "Districts",
      cell: (s) => (
        <span className="font-mono text-sm text-muted-foreground">{s._count.districts}</span>
      ),
      className: "text-center",
    },
    {
      key: "service",
      header: "Service",
      cell: (s) =>
        s.isServiceAvailable ? (
          <Badge className="bg-zinc-900 text-white">Available</Badge>
        ) : (
          <Badge variant="outline">Offline</Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      cell: (s) => <DeleteButton url={`/admin/api/states/${s.id}`} onDeleted={refetch} />,
      className: "text-right",
    },
  ];

  return (
    <div>
      <PageHeader title="States" subtitle="Manage states and their service availability.">
        <SearchInput value={search} onChange={setSearch} placeholder="Search states…" className="w-56" />
        <CreateStateDialog onCreated={refetch} />
      </PageHeader>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <DataTable
          columns={columns}
          rows={data?.states ?? []}
          onRowClick={(s) => router.push(`/states/${s.id}`)}
        />
      )}
    </div>
  );
}

function CreateStateDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [countryId, setCountryId] = React.useState("");
  const [stateId, setStateId] = React.useState("");
  const [available, setAvailable] = React.useState(false);

  const {
    data: countriesData,
    loading: countriesLoading,
  } = useAdminData<{ countries: Country[] }>("/admin/api/countries", { enabled: open });

  const {
    data: statesData,
    loading: statesLoading,
  } = useAdminData<{ states: StateAdmin[] }>("/admin/api/states", { enabled: open });

  const countries = React.useMemo(() => countriesData?.countries ?? [], [countriesData]);
  const states = React.useMemo(() => statesData?.states ?? [], [statesData]);

  const countryStates = React.useMemo(
    () => (countryId ? states.filter((s) => s.countryId === countryId) : []),
    [states, countryId]
  );

  const selectedState = React.useMemo(
    () => (stateId ? states.find((s) => s.id === stateId) ?? null : null),
    [states, stateId]
  );

  function reset() {
    setCountryId("");
    setStateId("");
    setAvailable(false);
  }

  function handleCountryChange(value: string) {
    setCountryId(value);
    setStateId("");
  }

  async function handleSubmit() {
    if (!countryId || !stateId || !selectedState) {
      toast.error("Select a country and a state");
      return;
    }
    setSaving(true);
    try {
      await patchJSON(`/admin/api/states/${selectedState.id}`, {
        isServiceAvailable: available,
      });
      toast.success("State settings updated");
      reset();
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error("Failed to save state", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => {
      setOpen(next);
      if (!next) reset();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Add State</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add state</DialogTitle>
          <DialogDescription>
            Select a country and one of its existing states. State names are locked to canonical database records.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="state-country">Country</Label>
            {countriesLoading ? (
              <p className="text-sm text-muted-foreground">Loading countries…</p>
            ) : countries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No countries available.</p>
            ) : (
              <Select value={countryId} onValueChange={handleCountryChange}>
                <SelectTrigger className="w-full" id="state-country">
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="state-state">State</Label>
            {!countryId ? (
              <p className="text-sm text-muted-foreground">Select a country first.</p>
            ) : statesLoading ? (
              <p className="text-sm text-muted-foreground">Loading states…</p>
            ) : countryStates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No states available for this country.
              </p>
            ) : (
              <Select value={stateId} onValueChange={setStateId}>
                <SelectTrigger className="w-full" id="state-state">
                  <SelectValue placeholder="Select a state" />
                </SelectTrigger>
                <SelectContent>
                  {countryStates.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedState ? (
            <p className="text-xs text-muted-foreground">
              &ldquo;{selectedState.name}&rdquo; already exists in the database. Saving updates the
              existing record — no duplicate state is created.
            </p>
          ) : null}

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Service available</p>
              <p className="text-xs text-muted-foreground">Defaults to offline until enabled.</p>
            </div>
            <Switch checked={available} onCheckedChange={setAvailable} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !countryId || !stateId}>
            {saving ? "Saving…" : "Save state"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}