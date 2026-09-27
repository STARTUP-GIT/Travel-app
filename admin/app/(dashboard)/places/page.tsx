"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { patchJSON, postJSON } from "@/lib/api/mutate";
import { DataTable, type Column } from "@/components/admin/data-table";
import { DeleteButton } from "@/components/admin/delete-button";
import { ImageThumb } from "@/components/admin/image-thumb";
import { PageHeader } from "@/components/admin/page-header";
import { SearchInput } from "@/components/admin/search-input";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { StatusBadge } from "@/components/admin/status-badge";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { cn, formatCurrency } from "@/lib/utils";

function Field({
  label,
  children,
  tooltip,
  className,
}: {
  label: string;
  children: React.ReactNode;
  tooltip?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1">
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        {tooltip ? (
          <span className="text-[10px] text-muted-foreground/60">({tooltip})</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

import type { ContentApprovalStatus, PlaceAdmin } from "@/lib/types";

export default function PlacesPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<"ALL" | ContentApprovalStatus>("ALL");
  const { data, loading, error, refetch } = useAdminData<{ places: PlaceAdmin[] }>(
    "/admin/api/places",
    { query: { search: search || undefined, status } }
  );

  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [entryfee, setEntryfee] = React.useState("");
  const [latitude, setLatitude] = React.useState("");
  const [longitude, setLongitude] = React.useState("");
  const [images, setImages] = React.useState("");
  const [districtId, setDistrictId] = React.useState("");

  async function createPlace() {
    if (!name.trim() || !districtId.trim()) {
      toast.error("Name and district are required");
      return;
    }
    setCreating(true);
    try {
      const imageList = images
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      await postJSON("/admin/api/places", {
        name: name.trim(),
        description: description.trim(),
        districtId: districtId.trim(),
        images: imageList,
        entryfee: Number(entryfee),
        category: category.trim(),
        latitude: Number(latitude),
        longitude: Number(longitude),
      } as {
        name: string;
        description: string;
        districtId: string;
        images: string[];
        entryfee: number;
        category: string;
        latitude: number;
        longitude: number;
      });
      toast.success("Place created");
      setName("");
      setDescription("");
      setCategory("");
      setEntryfee("");
      setLatitude("");
      setLongitude("");
      setImages("");
      setDistrictId("");
      setCreating(false);
      refetch();
    } catch (err) {
      toast.error("Create failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setCreating(false);
    }
  }

  async function approve(p: PlaceAdmin) {
    try {
      await patchJSON(`/admin/api/places/${p.id}/status`, { status: "APPROVED" });
      toast.success("Place approved");
      refetch();
    } catch (err) {
      toast.error("Approval failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function reject(p: PlaceAdmin) {
    try {
      await patchJSON(`/admin/api/places/${p.id}/status`, { status: "REJECTED" });
      toast.success("Place rejected");
      refetch();
    } catch (err) {
      toast.error("Rejection failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  const columns: Column<PlaceAdmin>[] = [
    {
      key: "name",
      header: "Place",
      cell: (p) => (
        <div className="flex items-center gap-3">
          <ImageThumb src={p.images?.[0]} alt={p.name} className="size-10 rounded-lg object-cover" />
          <div className="min-w-0">
            <p className="truncate font-medium">{p.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {p.district?.name ?? "—"}
              {p.district?.state?.name ? ` · ${p.district.state.name}` : ""}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      cell: (p) => <span className="text-muted-foreground">{p.category || "—"}</span>,
    },
    {
      key: "entryfee",
      header: "Entry fee",
      cell: (p) => <span className="font-mono text-sm">{formatCurrency(p.entryfee)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (p) => (
        <div className="flex items-center gap-1">
          <StatusBadge status={p.status ?? "PENDING"} />
          {p.status !== "APPROVED" ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-1.5 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                approve(p);
              }}
            >
              Approve
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-1.5 text-xs text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation();
                reject(p);
              }}
            >
              Undo
            </Button>
          )}
        </div>
      ),
    },
    {
      key: "saved",
      header: "Saved",
      cell: (p) => (
        <span className="font-mono text-sm text-muted-foreground">{p._count?.user_fav_place ?? 0}</span>
      ),
      className: "text-center",
    },
    {
      key: "actions",
      header: "",
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={(e) => { e.stopPropagation(); void router.push(`/places/${p.id}`); }}
          >
            Edit
          </Button>
          <DeleteButton url={`/admin/api/places/${p.id}`} onDeleted={() => void refetch()} />
        </div>
      ),
      className: "text-right",
    },
  ];

  return (
    <div>
      <PageHeader title="Places" subtitle="All places across states and districts.">
        <div className="flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search places…" className="w-56" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "ALL" | ContentApprovalStatus)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="ALL">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800">
                <Plus className="size-4" /> New place
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create place</DialogTitle>
                <DialogDescription>
                  Places are created as approved and visible to visitors immediately.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createPlace();
                }}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name" className="sm:col-span-2">
                    <Input value={name} onChange={(e) => setName(e.target.value)} required />
                  </Field>
                  <Field label="District" tooltip="District ID">
                    <Input
                      value={districtId}
                      onChange={(e) => setDistrictId(e.target.value)}
                      placeholder="district id"
                      required
                    />
                  </Field>
                  <Field label="Category">
                    <Input value={category} onChange={(e) => setCategory(e.target.value)} />
                  </Field>
                  <Field label="Entry fee (₹)">
                    <Input
                      type="number"
                      step="any"
                      value={entryfee}
                      onChange={(e) => setEntryfee(e.target.value)}
                    />
                  </Field>
                  <Field label="Latitude">
                    <Input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) => setLatitude(e.target.value)}
                    />
                  </Field>
                  <Field label="Longitude">
                    <Input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) => setLongitude(e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Description">
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
                </Field>
                <Field label="Image URLs (one per line)">
                  <Textarea value={images} onChange={(e) => setImages(e.target.value)} rows={4} />
                </Field>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreating(false)}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-zinc-900 text-white hover:bg-zinc-800"
                    disabled={creating}
                  >
                    {creating ? "Creating…" : "Create place"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <DataTable
          columns={columns}
          rows={data?.places ?? []}
          onRowClick={(p) => router.push(`/places/${p.id}`)}
        />
      )}
    </div>
  );
}