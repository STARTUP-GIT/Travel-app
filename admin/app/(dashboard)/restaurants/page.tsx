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
import { LocationFields } from "@/components/admin/location-fields";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { useAvailableLocations } from "@/lib/hooks/use-available-locations";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ContentApprovalStatus, RestaurantAdmin } from "@/lib/types";

function RField({
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

export default function RestaurantsPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<"ALL" | ContentApprovalStatus>("ALL");
  const { data, loading, error, refetch } = useAdminData<{ restaurants: RestaurantAdmin[] }>(
    "/admin/api/restaurants",
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
  const [restaurantOwnerId, setRestaurantOwnerId] = React.useState("");
  const [foodCategory, setFoodCategory] = React.useState("VEG_AND_NONVEG");
  const [rating, setRating] = React.useState("");
  const [profileLogo, setProfileLogo] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [menu, setMenu] = React.useState("");
  const [images, setImages] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [whatsapp, setWhatsapp] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [website, setWebsite] = React.useState("");

  async function createRestaurant() {
    if (!name.trim() || !address.trim() || !districtId.trim() || !restaurantOwnerId.trim()) {
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
      const menuList = menu
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const imageList = images
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      await postJSON("/admin/api/restaurants", {
        name: name.trim(),
        address: address.trim(),
        districtId: districtId.trim(),
        restaurentOwnerId: restaurantOwnerId.trim(),
        food_category: foodCategory as "VEG_AND_NONVEG" | "PUREVEG" | "NONVEG",
        rating: Number(rating),
        profile_logo: profileLogo.trim(),
        description: description.trim() || null,
        menu: menuList,
        images: imageList,
        phone_number: phone.trim() || null,
        whatsapp_number: whatsapp.trim() || null,
        email: email.trim() || null,
        website: website.trim() || null,
      });
      toast.success("Restaurant created");
      setName("");
      setAddress("");
      setStateId("");
      setDistrictId("");
      setRestaurantOwnerId("");
      setFoodCategory("VEG_AND_NONVEG");
      setRating("");
      setProfileLogo("");
      setDescription("");
      setMenu("");
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

  async function approve(r: RestaurantAdmin) {
    try {
      await patchJSON(`/admin/api/restaurants/${r.id}/status`, { status: "APPROVED" });
      toast.success("Restaurant approved");
      refetch();
    } catch (err) {
      toast.error("Approval failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  async function reject(r: RestaurantAdmin) {
    try {
      await patchJSON(`/admin/api/restaurants/${r.id}/status`, { status: "REJECTED" });
      toast.success("Restaurant rejected");
      refetch();
    } catch (err) {
      toast.error("Rejection failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

  const columns: Column<RestaurantAdmin>[] = [
    {
      key: "name",
      header: "Restaurant",
      cell: (r) => (
        <div className="flex items-center gap-3">
          <ImageThumb src={r.profile_logo ?? r.images?.[0]} alt={r.name} />
          <div className="min-w-0">
            <p className="truncate font-medium">{r.name}</p>
            <p className="truncate text-xs text-muted-foreground">{r.district?.name ?? "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "rating",
      header: "Rating",
      cell: (r) => <span className="font-mono text-sm">{r.rating != null ? `${r.rating} ★` : "—"}</span>,
    },
    {
      key: "food",
      header: "Food",
      cell: (r) => (
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-xs font-mono"
          defaultValue={r.food_category ?? "VEG_AND_NONVEG"}
          disabled
        >
          <option value="PUREVEG">Pure veg</option>
          <option value="NONVEG">Non-veg</option>
          <option value="VEG_AND_NONVEG">Veg & non-veg</option>
        </select>
      ),
    },
    {
      key: "status",
      header: "Approval",
      cell: (r) => (
        <div className="flex items-center gap-1">
          <StatusBadge status={r.status ?? "PENDING"} />
          {r.status !== "APPROVED" ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-1.5 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                approve(r);
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
                reject(r);
              }}
            >
              Undo
            </Button>
          )}
        </div>
      ),
    },
    {
      key: "reservations",
      header: "Reservations",
      cell: (r) => <span className="font-mono text-sm text-muted-foreground">{r._count?.reservations ?? 0}</span>,
      className: "text-center",
    },
    {
      key: "enabled",
      header: "Booking",
      cell: (r) =>
        r.booking_enabled ? <Badge className="bg-zinc-900 text-white">Enabled</Badge> : <Badge variant="outline">Off</Badge>,
    },
    {
      key: "actions",
      header: "",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={(e) => { e.stopPropagation(); void router.push(`/restaurants/${r.id}`); }}
          >
            Edit
          </Button>
          <DeleteButton url={`/admin/api/restaurants/${r.id}`} onDeleted={refetch} />
        </div>
      ),
      className: "text-right",
    },
  ];

  return (
    <div>
      <PageHeader title="Restaurants" subtitle="Restaurants and their reservation status.">
        <div className="flex items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search restaurants…" className="w-full sm:w-56" />
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
                <Plus className="size-4" /> New restaurant
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create restaurant</DialogTitle>
                <DialogDescription>
                  Restaurants are created as approved and visible to visitors immediately.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createRestaurant();
                }}
                className="space-y-4"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <RField label="Name" className="sm:col-span-2">
                    <Input value={name} onChange={(e) => setName(e.target.value)} required />
                  </RField>
                  <RField label="Address" className="sm:col-span-2">
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} required />
                  </RField>
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
                  <RField label="Owner" tooltip="Restaurant owner ID">
                    <Input
                      value={restaurantOwnerId}
                      onChange={(e) => setRestaurantOwnerId(e.target.value)}
                      placeholder="owner id"
                      required
                    />
                  </RField>
                  <RField label="Food category">
                    <select
                      className="h-9 rounded-md border border-input bg-background text-sm"
                      value={foodCategory}
                      onChange={(e) => setFoodCategory(e.target.value as typeof foodCategory)}
                    >
                      <option value="PUREVEG">Pure veg</option>
                      <option value="NONVEG">Non-veg</option>
                      <option value="VEG_AND_NONVEG">Veg & non-veg</option>
                    </select>
                  </RField>
                  <RField label="Rating (0-5)">
                    <Input
                      type="number"
                      step="any"
                      min={0}
                      max={5}
                      value={rating}
                      onChange={(e) => setRating(e.target.value)}
                    />
                  </RField>
                  <RField label="Profile logo URL">
                    <Input value={profileLogo} onChange={(e) => setProfileLogo(e.target.value)} />
                  </RField>
                </div>
                <RField label="Description">
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                </RField>
                <RField label="Menu items (one per line)">
                  <Textarea value={menu} onChange={(e) => setMenu(e.target.value)} rows={3} />
                </RField>
                <RField label="Image URLs (one per line)">
                  <Textarea value={images} onChange={(e) => setImages(e.target.value)} rows={3} />
                </RField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <RField label="Phone">
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </RField>
                  <RField label="WhatsApp">
                    <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
                  </RField>
                  <RField label="Email">
                    <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                  </RField>
                  <RField label="Website">
                    <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </RField>
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
                    {creating ? "Creating…" : "Create restaurant"}
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
          rows={data?.restaurants ?? []}
          onRowClick={(r) => router.push(`/restaurants/${r.id}`)}
        />
      )}
    </div>
  );
}