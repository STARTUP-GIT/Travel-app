"use client";

import { ImagePlus, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  editGuidePlace,
  resolveGuidePlaceLocation,
  uploadPlacePhoto,
} from "@/features/provider/api/provider.actions";
import type {
  ManageablePlace,
  PlacePricingBand,
  PlaceVisitor,
} from "@/features/provider/types";
import { formatCurrency, cn } from "@/lib/utils";

const NAME_LIMIT = 120;
const DESCRIPTION_LIMIT = 2000;
const CATEGORY_LIMIT = 60;
const MAX_PHOTOS = 6;

const CATEGORY_OPTIONS = [
  "Heritage",
  "Historical Site",
  "Nature",
  "Wildlife",
  "Beach",
  "Temple",
  "Adventure",
  "Waterfall",
  "Museum",
  "Art & Culture",
  "Pilgrimage",
  "Garden",
  "Hill Station",
  "Dam",
  "Lake",
  "Park",
] as const;

const AGE_GROUP_SUGGESTIONS = [
  "Adult",
  "Child",
  "Infant",
  "Senior Citizen",
  "Student",
] as const;

const VISITOR_LABEL: Record<PlaceVisitor, string> = {
  DOMESTIC: "Domestic",
  FOREIGN: "Foreign",
};

type Photo = { file: File | null; url: string };
type ResolvedCoordinates = { latitude: number; longitude: number };

type FormState = {
  name: string;
  description: string;
  category: string;
  entryfee: string;
  mapsUrl: string;
  photos: Photo[];
  pricing: PlacePricingBand[];
};

type Errors = {
  name?: string;
  description?: string;
  category?: string;
  entryfee?: string;
  pricing?: string;
  mapsUrl?: string;
};

const INVALID_MAPS_LINK =
  "Could not read coordinates from this link. Open the place on Google Maps and share its link here.";

function validate(state: FormState, requireFeeNumber: boolean): Errors {
  const errors: Errors = {};

  if (!state.name.trim()) {
    errors.name = "Enter a place name.";
  } else if (state.name.trim().length > NAME_LIMIT) {
    errors.name = `Name must be ${NAME_LIMIT} characters or fewer.`;
  }

  if (!state.description.trim()) {
    errors.description = "Tell travellers what is here.";
  } else if (state.description.trim().length > DESCRIPTION_LIMIT) {
    errors.description = `Description must be ${DESCRIPTION_LIMIT} characters or fewer.`;
  }

  if (!state.category.trim()) {
    errors.category = "Pick or enter a category.";
  } else if (state.category.trim().length > CATEGORY_LIMIT) {
    errors.category = `Category must be ${CATEGORY_LIMIT} characters or fewer.`;
  }

  if (requireFeeNumber && state.entryfee.trim() !== "") {
    const fee = Number(state.entryfee);
    if (!Number.isFinite(fee) || fee < 0) {
      errors.entryfee = "Enter a valid positive price, or leave empty for free.";
    }
  }

  const seen = new Set<string>();
  state.pricing.forEach((band) => {
    if (!band.ageGroup.trim()) {
      errors.pricing = "Every price row needs an age group label.";
      return;
    }
    if (!Number.isFinite(band.amount) || band.amount < 0) {
      errors.pricing = "Every price row needs a valid positive amount.";
      return;
    }
    const key = `${band.visitor}:${band.ageGroup.trim().toLowerCase()}`;
    if (seen.has(key)) {
      errors.pricing = `“${band.ageGroup.trim()}” is listed twice for ${VISITOR_LABEL[band.visitor].toLowerCase()} visitors.`;
      return;
    }
    seen.add(key);
  });

  return errors;
}

