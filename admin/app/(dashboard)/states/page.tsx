"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { DataTable, type Column } from "@/components/admin/data-table";
import { PageHeader } from "@/components/admin/page-header";
import { SearchInput } from "@/components/admin/search-input";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { Badge } from "@/components/ui/badge";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import type { StateAdmin } from "@/lib/types";

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
  ];

  return (
    <div>
      <PageHeader
        title="States"
        subtitle="Manage states and their service availability."
      >
        <SearchInput value={search} onChange={setSearch} placeholder="Search states…" className="w-56" />
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