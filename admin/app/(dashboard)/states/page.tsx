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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { postJSON } from "@/lib/api/mutate";
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
  const [name, setName] = React.useState("");
  const [countryId, setCountryId] = React.useState("");
  const [available, setAvailable] = React.useState(false);
  const [newCountry, setNewCountry] = React.useState("");
  const [creatingCountry, setCreatingCountry] = React.useState(false);

  const {
    data: countriesData,
    loading: countriesLoading,
    refetch: refetchCountries,
  } = useAdminData<{ countries: Country[] }>("/admin/api/countries", { enabled: open });

  const countries = countriesData?.countries ?? [];

  async function handleCreateCountry() {
    if (!newCountry.trim()) return;
    setCreatingCountry(true);
    try {
      const res = (await postJSON("/admin/api/countries", { name: newCountry.trim() })) as {
        country: Country;
      };
      toast.success("Country created");
      setNewCountry("");
      setCountryId(res.country.id);
      refetchCountries();
    } catch (err) {
      toast.error("Failed to create country", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setCreatingCountry(false);
    }
  }

  async function handleCreate() {
    if (!name.trim() || !countryId) {
      toast.error("Enter a name and select a country");
      return;
    }
    setSaving(true);
    try {
      await postJSON("/admin/api/states", {
        name: name.trim(),
        countryId,
        isServiceAvailable: available,
      });
      toast.success("State created");
      setName("");
      setCountryId("");
      setAvailable(false);
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error("Failed to create state", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Add State</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add state</DialogTitle>
          <DialogDescription>Create a new state under a country.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="state-name">State name</Label>
            <Input
              id="state-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Karnataka"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Country</Label>
            {countriesLoading ? (
              <p className="text-sm text-muted-foreground">Loading countries…</p>
            ) : countries.length > 0 ? (
              <Select value={countryId} onValueChange={setCountryId}>
                <SelectTrigger className="w-full">
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
            ) : (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">
                  No countries yet. Create the country first.
                </p>
                <div className="flex gap-2">
                  <Input
                    value={newCountry}
                    onChange={(e) => setNewCountry(e.target.value)}
                    placeholder="Country name"
                  />
                  <Button
                    variant="outline"
                    size="default"
                    disabled={creatingCountry || !newCountry.trim()}
                    onClick={handleCreateCountry}
                  >
                    {creatingCountry ? "Creating…" : "Create"}
                  </Button>
                </div>
              </div>
            )}
          </div>

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
          <Button
            onClick={handleCreate}
            disabled={saving || !name.trim() || !countryId}
          >
            {saving ? "Creating…" : "Create state"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}