"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { DataTable, type Column } from "@/components/admin/data-table";
import { ImageThumb } from "@/components/admin/image-thumb";
import { PageHeader } from "@/components/admin/page-header";
import { SearchInput } from "@/components/admin/search-input";
import { ErrorState, LoadingState, EmptyState } from "@/components/admin/state";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import type { GuideAdmin } from "@/lib/types";

type Kind = "specific" | "common";

export default function GuidesPage() {
  const router = useRouter();
  const [kind, setKind] = React.useState<Kind>("specific");
  const [search, setSearch] = React.useState("");

  const { data, loading, error, refetch } = useAdminData<{ guides: GuideAdmin[] }>(
    `/admin/api/guides/${kind}`,
    { query: search ? { search } : undefined }
  );

  const columns: Column<GuideAdmin>[] = [
    {
      key: "name",
      header: "Guide",
      cell: (g) => (
        <div className="flex items-center gap-3">
          <ImageThumb src={g.profile_pic} alt={g.full_name} />
          <div>
            <p className="font-medium">{g.full_name}</p>
            <p className="text-xs text-muted-foreground">@{g.username}</p>
          </div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      cell: (g) => (
        <div className="text-xs">
          <p>{g.email}</p>
          <p className="text-muted-foreground">{g.phonenumber}</p>
        </div>
      ),
    },
    {
      key: "places",
      header: kind === "specific" ? "Place" : "Places",
      cell: (g) => <span className="text-muted-foreground">{labelFor(g, kind)}</span>,
    },
    {
      key: "rating",
      header: "Rating",
      cell: (g) => <span className="font-mono text-sm">{g.rating != null ? `${g.rating} ★` : "—"}</span>,
    },
    {
      key: "reported",
      header: "Status",
      cell: (g) => (g.isReported ? <Badge className="bg-red-600 text-white">Reported</Badge> : <Badge variant="outline">Active</Badge>),
    },
  ];

  return (
    <div>
      <PageHeader title="Guides" subtitle="Specific and common guides across all districts.">
        <SearchInput value={search} onChange={setSearch} placeholder="Search guides…" className="w-56" />
      </PageHeader>
      <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)} className="mb-4">
        <TabsList>
          <TabsTrigger value="specific">Specific</TabsTrigger>
          <TabsTrigger value="common">Common</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !data?.guides.length ? (
        <EmptyState title="No guides found" description="No guides match your search." />
      ) : (
        <DataTable
          columns={columns}
          rows={data.guides}
          onRowClick={(g) => router.push(`/guides/${kind}/${g.id}`)}
        />
      )}
    </div>
  );
}

function labelFor(g: GuideAdmin, kind: Kind) {
  if (kind === "specific") return g.place?.name ?? "—";
  return String(g.places?.length ?? 0);
}