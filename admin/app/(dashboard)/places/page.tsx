"use client";

import { Check, Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { patchJSON, postJSON } from "@/lib/api/mutate";
import { DataTable, type Column } from "@/components/admin/data-table";
import { DeleteButton } from "@/components/admin/delete-button";
import { ImageThumb } from "@/components/admin/image-thumb";
import { PageHeader } from "@/components/admin/page-header";
import { SearchInput } from "@/components/admin/search-input";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { StatusBadge } from "@/components/admin/status-badge";
import { PlacePhotosField, type PlacePhoto } from "@/components/admin/place-photos-field";
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
import type { DistrictAdmin, StateAdmin } from "@/lib/types";

export default function PlacesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeDistrictId = searchParams.get("districtId") ?? "";
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
  const [customCategory, setCustomCategory] = React.useState(false);
  const [entryfee, setEntryfee] = React.useState("");
  const [mapsUrl, setMapsUrl] = React.useState("");
  const [resolvedLocation, setResolvedLocation] = React.useState<{
    url: string;
    latitude: number;
    longitude: number;
  } | null>(null);
  const [resolvingLocation, setResolvingLocation] = React.useState(false);
  const [locationResolutionFailed, setLocationResolutionFailed] = React.useState(false);
  const [photos, setPhotos] = React.useState<PlacePhoto[]>([]);
  const [stateId, setStateId] = React.useState("");
  const [districtId, setDistrictId] = React.useState("");
  const { data: statesData } = useAdminData<{ states: StateAdmin[] }>("/admin/api/states");
  const { data: districtsData, loading: districtsLoading } = useAdminData<{ districts: DistrictAdmin[] }>(
    "/admin/api/districts",
    { query: stateId ? { stateId } : undefined, enabled: Boolean(stateId) }
  );
  const { data: contextDistrictData } = useAdminData<{ district: DistrictAdmin }>(
    `/admin/api/districts/${routeDistrictId}`,
    { enabled: Boolean(routeDistrictId) }
  );
  const states = statesData?.states ?? [];
  const availableDistricts = (districtsData?.districts ?? []).filter((district) => district.isServiceAvailable);
  const lockedDistrict = contextDistrictData?.district;
  const mapsCoordinates = resolvedLocation?.url === mapsUrl.trim() ? resolvedLocation : null;
  const categories = React.useMemo(
    () => Array.from(new Set((data?.places ?? []).map((place) => place.category.trim()).filter(Boolean))),
    [data]
  );

  React.useEffect(() => {
    if (!lockedDistrict) return;
    setStateId(lockedDistrict.stateId);
    setDistrictId(lockedDistrict.id);
  }, [lockedDistrict]);

  React.useEffect(() => {
    const url = mapsUrl.trim();
    setResolvedLocation(null);
    setLocationResolutionFailed(false);
    setResolvingLocation(false);
    if (!url) return;

    let active = true;
    const timeout = window.setTimeout(() => {
      setResolvingLocation(true);
      void postJSON("/admin/api/places/resolve-location", { url })
        .then((response) => {
          if (!active || typeof response !== "object" || response === null) return;
          const result = response as { latitude?: unknown; longitude?: unknown };
          if (
            typeof result.latitude !== "number" ||
            typeof result.longitude !== "number" ||
            !Number.isFinite(result.latitude) ||
            !Number.isFinite(result.longitude)
          ) {
            setLocationResolutionFailed(true);
            return;
          }
          setResolvedLocation({ url, latitude: result.latitude, longitude: result.longitude });
        })
        .catch(() => {
          if (active) setLocationResolutionFailed(true);
        })
        .finally(() => {
          if (active) setResolvingLocation(false);
        });
    }, 500);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [mapsUrl]);

  async function createPlace() {
    const selectedDistrictId = lockedDistrict?.id ?? districtId;
    const fee = Number(entryfee);
    if (!name.trim() || !selectedDistrictId) {
      toast.error("Name and district are required");
      return;
    }
    if (!category.trim()) {
      toast.error("Category is required");
      return;
    }
    if (entryfee === "" || !Number.isFinite(fee) || fee < 0) {
      toast.error("Entry fee must be zero or greater");
      return;
    }
    if (!mapsCoordinates) {
      toast.error("Enter a valid Google Maps location link");
      return;
    }
    if (photos.some((photo) => photo.uploading || photo.error || !photo.url)) {
      toast.error("Wait for all photos to upload successfully");
      return;
    }
    setCreating(true);
    try {
      await postJSON("/admin/api/places", {
        name: name.trim(),
        description: description.trim(),
        districtId: selectedDistrictId,
        images: photos.map((photo) => photo.url),
        entryfee: fee,
        category: category.trim(),
        latitude: mapsCoordinates.latitude,
        longitude: mapsCoordinates.longitude,
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
      setCustomCategory(false);
      setEntryfee("");
      setMapsUrl("");
      setResolvedLocation(null);
      setLocationResolutionFailed(false);
      photos.forEach((photo) => {
        if (photo.preview.startsWith("blob:")) URL.revokeObjectURL(photo.preview);
      });
      setPhotos([]);
      if (!lockedDistrict) {
        setStateId("");
        setDistrictId("");
      }
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
                  <Field label="State">
                    <Select
                      value={stateId || undefined}
                      disabled={Boolean(routeDistrictId)}
                      onValueChange={(value) => {
                        setStateId(value);
                        setDistrictId("");
                      }}
                    >
                      <SelectTrigger aria-label="State" className="w-full">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        {states.map((state) => (
                          <SelectItem key={state.id} value={state.id}>{state.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="District">
                    <Select
                      value={(lockedDistrict?.id ?? districtId) || undefined}
                      disabled={Boolean(routeDistrictId) || !stateId || districtsLoading}
                      onValueChange={setDistrictId}
                    >
                      <SelectTrigger aria-label="District" className="w-full">
                        <SelectValue
                          placeholder={!stateId ? "Select a state first" : districtsLoading ? "Loading districts…" : "Select district"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {lockedDistrict ? (
                          <SelectItem value={lockedDistrict.id}>{lockedDistrict.name}</SelectItem>
                        ) : availableDistricts.map((district) => (
                          <SelectItem key={district.id} value={district.id}>{district.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {stateId && !districtsLoading && availableDistricts.length === 0 && !lockedDistrict ? (
                      <p className="text-xs text-muted-foreground">No enabled districts for this state.</p>
                    ) : null}
                  </Field>
                  <Field label="Category">
                    {categories.length > 0 && !customCategory ? (
                      <Select
                        value={category || undefined}
                        onValueChange={(value) => {
                          if (value === "__custom") {
                            setCategory("");
                            setCustomCategory(true);
                          } else {
                            setCategory(value);
                          }
                        }}
                      >
                        <SelectTrigger aria-label="Category" className="w-full">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                          <SelectItem value="__custom">Other…</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex gap-2">
                        <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Enter category" required />
                        {categories.length > 0 ? (
                          <Button type="button" variant="outline" onClick={() => { setCustomCategory(false); setCategory(""); }}>Choose</Button>
                        ) : null}
                      </div>
                    )}
                  </Field>
                  <Field label="Entry Fee (₹)">
                    <Input
                      type="number"
                      min="0"
                      step="any"
                      value={entryfee}
                      onChange={(e) => setEntryfee(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Google Maps Location" className="sm:col-span-2">
                    <Input
                      type="url"
                      value={mapsUrl}
                      onChange={(e) => setMapsUrl(e.target.value)}
                      placeholder="Paste Google Maps location link"
                      required
                    />
                    {resolvingLocation ? (
                      <p role="status" className="text-xs text-muted-foreground">Resolving Google Maps link…</p>
                    ) : mapsCoordinates ? (
                      <div role="status" className="space-y-0.5 text-xs text-emerald-600">
                        <p className="flex items-center gap-1 font-medium"><Check className="size-3.5" /> Location detected</p>
                        <p>Latitude: {mapsCoordinates.latitude}</p>
                        <p>Longitude: {mapsCoordinates.longitude}</p>
                      </div>
                    ) : locationResolutionFailed ? (
                      <p role="alert" className="text-xs text-destructive">Could not determine coordinates from this Google Maps link.</p>
                    ) : null}
                  </Field>
                </div>
                <Field label="Description">
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
                </Field>
                <Field label="Photos">
                  <PlacePhotosField value={photos} onChange={setPhotos} />
                </Field>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreating(false)}
                    disabled={creating || resolvingLocation || !mapsCoordinates}
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