export function EditPlaceDialog({
  place,
  open,
  onOpenChange,
  onUpdated,
}: {
  place: ManageablePlace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (place: ManageablePlace) => void;
}) {
  const [state, setState] = React.useState<FormState>({
    name: "",
    description: "",
    category: "",
    entryfee: "",
    mapsUrl: "",
    photos: [],
    pricing: [],
  });
  const [customCategory, setCustomCategory] = React.useState(false);
  const [errors, setErrors] = React.useState<Errors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  const [resolved, setResolved] = React.useState<
    ({ url: string } & ResolvedCoordinates) | null
  >(null);
  const [resolvingLocation, setResolvingLocation] = React.useState(false);
  const [locationResolutionFailed, setLocationResolutionFailed] = React.useState(false);

  React.useEffect(() => {
    if (place && open) {
      const isCustom = !CATEGORY_OPTIONS.includes(
        place.category as (typeof CATEGORY_OPTIONS)[number]
      );
      setState({
        name: place.name || "",
        description: place.description || "",
        category: place.category || "",
        entryfee:
          typeof place.entryfee === "number" && place.entryfee > 0
            ? String(place.entryfee)
            : "",
        mapsUrl: "",
        photos: (place.images || []).map((url) => ({ file: null, url })),
        pricing: place.pricing || [],
      });
      setCustomCategory(isCustom);
      setErrors({});
      setFormError(null);
      setResolved(
        typeof place.latitude === "number" && typeof place.longitude === "number"
          ? { url: "", latitude: place.latitude, longitude: place.longitude }
          : null
      );
    }
  }, [place, open]);

  const hasBands = state.pricing.length > 0;
  const coordinates =
    state.mapsUrl.trim() && resolved?.url === state.mapsUrl.trim()
      ? resolved
      : resolved?.url === ""
      ? resolved
      : null;

  React.useEffect(() => {
    const raw = state.mapsUrl.trim();
    if (!raw) {
      setLocationResolutionFailed(false);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setResolvingLocation(true);
      setLocationResolutionFailed(false);
      try {
        const result = await resolveGuidePlaceLocation(raw);
        if (cancelled) return;
        if (result.ok && result.data) {
          setResolved({ url: raw, ...result.data });
        } else {
          setResolved(null);
          setLocationResolutionFailed(true);
        }
      } catch {
        if (!cancelled) {
          setResolved(null);
          setLocationResolutionFailed(true);
        }
      } finally {
        if (!cancelled) setResolvingLocation(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [state.mapsUrl]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
    if (errors[key as keyof Errors]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  }

  function addPhotos(files: FileList | null) {
    if (!files) return;
    const remaining = MAX_PHOTOS - state.photos.length;
    if (remaining <= 0) {
      toast.error(`A place can have at most ${MAX_PHOTOS} photos.`);
      return;
    }

    const next: Photo[] = Array.from(files)
      .slice(0, remaining)
      .map((file) => ({ file, url: URL.createObjectURL(file) }));

    setState((prev) => ({ ...prev, photos: [...prev.photos, ...next] }));
  }

  function removePhoto(index: number) {
    setState((prev) => {
      const removed = prev.photos[index];
      if (removed?.file && removed.url.startsWith("blob:")) {
        URL.revokeObjectURL(removed.url);
      }
      return {
        ...prev,
        photos: prev.photos.filter((_, at) => at !== index),
      };
    });
  }

  function addBand(visitor: PlaceVisitor) {
    setState((prev) => ({
      ...prev,
      pricing: [...prev.pricing, { visitor, ageGroup: "", amount: 0 }],
    }));
  }

  function updateBand(index: number, patch: Partial<PlacePricingBand>) {
    setState((prev) => ({
      ...prev,
      pricing: prev.pricing.map((band, at) =>
        at === index ? { ...band, ...patch } : band
      ),
    }));
  }

  function removeBand(index: number) {
    setState((prev) => ({
      ...prev,
      pricing: prev.pricing.filter((_, at) => at !== index),
    }));
  }

  async function save() {
    if (!place) return;
    const found = validate(state, !hasBands);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      toast.error("Please fix the highlighted fields");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const images: string[] = [];
      for (const photo of state.photos) {
        if (photo.file) {
          setUploading(true);
          const uploaded = await uploadPlacePhoto(photo.file);
          setUploading(false);
          if (!uploaded.ok) {
            setFormError(uploaded.message);
            toast.error(uploaded.message);
            return;
          }
          images.push(uploaded.data);
          continue;
        }
        if (photo.url) {
          images.push(photo.url);
        }
      }

      const result = await editGuidePlace(place.id, {
        name: state.name.trim(),
        description: state.description.trim(),
        images,
        entryfee: hasBands
          ? null
          : state.entryfee.trim() === ""
          ? null
          : Number(state.entryfee),
        category: state.category.trim(),
        ...(coordinates
          ? { latitude: coordinates.latitude, longitude: coordinates.longitude }
          : {}),
        pricing: hasBands ? state.pricing : [],
      });

      if (!result.ok) {
        setFormError(result.message);
        toast.error(result.message);
        return;
      }

      onUpdated(result.data);
      onOpenChange(false);
      toast.success("Place updated successfully");
    } finally {
      setUploading(false);
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit place</DialogTitle>
          <DialogDescription>
            Update details for {place?.name || "this place"}.
            {place?.district?.name ? ` Located in ${place.district.name}.` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-place-name">Place name</Label>
            <Input
              id="edit-place-name"
              value={state.name}
              maxLength={NAME_LIMIT}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Place name"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-place-description">Description</Label>
            <Textarea
              id="edit-place-description"
              value={state.description}
              maxLength={DESCRIPTION_LIMIT}
              rows={4}
              onChange={(e) => set("description", e.target.value)}
              placeholder="What makes this place worth visiting"
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-place-category">Category</Label>
            {!customCategory ? (
              <div className="flex flex-col gap-2">
                <Select
                  value={state.category}
                  onValueChange={(val) => set("category", val)}
                >
                  <SelectTrigger id="edit-place-category">
                    <SelectValue placeholder="Pick a category" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {CATEGORY_OPTIONS.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  className="w-fit"
                  onClick={() => {
                    set("category", "");
                    setCustomCategory(true);
                  }}
                >
                  Use custom category
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Input
                  value={state.category}
                  maxLength={CATEGORY_LIMIT}
                  onChange={(e) => set("category", e.target.value)}
                  placeholder="Custom category"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-fit"
                  onClick={() => {
                    set("category", "");
                    setCustomCategory(false);
                  }}
                >
                  Choose existing category
                </Button>
              </div>
            )}
            {errors.category && (
              <p className="text-xs text-destructive">{errors.category}</p>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Entry pricing</Label>
              <Badge variant="outline">
                {hasBands ? "Per band" : "One price"}
              </Badge>
            </div>

            {!hasBands ? (
              <div className="flex flex-col gap-1.5">
                <Input
                  value={state.entryfee}
                  inputMode="decimal"
                  onChange={(e) => set("entryfee", e.target.value)}
                  placeholder="Leave empty if entry is free"
                />
                {errors.entryfee && (
                  <p className="text-xs text-destructive">{errors.entryfee}</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {state.pricing.map((band, idx) => (
                  <div key={`${band.visitor}-${idx}`} className="flex items-center gap-2">
                    <Select
                      value={band.visitor}
                      onValueChange={(val) =>
                        updateBand(idx, { visitor: val as PlaceVisitor })
                      }
                    >
                      <SelectTrigger className="w-32 shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DOMESTIC">Domestic</SelectItem>
                        <SelectItem value="FOREIGN">Foreign</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={band.ageGroup}
                      list="edit-place-age-groups"
                      onChange={(e) =>
                        updateBand(idx, { ageGroup: e.target.value })
                      }
                      placeholder="Age group"
                      className="flex-1"
                    />
                    <Input
                      value={Number.isFinite(band.amount) ? String(band.amount) : ""}
                      inputMode="decimal"
                      onChange={(e) =>
                        updateBand(idx, { amount: Number(e.target.value) })
                      }
                      placeholder="0"
                      className="w-28 shrink-0"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => removeBand(idx)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                ))}

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addBand("DOMESTIC")}
                  >
                    <Plus className="size-3.5" />
                    Domestic price
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addBand("FOREIGN")}
                  >
                    <Plus className="size-3.5" />
                    Foreign price
                  </Button>
                </div>
              </div>
            )}
            {errors.pricing && (
              <p className="text-xs text-destructive">{errors.pricing}</p>
            )}

            <datalist id="edit-place-age-groups">
              {AGE_GROUP_SUGGESTIONS.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Photos</Label>
            <label
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 py-4 text-sm text-muted-foreground transition-colors hover:bg-accent"
              )}
            >
              <ImagePlus className="size-4" />
              {state.photos.length === 0
                ? "Add photos"
                : `${state.photos.length} of ${MAX_PHOTOS} added`}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="sr-only"
                onChange={(e) => {
                  addPhotos(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            {state.photos.length > 0 && (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {state.photos.map((photo, idx) => (
                  <li
                    key={`${photo.url}-${idx}`}
                    className="relative aspect-square overflow-hidden rounded-xl border border-border"
                  >
                    {photo.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo.url} alt="" className="size-full object-cover" />
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => removePhoto(idx)}
                      className="absolute right-1 top-1 size-6 p-0"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="edit-place-maps-url" className="flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              Update Google Maps link (optional)
            </Label>
            <Input
              id="edit-place-maps-url"
              type="url"
              value={state.mapsUrl}
              onChange={(e) => set("mapsUrl", e.target.value)}
              placeholder="Paste a new link to update coordinates"
            />
            {resolvingLocation ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Resolving link…
              </p>
            ) : coordinates ? (
              <p className="text-xs text-emerald-600">
                Coordinates: {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}
              </p>
            ) : locationResolutionFailed ? (
              <p className="text-xs text-destructive">{INVALID_MAPS_LINK}</p>
            ) : null}
          </div>

          {formError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {formError}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            disabled={saving || uploading}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving || uploading}
            onClick={save}
          >
            {saving || uploading ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
