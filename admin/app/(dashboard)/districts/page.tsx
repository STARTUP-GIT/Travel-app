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
import type { Country, DistrictAdmin, StateAdmin } from "@/lib/types";

export default function DistrictsPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const { data, loading, error, refetch } = useAdminData<{ districts: DistrictAdmin[] }>(
    "/admin/api/districts",
    { query: search ? { search } : undefined }
  );

  const columns: Column<DistrictAdmin>[] = [
    { key: "name", header: "District", cell: (d) => <span className="font-medium">{d.name}</span> },
    {
      key: "state",
      header: "State",
      cell: (d) => <span className="text-muted-foreground">{d.state?.name ?? "—"}</span>,
    },
    {
      key: "places",
      header: "Places",
      cell: (d) => <span className="font-mono text-sm text-muted-foreground">{d._count.places}</span>,
      className: "text-center",
    },
    {
      key: "hotels",
      header: "Hotels",
      cell: (d) => <span className="font-mono text-sm text-muted-foreground">{d._count.hotels}</span>,
      className: "text-center",
    },
    {
      key: "restaurants",
      header: "Restaurants",
      cell: (d) => (
        <span className="font-mono text-sm text-muted-foreground">{d._count.restaurent}</span>
      ),
      className: "text-center",
    },
    {
      key: "service",
      header: "Service",
      cell: (d) =>
        d.isServiceAvailable ? (
          <Badge className="bg-zinc-900 text-white">Available</Badge>
        ) : (
          <Badge variant="outline">Offline</Badge>
        ),
    },
    {
      key: "actions",
      header: "",
      cell: (d) => <DeleteButton url={`/admin/api/districts/${d.id}`} onDeleted={refetch} />,
      className: "text-right",
    },
  ];

  return (
    <div>
      <PageHeader title="Districts" subtitle="Manage districts and their settings.">
        <SearchInput value={search} onChange={setSearch} placeholder="Search districts…" className="w-56" />
        <CreateDistrictDialog onCreated={refetch} />
      </PageHeader>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <DataTable
          columns={columns}
          rows={data?.districts ?? []}
          onRowClick={(d) => router.push(`/districts/${d.id}`)}
        />
      )}
    </div>
  );
}

function CreateDistrictDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [countryId, setCountryId] = React.useState("");
  const [stateId, setStateId] = React.useState("");
  const [districtId, setDistrictId] = React.useState("");
  const [available, setAvailable] = React.useState(false);
  const [autoApprove, setAutoApprove] = React.useState(false);

  const {
    data: countriesData,
    loading: countriesLoading,
  } = useAdminData<{ countries: Country[] }>("/admin/api/countries", { enabled: open });

  const {
    data: statesData,
    loading: statesLoading,
  } = useAdminData<{ states: StateAdmin[] }>("/admin/api/states", { enabled: open });

  const {
    data: districtsData,
    loading: districtsLoading,
  } = useAdminData<{ districts: DistrictAdmin[] }>("/admin/api/districts", { enabled: open });

  const countries = React.useMemo(() => countriesData?.countries ?? [], [countriesData]);
  const states = React.useMemo(() => statesData?.states ?? [], [statesData]);
  const districts = React.useMemo(() => districtsData?.districts ?? [], [districtsData]);

  const countryStates = React.useMemo(
    () => (countryId ? states.filter((s) => s.countryId === countryId) : []),
    [states, countryId]
  );

  const stateDistricts = React.useMemo(
    () => (stateId ? districts.filter((d) => d.stateId === stateId) : []),
    [districts, stateId]
  );

  const selectedDistrict = React.useMemo(
    () => (districtId ? districts.find((d) => d.id === districtId) ?? null : null),
    [districts, districtId]
  );

  function reset() {
    setCountryId("");
    setStateId("");
    setDistrictId("");
    setAvailable(false);
    setAutoApprove(false);
  }

  function handleCountryChange(value: string) {
    setCountryId(value);
    setStateId("");
    setDistrictId("");
  }

  function handleStateChange(value: string) {
    setStateId(value);
    setDistrictId("");
  }

  async function handleSubmit() {
    if (!countryId || !stateId || !districtId || !selectedDistrict) {
      toast.error("Select a country, state and district");
      return;
    }
    setSaving(true);
    try {
      await patchJSON(`/admin/api/districts/${selectedDistrict.id}`, {
        isServiceAvailable: available,
        autoApprovePlaces: autoApprove,
      });
      toast.success("District settings updated");
      reset();
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error("Failed to save district", {
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
        <Button variant="outline" size="sm">Add District</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add district</DialogTitle>
          <DialogDescription>
            Select a country, state and one of its existing districts. District names are locked to canonical database records.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="district-country">Country</Label>
            {countriesLoading ? (
              <p className="text-sm text-muted-foreground">Loading countries…</p>
            ) : countries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No countries available.</p>
            ) : (
              <Select value={countryId} onValueChange={handleCountryChange}>
                <SelectTrigger className="w-full" id="district-country">
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
            <Label htmlFor="district-state">State</Label>
            {!countryId ? (
              <p className="text-sm text-muted-foreground">Select a country first.</p>
            ) : statesLoading ? (
              <p className="text-sm text-muted-foreground">Loading states…</p>
            ) : countryStates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No states available for this country.
              </p>
            ) : (
              <Select value={stateId} onValueChange={handleStateChange}>
                <SelectTrigger className="w-full" id="district-state">
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

          <div className="space-y-1.5">
            <Label htmlFor="district-district">District</Label>
            {!stateId ? (
              <p className="text-sm text-muted-foreground">Select a state first.</p>
            ) : districtsLoading ? (
              <p className="text-sm text-muted-foreground">Loading districts…</p>
            ) : stateDistricts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No districts available for this state.
              </p>
            ) : (
              <Select value={districtId} onValueChange={setDistrictId}>
                <SelectTrigger className="w-full" id="district-district">
                  <SelectValue placeholder="Select a district" />
                </SelectTrigger>
                <SelectContent>
                  {stateDistricts.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedDistrict ? (
            <p className="text-xs text-muted-foreground">
              &ldquo;{selectedDistrict.name}&rdquo; already exists in the database. Saving updates
              the existing record — no duplicate district is created.
            </p>
          ) : null}

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Service available</p>
              <p className="text-xs text-muted-foreground">Defaults to offline until enabled.</p>
            </div>
            <Switch checked={available} onCheckedChange={setAvailable} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Auto-approve places</p>
              <p className="text-xs text-muted-foreground">Approve place submissions automatically.</p>
            </div>
            <Switch checked={autoApprove} onCheckedChange={setAutoApprove} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !countryId || !stateId || !districtId}
          >
            {saving ? "Saving…" : "Save district"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}