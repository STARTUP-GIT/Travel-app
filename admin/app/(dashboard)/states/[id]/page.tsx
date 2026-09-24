"use client";

import { ArrowLeft, ChevronRight, Loader2, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { DataTable, type Column } from "@/components/admin/data-table";
import { ImageThumb } from "@/components/admin/image-thumb";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState, EmptyState } from "@/components/admin/state";
import { ToggleField } from "@/components/admin/toggle-field";
import { Button } from "@/components/ui/button";
import { patchJSON } from "@/lib/api/mutate";
import {
  describeUploadError,
  uploadImage,
  validateImageFile,
} from "@/lib/api/upload";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import type { StateAdminDetail, DistrictAdmin } from "@/lib/types";

export default function StateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  const { data, loading, error, refetch } = useAdminData<{ state: StateAdminDetail }>(
    `/admin/api/states/${id}`
  );
  const [savingHero, setSavingHero] = React.useState(false);
  const heroInputRef = React.useRef<HTMLInputElement>(null);

  async function toggleService(next: boolean) {
    await patchJSON(`/admin/api/states/${id}`, { isServiceAvailable: next });
    toast.success(next ? "State service enabled" : "State service disabled");
    refetch();
  }

  async function handleHeroFile(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen) return;

    const invalid = validateImageFile(chosen);
    if (invalid) {
      toast.error("Invalid hero image", { description: invalid });
      return;
    }

    setSavingHero(true);
    try {
      const { url } = await uploadImage(chosen, "states");
      await patchJSON(`/admin/api/states/${id}`, { primaryImage: url });
      toast.success("Hero image updated");
      refetch();
    } catch (err) {
      toast.error("Hero image update failed", {
        description: describeUploadError(err),
      });
    } finally {
      setSavingHero(false);
    }
  }

  async function removeHero() {
    if (!state?.primaryImage) return;
    setSavingHero(true);
    try {
      await patchJSON(`/admin/api/states/${id}`, { primaryImage: null });
      toast.success("Hero image removed");
      refetch();
    } catch (err) {
      toast.error("Failed to remove hero image", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSavingHero(false);
    }
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
          <div className="mono-card p-5">
            <div className="space-y-1.5">
              <h2 className="text-sm font-semibold text-foreground">Hero image</h2>
              <p className="text-xs text-muted-foreground">
                Shown as the banner on the state&apos;s district pages. PNG, JPG or WEBP · up to 5 MB.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-4 rounded-xl border border-border p-4">
              <ImageThumb
                src={state.primaryImage ?? undefined}
                alt={`${state.name} hero`}
                className="size-20 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <input
                  ref={heroInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleHeroFile}
                  disabled={savingHero}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => heroInputRef.current?.click()}
                    disabled={savingHero}
                  >
                    {savingHero ? (
                      <>
                        <Loader2 className="animate-spin" /> Uploading…
                      </>
                    ) : (
                      <>
                        <Upload /> {state.primaryImage ? "Replace image" : "Upload image"}
                      </>
                    )}
                  </Button>
                  {state.primaryImage ? (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={removeHero}
                      disabled={savingHero}
                    >
                      <X /> Remove
                    </Button>
                  ) : null}
                </div>
                {!state.primaryImage ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    No hero image set — the district page will use its fallback banner.
                  </p>
                ) : null}
              </div>
            </div>
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