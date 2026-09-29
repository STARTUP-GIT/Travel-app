"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/admin/data-table";
import { DeleteButton } from "@/components/admin/delete-button";
import { ImageThumb } from "@/components/admin/image-thumb";
import { PageHeader } from "@/components/admin/page-header";
import { SearchInput } from "@/components/admin/search-input";
import { ErrorState, LoadingState, EmptyState } from "@/components/admin/state";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { patchJSON } from "@/lib/api/mutate";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import type { ContentApprovalStatus, GuideAdmin } from "@/lib/types";

type Kind = "specific" | "common";

export default function GuidesPage() {
  const router = useRouter();
  const [kind, setKind] = React.useState<Kind>("specific");
  const [search, setSearch] = React.useState("");
  const [status, setStatus] = React.useState<"ALL" | ContentApprovalStatus>("ALL");

  const { data, loading, error, refetch } = useAdminData<{ guides: GuideAdmin[] }>(
    `/admin/api/guides/${kind}`,
    { query: { search: search || undefined, status } }
  );

  async function setApproval(g: GuideAdmin, next: ContentApprovalStatus, verb: string) {
    try {
      await patchJSON(`/admin/api/guides/${kind}/${g.id}/status`, { status: next });
      toast.success(verb);
      refetch();
    } catch (err) {
      toast.error("Update failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  }

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
      key: "status",
      header: "Approval",
      cell: (g) => (
        <div className="flex items-center gap-1">
          <StatusBadge status={g.status ?? "PENDING"} />
          {g.isReported ? <Badge className="bg-red-600 text-white">Reported</Badge> : null}
          {g.status !== "APPROVED" ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-1.5 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                void setApproval(g, "APPROVED", "Guide approved");
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
                void setApproval(g, "REJECTED", "Guide rejected");
              }}
            >
              Undo
            </Button>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (g) => <DeleteButton url={`/admin/api/guides/${kind}/${g.id}`} onDeleted={refetch} />,
      className: "text-right",
    },
  ];

  return (
    <div>
      <PageHeader title="Guides" subtitle="Specific and common guides across all districts.">
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search guides…" className="w-full sm:w-56" />
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
        </div>
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
