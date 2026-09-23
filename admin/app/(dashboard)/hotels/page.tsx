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
import { formatCurrency } from "@/lib/utils";
import type { HotelAdmin } from "@/lib/types";

export default function HotelsPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const { data, loading, error, refetch } = useAdminData<{ hotels: HotelAdmin[] }>(
    "/admin/api/hotels",
    { query: search ? { search } : undefined }
  );

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
      cell: (h) => <DeleteButton url={`/admin/api/hotels/${h.id}`} onDeleted={refetch} />,
      className: "text-right",
    },
  ];

  return (
    <div>
      <PageHeader title="Hotels" subtitle="Hotels and their booking status.">
        <SearchInput value={search} onChange={setSearch} placeholder="Search hotels…" className="w-56" />
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