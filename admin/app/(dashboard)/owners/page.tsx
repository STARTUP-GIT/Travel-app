"use client";

import * as React from "react";

import { DataTable, type Column } from "@/components/admin/data-table";
import { ImageThumb } from "@/components/admin/image-thumb";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState, EmptyState } from "@/components/admin/state";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { formatDate } from "@/lib/utils";
import type { OwnerAdmin } from "@/lib/types";

type Kind = "hotel" | "restaurant";

export default function OwnersPage() {
  const [kind, setKind] = React.useState<Kind>("hotel");

  const hotel = useAdminData<{ owners: OwnerAdmin[] }>("/admin/api/hotel-owners");
  const restaurant = useAdminData<{ owners: OwnerAdmin[] }>("/admin/api/restaurant-owners");

  const state = kind === "hotel" ? hotel : restaurant;
  const stateName = kind === "hotel" ? "Hotel" : "Restaurant";

  const columns: Column<OwnerAdmin>[] = [
    {
      key: "name",
      header: "Owner",
      cell: (o) => (
        <div className="flex items-center gap-3">
          <ImageThumb src={o.profile_pic} alt={o.name} />
          <div>
            <p className="font-medium">{o.name}</p>
            <p className="text-xs text-muted-foreground">@{o.username}</p>
          </div>
        </div>
      ),
    },
    { key: "contact", header: "Contact", cell: (o) => (
        <div className="text-xs">
          <p>{o.email}</p>
          <p className="text-muted-foreground">{o.phone_number}</p>
        </div>
      ),
    },
    {
      key: "count",
      header: kind === "hotel" ? "Hotels" : "Restaurants",
      cell: (o) => (
        <span className="font-mono text-sm text-muted-foreground">
          {kind === "hotel" ? o.hotels?.length ?? 0 : o.restaurents?.length ?? 0}
        </span>
      ),
      className: "text-center",
    },
    { key: "joined", header: "Joined", cell: (o) => <span className="text-xs text-muted-foreground">{formatDate(o.createdAt)}</span> },
  ];

  return (
    <div>
      <PageHeader title="Owners" subtitle="Hotel and restaurant owners." />
      <Tabs value={kind} onValueChange={(v) => setKind(v as Kind)} className="mb-4">
        <TabsList>
          <TabsTrigger value="hotel">Hotel owners</TabsTrigger>
          <TabsTrigger value="restaurant">Restaurant owners</TabsTrigger>
        </TabsList>
      </Tabs>

      {state.loading ? (
        <LoadingState />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.refetch} />
      ) : !state.data?.owners.length ? (
        <EmptyState title={`No ${stateName.toLowerCase()} owners`} />
      ) : (
        <DataTable columns={columns} rows={state.data.owners} />
      )}
    </div>
  );
}