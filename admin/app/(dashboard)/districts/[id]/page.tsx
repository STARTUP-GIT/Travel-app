"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { StatusBadge } from "@/components/admin/status-badge";
import { ToggleField } from "@/components/admin/toggle-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { patchJSON } from "@/lib/api/mutate";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import type { DistrictAdmin } from "@/lib/types";

export default function DistrictDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { data, loading, error, refetch } = useAdminData<{ district: DistrictAdmin }>(
    `/admin/api/districts/${id}`
  );

  async function toggleService(next: boolean) {
    await patchJSON(`/admin/api/districts/${id}`, { isServiceAvailable: next });
    toast.success(next ? "District service enabled" : "District service disabled");
    refetch();
  }

  async function toggleAutoApprove(next: boolean) {
    await patchJSON(`/admin/api/districts/${id}`, { autoApprovePlaces: next });
    toast.success(next ? "Auto-approve places enabled" : "Auto-approve places disabled");
    refetch();
  }

  const district = data?.district;

  return (
    <div>
      <PageHeader
        title={district?.name ?? "District"}
        subtitle={district ? `Part of ${district.state?.name ?? "—"}` : "Loading…"}
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/districts">
            <ArrowLeft className="size-4" /> All districts
          </Link>
        </Button>
      </PageHeader>

      {loading ? (
        <LoadingState />
      ) : error || !district ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="mono-card p-4">
              <p className="text-2xl font-bold">{district._count.places}</p>
              <p className="text-xs text-muted-foreground">Places</p>
            </div>
            <div className="mono-card p-4">
              <p className="text-2xl font-bold">{district._count.hotels}</p>
              <p className="text-xs text-muted-foreground">Hotels</p>
            </div>
            <div className="mono-card p-4">
              <p className="text-2xl font-bold">{district._count.restaurent}</p>
              <p className="text-xs text-muted-foreground">Restaurants</p>
            </div>
            <div className="mono-card flex flex-col justify-center gap-1 p-4">
              <StatusBadge status={district.isServiceAvailable ? "Available" : "Offline"} />
              <p className="text-xs text-muted-foreground">Service status</p>
            </div>
          </div>

          <div className="mono-card space-y-4 p-5">
            <ToggleField
              label="Service available"
              description="Runs only when the parent state and country are also enabled."
              checked={district.isServiceAvailable}
              onChange={toggleService}
            />
            <div className="my-3 border-t border-border" />
            <ToggleField
              label="Auto-approve places"
              description="New places submitted for this district are approved automatically."
              checked={district.autoApprovePlaces ?? false}
              onChange={toggleAutoApprove}
            />
          </div>

          {district.state ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{district.state.name}</Badge>
              <span className="text-xs">
                Country · {district.state.country?.name ?? "—"} ·
                {district.state.isServiceAvailable ? " State available" : " State offline"}
              </span>
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}