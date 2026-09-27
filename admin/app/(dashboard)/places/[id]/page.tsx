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
import { PlacePhotosField, photosFromUrls, type PlacePhoto } from "@/components/admin/place-photos-field";
import { patchJSON } from "@/lib/api/mutate";
import { describeUploadError, uploadImage } from "@/lib/api/upload";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { cn, formatCurrency, formatDate, parseGoogleMapsUrl } from "@/lib/utils";
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
  const [mapsUrl, setMapsUrl] = React.useState("");
  const [photos, setPhotos] = React.useState<PlacePhoto[]>([]);
  const mapsCoordinates = React.useMemo(() => parseGoogleMapsUrl(mapsUrl), [mapsUrl]);

  React.useEffect(() => {
    if (!data?.place) return;
    const p = data.place;
    setName(p.name);
    setDescription(p.description);
    setCategory(p.category);
    setEntryfee(p.entryfee === null ? "" : String(p.entryfee));
    setMapsUrl("");
    setPhotos(photosFromUrls(p.images ?? []));
  }, [data]);

  const place = data?.place;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!place) return;
    const fee = entryfee.trim() === "" ? null : Number(entryfee);
    if (fee !== null && (!Number.isFinite(fee) || fee < 0)) {
      toast.error("Entry fee must be zero or greater");
      return;
    }
    if (mapsUrl.trim() && !mapsCoordinates) {
      toast.error("Could not determine coordinates from this Google Maps link.");
      return;
    }
    let imageList: string[];
    try {
      imageList = await Promise.all(
        photos.map(async (photo) => {
          if (!photo.file) return photo.url;
          try {
            return (await uploadImage(photo.file, "places")).url;
          } catch (error) {
            throw new Error(`Image upload failed: ${describeUploadError(error)}`);
          }
        })
      );
    } catch (error) {
      toast.error("Update failed", { description: error instanceof Error ? error.message : undefined });
      return;
    }
    const body: Record<string, unknown> = {
      ...(name !== place.name ? { name } : {}),
      ...(description !== place.description ? { description } : {}),
      ...(category !== place.category ? { category } : {}),
      ...(fee !== place.entryfee ? { entryfee: fee } : {}),
      ...(mapsCoordinates && (mapsCoordinates.latitude !== place.latitude || mapsCoordinates.longitude !== place.longitude)
        ? { latitude: mapsCoordinates.latitude, longitude: mapsCoordinates.longitude }
        : {}),
      ...(imageList.length !== (place.images ?? []).length || imageList.some((image, index) => image !== place.images[index])
        ? { images: imageList }
        : {}),
    };
    if (Object.keys(body).length === 0) {
      toast.info("No changes to save");
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      await patchJSON(`/admin/api/places/${place.id}`, body);
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
                  <Field label="State">
                    <Input value={place.district?.state?.name ?? "—"} readOnly />
                  </Field>
                  <Field label="District">
                    <Input value={place.district?.name ?? "—"} readOnly />
                  </Field>
                  <Field label="Category">
                    <Input value={category} onChange={(e) => setCategory(e.target.value)} />
                  </Field>
                  <Field label="Entry fee (₹)">
                    <Input type="number" min="0" step="any" value={entryfee} onChange={(e) => setEntryfee(e.target.value)} />
                  </Field>
                  <Field label="Google Maps Location" className="sm:col-span-2">
                    <Input
                      type="url"
                      value={mapsUrl}
                      onChange={(e) => setMapsUrl(e.target.value)}
                      placeholder="Paste a Google Maps location link to update coordinates"
                    />
                    {mapsCoordinates ? (
                      <div role="status" className="space-y-0.5 text-xs text-emerald-600">
                        <p className="font-medium">Location detected</p>
                        <p>Latitude: {mapsCoordinates.latitude}</p>
                        <p>Longitude: {mapsCoordinates.longitude}</p>
                      </div>
                    ) : mapsUrl.trim() ? (
                      <p role="alert" className="text-xs text-destructive">Could not determine coordinates from this Google Maps link.</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Saved coordinates: {place.latitude}, {place.longitude}
                      </p>
                    )}
                  </Field>
                </div>
                <Field label="Description">
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
                </Field>
                <Field label="Photos">
                  <PlacePhotosField value={photos} onChange={setPhotos} />
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
  tooltip,
  className,
}: {
  label: string;
  children: React.ReactNode;
  tooltip?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1">
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
        {tooltip ? (
          <span className="text-[10px] text-muted-foreground/60">({tooltip})</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
