"use client";

import { Star } from "lucide-react";
import * as React from "react";

import { DataTable, type Column } from "@/components/admin/data-table";
import { DeleteButton } from "@/components/admin/delete-button";
import { ImageThumb } from "@/components/admin/image-thumb";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState, EmptyState } from "@/components/admin/state";
import { Badge } from "@/components/ui/badge";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import type { Testimonial } from "@/lib/types";

export default function ReviewsPage() {
  const { data, loading, error, refetch } = useAdminData<{ testimonials: Testimonial[] }>(
    "/admin/api/testimonials"
  );

  const columns: Column<Testimonial>[] = [
    {
      key: "user",
      header: "User",
      cell: (t) => (
        <div className="flex items-center gap-3">
          <ImageThumb src={t.user?.profilepic} alt={t.user?.name ?? "User"} />
          <div>
            <p className="font-medium">{t.user?.name ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{t.user?.email ?? "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "target",
      header: "About",
      cell: (t) =>
        t.specificguide?.full_name ??
        t.commonGuide?.full_name ?? (
          <Badge variant="outline">App</Badge>
        ),
    },
    {
      key: "rating",
      header: "Rating",
      cell: (t) => (
        <span className="flex items-center gap-1 font-mono text-sm">
          <Star className="size-3.5 fill-current" /> {t.rating}
        </span>
      ),
    },
    {
      key: "text",
      header: "Review",
      cell: (t) => <p className="line-clamp-2 max-w-md text-sm text-muted-foreground">{t.text}</p>,
    },
    {
      key: "actions",
      header: "",
      cell: (t) => <DeleteButton url={`/admin/api/testimonials/${t.id}`} onDeleted={refetch} />,
      className: "text-right",
    },
  ];

  return (
    <div>
      <PageHeader title="Reviews" subtitle="User testimonials and reviews." />
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : !data?.testimonials.length ? (
        <EmptyState title="No reviews yet" />
      ) : (
        <DataTable columns={columns} rows={data.testimonials} />
      )}
    </div>
  );
}