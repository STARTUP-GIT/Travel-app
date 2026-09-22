"use client";

import { ArrowLeft, Star } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { ImageThumb } from "@/components/admin/image-thumb";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState, EmptyState } from "@/components/admin/state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { GuideAdmin } from "@/lib/types";

type GuideDetail = GuideAdmin & {
  review?: string[];
  place?: { id: string; name: string; images?: string[]; description?: string };
  places?: { place: { id: string; name: string; images?: string[] } }[];
};

export default function GuideDetailPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = React.use(params);
  const { data, loading, error, refetch } = useAdminData<{ guide: GuideDetail }>(
    `/admin/api/guides/${kind}/${id}`
  );

  const guide = data?.guide;

  return (
    <div>
      <PageHeader
        title={guide?.full_name ?? "Guide"}
        subtitle={kind === "specific" ? "Specific guide" : "Common guide"}
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/guides">
            <ArrowLeft className="size-4" /> All guides
          </Link>
        </Button>
      </PageHeader>

      {loading ? (
        <LoadingState />
      ) : error || !guide ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="mono-card flex flex-col items-start gap-4 p-5">
            <div className="flex w-full items-center gap-4">
              <ImageThumb src={guide.profile_pic} alt={guide.full_name} className="size-14 rounded-xl" />
              <div>
                <h2 className="text-lg font-bold">{guide.full_name}</h2>
                <p className="text-xs text-muted-foreground">@{guide.username}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {guide.isReported ? (
                <Badge className="bg-red-600 text-white">Reported</Badge>
              ) : (
                <Badge variant="outline">Active</Badge>
              )}
              {guide.rating != null ? (
                <Badge variant="outline">
                  <Star className="mr-1 size-3 fill-current" /> {guide.rating}
                </Badge>
              ) : null}
            </div>
            <dl className="w-full space-y-2 text-sm">
              <Dt label="Email" value={guide.email} />
              <Dt label="Phone" value={guide.phonenumber} />
              <Dt label="Tagline" value={guide.tagline ?? "—"} />
              <Dt label="Experience" value={guide.experience != null ? `${guide.experience} yrs` : "—"} />
              <Dt label="Cost" value={guide.cost != null ? formatCurrency(guide.cost) : "—"} />
              <Dt label="Language" value={guide.language ?? "—"} />
              <Dt label="Joined" value={formatDate(guide.createdAt)} />
            </dl>
          </div>

          <div className="space-y-5 lg:col-span-2">
            <div className="mono-card p-5">
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </h3>
              <p className="whitespace-pre-wrap text-sm text-foreground/80">
                {guide.description || "No description provided."}
              </p>
            </div>

            {guide.review && guide.review.length > 0 ? (
              <div className="mono-card p-5">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Reviews ({guide.review.length})
                </h3>
                <ul className="space-y-2">
                  {guide.review.map((r, i) => (
                    <li key={i} className="rounded-lg bg-muted/40 p-3 text-sm">
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {kind === "specific" && guide.place ? (
              <div className="mono-card p-5">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Assigned place
                </h3>
                <div className="flex items-center gap-3">
                  <ImageThumb src={guide.place.images?.[0]} alt={guide.place.name} />
                  <div>
                    <p className="font-medium">{guide.place.name}</p>
                    <Button asChild variant="link" size="sm" className="px-0 text-xs">
                      <Link href={`/places/${guide.place.id}`}>View place</Link>
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {kind === "common" && guide.places && guide.places.length > 0 ? (
              <div className="mono-card p-5">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Covered places ({guide.places.length})
                </h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {guide.places.map(({ place: p }) => (
                    <li key={p.id} className="flex items-center gap-3 rounded-lg bg-muted/40 p-3">
                      <ImageThumb src={p.images?.[0]} alt={p.name} />
                      <span className="truncate text-sm font-medium">{p.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyState title="No places" description="This guide is not linked to any place." />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Dt({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium break-words">{value}</dd>
    </div>
  );
}