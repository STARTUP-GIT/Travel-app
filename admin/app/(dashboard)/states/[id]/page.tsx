"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/admin/data-table";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState, EmptyState } from "@/components/admin/state";
import { ToggleField } from "@/components/admin/toggle-field";
import { Button } from "@/components/ui/button";
import { patchJSON } from "@/lib/api/mutate";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import type { StateAdminDetail, DistrictAdmin } from "@/lib/types";

export default function StateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  const { data, loading, error, refetch } = useAdminData<{ state: StateAdminDetail }>(
    `/admin/api/states/${id}`
  );

  async function toggleService(next: boolean) {
    await patchJSON(`/admin/api/states/${id}`, { isServiceAvailable: next });
    toast.success(next ? "State service enabled" : "State service disabled");
    refetch();
  }

  const state = data?.state;

  const columns: Column<DistrictAdmin>[] = [
    {
      key: "name",
      header: "District",
      cell: (d) => <span className="font-medium">{d.name}</span>,
    },
    {
      key: "places",
      header: "Places",
      cell: (d) => <span className="font-mono text-muted-foreground">{d._count.places}</span>,
      className: "text-center",
    },
    {
      key: "service",
      header: "Service",
      cell: (d) => (d.isServiceAvailable ? "Available" : "Offline"),
    },
    {
      key: "action",
      header: "",
      cell: () => <ChevronRight className="ml-auto size-4 text-muted-foreground" />,
      className: "w-8",
    },
  ];

  return (
    <div>
      <PageHeader
        title={state?.name ?? "State"}
        subtitle={state ? `Country · ${state.country?.name ?? "—"}` : "Loading…"}
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/states">
            <ArrowLeft className="size-4" /> All states
          </Link>
        </Button>
      </PageHeader>

      {loading ? (
        <LoadingState />
      ) : error || !state ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <div className="space-y-5">
          <div className="mono-card flex items-center gap-5 p-5">
            <ToggleField
              label="Service available"
              description="Determines whether this state appears and can be used by visitors."
              checked={state.isServiceAvailable}
              onChange={toggleService}
            />
          </div>
          <section>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Districts ({state.districts.length})
            </h2>
            {state.districts.length === 0 ? (
              <EmptyState title="No districts" description="This state has no districts yet." />
            ) : (
              <DataTable
                columns={columns}
                rows={state.districts}
                onRowClick={(d) => router.push(`/districts/${d.id}`)}
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}