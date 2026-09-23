"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { DataTable, type Column } from "@/components/admin/data-table";
import { DeleteButton } from "@/components/admin/delete-button";
import { ImageThumb } from "@/components/admin/image-thumb";
import { PageHeader } from "@/components/admin/page-header";
import { SearchInput } from "@/components/admin/search-input";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { formatDate } from "@/lib/utils";
import type { UserAdmin } from "@/lib/types";

export default function UsersPage() {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const { data, loading, error, refetch } = useAdminData<{ users: UserAdmin[] }>(
    "/admin/api/users",
    { query: search ? { search } : undefined }
  );

  const columns: Column<UserAdmin>[] = [
    {
      key: "name",
      header: "User",
      cell: (u) => (
        <div className="flex items-center gap-3">
          <ImageThumb src={u.profilepic} alt={u.name} />
          <div>
            <p className="font-medium">{u.name}</p>
            <p className="text-xs text-muted-foreground">@{u.username}</p>
          </div>
        </div>
      ),
    },
    { key: "contact", header: "Contact", cell: (u) => (
        <div className="text-xs">
          <p>{u.email}</p>
          <p className="text-muted-foreground">{u.phonenumber ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "activity",
      header: "Bookings",
      cell: (u) => (
        <span className="font-mono text-sm text-muted-foreground">
          {(u._count?.hotel_booking ?? 0) +
            (u._count?.restaurant_reservation ?? 0) +
            (u._count?.specificGuideBookings ?? 0) +
            (u._count?.commonGuideBookings ?? 0)}
        </span>
      ),
      className: "text-center",
    },
    { key: "joined", header: "Joined", cell: (u) => <span className="text-xs text-muted-foreground">{formatDate(u.createdAt)}</span> },
    {
      key: "actions",
      header: "",
      cell: (u) => <DeleteButton url={`/admin/api/users/${u.id}`} onDeleted={refetch} />,
      className: "text-right",
    },
  ];

  return (
    <div>
      <PageHeader title="Users" subtitle="Application users and their activity.">
        <SearchInput value={search} onChange={setSearch} placeholder="Search users…" className="w-56" />
      </PageHeader>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <DataTable
          columns={columns}
          rows={data?.users ?? []}
          onRowClick={(u) => router.push(`/users/${u.id}`)}
        />
      )}
    </div>
  );
}