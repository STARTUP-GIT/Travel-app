"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { DataTable, type Column } from "@/components/admin/data-table";
import { ImageThumb } from "@/components/admin/image-thumb";
import { PageHeader } from "@/components/admin/page-header";
import { SearchInput } from "@/components/admin/search-input";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { formatCurrency } from "@/lib/utils";
import type { PlaceAdmin } from "@/lib/types";

export default function PlacesPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const { data, loading, error, refetch } = useAdminData<{ places: PlaceAdmin[] }>(
    "/admin/api/places",
    { query: search ? { search } : undefined }
  );

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
      key: "saved",
      header: "Saved",
      cell: (p) => (
        <span className="font-mono text-sm text-muted-foreground">{p._count?.user_fav_place ?? 0}</span>
      ),
      className: "text-center",
    },
  ];

  return (
    <div>
      <PageHeader title="Places" subtitle="All places across states and districts.">
        <SearchInput value={search} onChange={setSearch} placeholder="Search places…" className="w-56" />
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