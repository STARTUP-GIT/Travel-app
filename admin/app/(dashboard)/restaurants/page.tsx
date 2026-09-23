"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { DataTable, type Column } from "@/components/admin/data-table";
import { DeleteButton } from "@/components/admin/delete-button";
import { ImageThumb } from "@/components/admin/image-thumb";
import { PageHeader } from "@/components/admin/page-header";
import { SearchInput } from "@/components/admin/search-input";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { Badge } from "@/components/ui/badge";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import type { RestaurantAdmin } from "@/lib/types";

export default function RestaurantsPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const { data, loading, error, refetch } = useAdminData<{ restaurants: RestaurantAdmin[] }>(
    "/admin/api/restaurants",
    { query: search ? { search } : undefined }
  );

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
      cell: (r) => <span className="font-mono text-xs">{r.food_category?.replace(/_/g, " ").toLowerCase() || "—"}</span>,
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
      cell: (r) => <DeleteButton url={`/admin/api/restaurants/${r.id}`} onDeleted={refetch} />,
      className: "text-right",
    },
  ];

  return (
    <div>
      <PageHeader title="Restaurants" subtitle="Restaurants and their reservation status.">
        <SearchInput value={search} onChange={setSearch} placeholder="Search restaurants…" className="w-56" />
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