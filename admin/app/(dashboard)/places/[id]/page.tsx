"use client";

import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "sonner";

import { ImageThumb } from "@/components/admin/image-thumb";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { patchJSON } from "@/lib/api/mutate";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import type { PlaceAdminDetail } from "@/lib/types";

export default function PlaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { data, loading, error, refetch } = useAdminData<{ place: PlaceAdminDetail }>(
    `/admin/api/places/${id}`
  );
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [entryfee, setEntryfee] = React.useState("");
  const [latitude, setLatitude] = React.useState("");
  const [longitude, setLongitude] = React.useState("");
  const [images, setImages] = React.useState("");

  React.useEffect(() => {
    if (!data?.place) return;
    const p = data.place;
    setName(p.name);
    setDescription(p.description);
    setCategory(p.category);
    setEntryfee(String(p.entryfee ?? 0));
    setLatitude(String(p.latitude ?? ""));
    setLongitude(String(p.longitude ?? ""));
    setImages((p.images ?? []).join("\n"));
  }, [data]);

  const place = data?.place;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!place) return;
    const imageList = images
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const body: Record<string, unknown> = {
      ...(name !== place.name ? { name } : {}),
      ...(description !== place.description ? { description } : {}),
      ...(category !== place.category ? { category } : {}),
      ...(trimNum(entryfee) !== place.entryfee ? { entryfee: Number(entryfee) } : {}),
      ...(trimNum(latitude) !== place.latitude ? { latitude: Number(latitude) } : {}),
      ...(trimNum(longitude) !== place.longitude ? { longitude: Number(longitude) } : {}),
      ...(images !== (place.images ?? []).join("\n") ? { images: imageList } : {}),
    };
    if (Object.keys(body).length === 0) {
      toast.info("No changes to save");
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      await patchJSON(`/${place.districtId}/services/api/places/${place.id}`, body);
      toast.success("Place updated");
      setOpen(false);
      refetch();
    } catch (err) {
      toast.error("Update failed", {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title={place?.name ?? "Place"} subtitle={place?.district?.name ?? "Loading…"}>
        <Button asChild variant="outline" size="sm">
          <Link href="/places">
            <ArrowLeft className="size-4" /> All places
          </Link>
        </Button>
        {place ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800">
                <Pencil className="size-4" /> Edit place
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit place</DialogTitle>
                <DialogDescription>Updates apply immediately and are visible to visitors.</DialogDescription>
              </DialogHeader>
              <form onSubmit={save} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name" className="sm:col-span-2">
                    <Input value={name} onChange={(e) => setName(e.target.value)} required />
                  </Field>
                  <Field label="Category">
                    <Input value={category} onChange={(e) => setCategory(e.target.value)} />
                  </Field>
                  <Field label="Entry fee (₹)">
                    <Input type="number" step="any" value={entryfee} onChange={(e) => setEntryfee(e.target.value)} />
                  </Field>
                  <Field label="Latitude">
                    <Input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
                  </Field>
                  <Field label="Longitude">
                    <Input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
                  </Field>
                </div>
                <Field label="Description">
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
                </Field>
                <Field label="Image URLs (one per line)">
                  <Textarea value={images} onChange={(e) => setImages(e.target.value)} rows={4} />
                </Field>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-zinc-900 text-white hover:bg-zinc-800" disabled={saving}>
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}
      </PageHeader>

      {loading ? (
        <LoadingState />
      ) : error || !place ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <div className="mono-card p-5">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Details
              </h2>
              <p className="whitespace-pre-wrap text-sm text-foreground/80">
                {place.description || "No description provided."}
              </p>
            </div>
            <div className="mono-card p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Photos ({place.images.length})
              </h2>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {place.images.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${src}-${i}`}
                    src={src}
                    alt={`${place.name} ${i + 1}`}
                    loading="lazy"
                    className="aspect-square w-full rounded-lg border border-border object-cover"
                  />
                ))}
              </div>
            </div>
            <div className="mono-card p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Specific guides ({place.specificguide?.length ?? 0})
              </h2>
              {place.specificguide && place.specificguide.length > 0 ? (
                <ul className="divide-y divide-border">
                  {place.specificguide.map((g) => (
                    <li key={g.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="flex items-center gap-3">
                        <ImageThumb src={g.profile_pic} alt={g.full_name} />
                        <span className="text-sm font-medium">{g.full_name}</span>
                      </div>
                      <Badge variant="outline">{g.rating ? `${g.rating} ★` : "No rating"}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No specific guides assigned.</p>
              )}
            </div>
            <div className="mono-card p-5">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Common guides ({place.commonGuidePlaces?.length ?? 0})
              </h2>
              {place.commonGuidePlaces && place.commonGuidePlaces.length > 0 ? (
                <ul className="divide-y divide-border">
                  {place.commonGuidePlaces.map(({ commonGuide: g }) => (
                    <li key={g.id} className="flex items-center justify-between gap-3 py-2">
                      <div className="flex items-center gap-3">
                        <ImageThumb src={g.profile_pic} alt={g.full_name} />
                        <span className="text-sm font-medium">{g.full_name}</span>
                      </div>
                      <Badge variant="outline">{g.rating ? `${g.rating} ★` : "No rating"}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Not part of any common guide.</p>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="mono-card space-y-3 p-5 text-sm">
              <InfoRow label="Category" value={place.category || "—"} />
              <InfoRow label="Entry fee" value={formatCurrency(place.entryfee)} />
              <InfoRow label="Created" value={formatDate(place.createdAt)} />
              <InfoRow label="Updated" value={formatDate(place.updatedAt)} />
            </div>
            <div className="mono-card space-y-3 p-5 text-sm">
              <InfoRow
                label="Coordinates"
                value={`${place.latitude?.toFixed(4) ?? "—"}, ${place.longitude?.toFixed(4) ?? "—"}`}
              />
              <InfoRow
                label="Location"
                value={[place.district?.name, place.district?.state?.name]
                  .filter(Boolean)
                  .join(", ") || "—"}
              />
              <InfoRow
                label="Saved by"
                value={String(place._count?.user_fav_place ?? 0)}
              />
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function trimNum(v: string | number): number | "" {
  return v === "" || v === null || v === undefined ? "" : Number(v);
}