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
import type { DistrictAdmin, StateAdmin } from "@/lib/types";

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
  const [name, setName] = React.useState("");
  const [stateId, setStateId] = React.useState("");
  const [available, setAvailable] = React.useState(false);
  const [autoApprove, setAutoApprove] = React.useState(false);

  const {
    data: statesData,
    loading: statesLoading,
  } = useAdminData<{ states: StateAdmin[] }>("/admin/api/states", { enabled: open });

  const states = statesData?.states ?? [];

  async function handleCreate() {
    if (!name.trim() || !stateId) {
      toast.error("Enter a name and select a state");
      return;
    }
    setSaving(true);
    try {
      await postJSON("/admin/api/districts", {
        name: name.trim(),
        stateId,
        isServiceAvailable: available,
        autoApprovePlaces: autoApprove,
      });
      toast.success("District created");
      setName("");
      setStateId("");
      setAvailable(false);
      setAutoApprove(false);
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error("Failed to create district", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Add District</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add district</DialogTitle>
          <DialogDescription>Create a new district under a state.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="district-name">District name</Label>
            <Input
              id="district-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bengaluru Urban"
            />
          </div>

          <div className="space-y-1.5">
            <Label>State</Label>
            {statesLoading ? (
              <p className="text-sm text-muted-foreground">Loading states…</p>
            ) : states.length > 0 ? (
              <Select value={stateId} onValueChange={setStateId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a state" />
                </SelectTrigger>
                <SelectContent>
                  {states.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-sm text-muted-foreground">
                No states yet. Create a state on the States page first.
              </p>
            )}
          </div>

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
            onClick={handleCreate}
            disabled={saving || !name.trim() || !stateId}
          >
            {saving ? "Creating…" : "Create district"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}