"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { DataTable, type Column } from "@/components/admin/data-table";
import { PageHeader } from "@/components/admin/page-header";
import { SearchInput } from "@/components/admin/search-input";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { Badge } from "@/components/ui/badge";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import type { DistrictAdmin } from "@/lib/types";

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
  ];

  return (
    <div>
      <PageHeader title="Districts" subtitle="Manage districts and their settings.">
        <SearchInput value={search} onChange={setSearch} placeholder="Search districts…" className="w-56" />
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