"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

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
import { Textarea } from "@/components/ui/textarea";
import { patchJSON, postJSON } from "@/lib/api/mutate";
import { DataTable, type Column } from "@/components/admin/data-table";
import { DeleteButton } from "@/components/admin/delete-button";
import { ImageThumb } from "@/components/admin/image-thumb";
import { PageHeader } from "@/components/admin/page-header";
import { SearchInput } from "@/components/admin/search-input";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { StatusBadge } from "@/components/admin/status-badge";
import { LocationFields } from "@/components/admin/location-fields";
import { useAvailableLocations } from "@/lib/hooks/use-available-locations";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { cn, formatCurrency } from "@/lib/utils";
import type { ContentApprovalStatus, HotelAdmin } from "@/lib/types";

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
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
        {tooltip ? (
          <span className="text-[10px] text-muted-foreground/60">({tooltip})</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

export default function HotelsPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<"ALL" | ContentApprovalStatus>("ALL");
  const { data, loading, error, refetch } = useAdminData<{ hotels: HotelAdmin[] }>(
    "/admin/api/hotels",
    { query: { search: search || undefined, status } }
  );

  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [stateId, setStateId] = React.useState("");
  const [districtId, setDistrictId] = React.useState("");
  const {
    states,
    districts,
    statesLoading,
    loading: locationsLoading,
    refresh: refreshLocations,
  } = useAvailableLocations(stateId);
  const [hotelOwnerId, setHotelOwnerId] = React.useState("");
  const [costPerNight, setCostPerNight] = React.useState("");
  const [rating, setRating] = React.useState("");
  const [profileLogo, setProfileLogo] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [images, setImages] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [whatsapp, setWhatsapp] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [website, setWebsite] = React.useState("");

  async function createHotel() {
    if (!name.trim() || !address.trim() || !districtId.trim() || !hotelOwnerId.trim()) {
      toast.error("Name, address, district and owner are required");
      return;
    }
    if (
      !states.some((state) => state.id === stateId && state.isServiceAvailable) ||
      !districts.some((district) => district.id === districtId)
    ) {
      toast.error("Choose an enabled state and district");
      return;
    }
    setCreating(true);
    try {
      const imageList = images
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      await postJSON("/admin/api/hotels", {
        name: name.trim(),
        address: address.trim(),
        districtId: districtId.trim(),
        hotelOwnerId: hotelOwnerId.trim(),
        profile_logo: profileLogo.trim(),
        description: description.trim() || null,
        rating: Number(rating),
        cost_per_night: Number(costPerNight),
        images: imageList,
        phone_number: phone.trim() || null,
        whatsapp_number: whatsapp.trim() || null,
        email: email.trim() || null,
        website: website.trim() || null,
      });
      toast.success("Hotel created");
      setName("");
      setAddress("");
      setStateId("");
      setDistrictId("");
      setHotelOwnerId("");
      setCostPerNight("");
      setRating("");
      setProfileLogo("");
      setDescription("");
      setImages("");
      setPhone("");
      setWhatsapp("");
      setEmail("");
      setWebsite("");
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

  async function approve(h: HotelAdmin) {
    try {
      await patchJSON(`/admin/api/hotels/${h.id}/status`, { status: "APPROVED" });
      toast.success("Hotel approved");
      refetch();
    } catch (err) {
      toast.error("Approval failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function reject(h: HotelAdmin) {
    try {
      await patchJSON(`/admin/api/hotels/${h.id}/status`, { status: "REJECTED" });
      toast.success("Hotel rejected");
      refetch();
    } catch (err) {
      toast.error("Rejection failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  const columns: Column<HotelAdmin>[] = [
    {
      key: "name",
      header: "Hotel",
      cell: (h) => (
        <div className="flex items-center gap-3">
          <ImageThumb src={h.profile_logo ?? h.images?.[0]} alt={h.name} />
          <div className="min-w-0">
            <p className="truncate font-medium">{h.name}</p>
            <p className="truncate text-xs text-muted-foreground">{h.district?.name ?? "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "rating",
      header: "Rating",
      cell: (h) => <span className="font-mono text-sm">{h.rating != null ? `${h.rating} ★` : "—"}</span>,
    },
    {
      key: "cost",
      header: "Per night",
      cell: (h) => <span className="font-mono text-sm">{formatCurrency(h.cost_per_night)}</span>,
    },
    {
      key: "status",
      header: "Approval",
      cell: (h) => (
        <div className="flex items-center gap-1">
          <StatusBadge status={h.status ?? "PENDING"} />
          {h.status !== "APPROVED" ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-1.5 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                approve(h);
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
                reject(h);
              }}
            >
              Undo
            </Button>
          )}
        </div>
      ),
    },
    {
      key: "bookings",
      header: "Bookings",
      cell: (h) => <span className="font-mono text-sm text-muted-foreground">{h._count?.bookings ?? 0}</span>,
      className: "text-center",
    },
    {
      key: "enabled",
      header: "Booking",
      cell: (h) =>
        h.booking_enabled ? <Badge className="bg-zinc-900 text-white">Enabled</Badge> : <Badge variant="outline">Off</Badge>,
    },
    {
      key: "actions",
      header: "",
      cell: (h) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={(e) => { e.stopPropagation(); void router.push(`/hotels/${h.id}`); }}
          >
            Edit
          </Button>
          <DeleteButton url={`/admin/api/hotels/${h.id}`} onDeleted={refetch} />
        </div>
      ),
      className: "text-right",
    },
  ];

  return (
    <div>
      <PageHeader title="Hotels" subtitle="Hotels and their booking status.">
        <div className="flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search hotels…" className="w-full sm:w-56" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "ALL" | ContentApprovalStatus)}
            className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm sm:w-auto"
          >
            <option value="ALL">All</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <Dialog open={creating} onOpenChange={(nextOpen) => {
            if (nextOpen) {
              setStateId("");
              setDistrictId("");
              refreshLocations();
            }
            setCreating(nextOpen);
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5 bg-zinc-900 text-white hover:bg-zinc-800">
                <Plus className="size-4" /> New hotel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create hotel</DialogTitle>
                <DialogDescription>
                  Hotels are created as approved and visible to visitors immediately.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createHotel();
                }}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name" className="sm:col-span-2">
                    <Input value={name} onChange={(e) => setName(e.target.value)} required />
                  </Field>
                  <Field label="Address" className="sm:col-span-2">
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} required />
                  </Field>
                  <LocationFields
                    stateId={stateId}
                    districtId={districtId}
                    states={states}
                    districts={districts}
                    statesLoading={statesLoading}
                    loading={locationsLoading}
                    onChange={(nextStateId, nextDistrictId) => {
                      setStateId(nextStateId);
                      setDistrictId(nextDistrictId);
                    }}
                  />
                  <Field label="Owner" tooltip="Hotel owner ID">
                    <Input
                      value={hotelOwnerId}
                      onChange={(e) => setHotelOwnerId(e.target.value)}
                      placeholder="owner id"
                      required
                    />
                  </Field>
                  <Field label="Cost per night (₹)">
                    <Input
                      type="number"
                      step="any"
                      value={costPerNight}
                      onChange={(e) => setCostPerNight(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Rating (0-5)">
                    <Input
                      type="number"
                      step="any"
                      min={0}
                      max={5}
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                    />
                  </Field>
                  <Field label="Profile logo URL">
                    <Input value={profileLogo} onChange={(e) => setProfileLogo(e.target.value)} />
                  </Field>
                </div>
                <Field label="Description">
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                </Field>
                <Field label="Image URLs (one per line)">
                  <Textarea value={images} onChange={(e) => setImages(e.target.value)} rows={3} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Phone">
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </Field>
                  <Field label="WhatsApp">
                    <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                  </Field>
                  <Field label="Email">
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                  </Field>
                  <Field label="Website">
                    <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </Field>
                </div>
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
                    {creating ? "Creating…" : "Create hotel"}
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
          rows={data?.hotels ?? []}
          onRowClick={(h) => router.push(`/hotels/${h.id}`)}
        />
      )}
    </div>
  );
}