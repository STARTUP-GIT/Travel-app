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
import { submitGuidePlace, resolveGuidePlaceLocation, uploadPlacePhoto } from "@/features/provider/api/provider.actions";
import type {
  ManageablePlace,
  PlacePricingBand,
  PlaceVisitor,
} from "@/features/provider/types";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const NAME_LIMIT = 120;
const DESCRIPTION_LIMIT = 2000;
const CATEGORY_LIMIT = 60;
const MAX_PHOTOS = 6;

/**
 * The categories a place can be filed under.
 *
 * `place.category` is a single text column across every place, so the same
 * string is stored and shown by the admin panel, this form and the customer
 * place page alike — the value is the shared contract, not a picklist.
 *
 * These are the categories the existing places already use, offered as choices
 * so a guide does not invent a near-duplicate ("heritage site" next to
 * "heritage"). The field stays editable for anything genuinely new: a tourist
 * attraction can be something this list has never seen, and blocking that would
 * lose the place rather than normalise it.
 */
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

/** Offered as starting bands; the labels are editable, so this is not a fixed set. */
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

/** The coordinates a place is stored with, as the link resolver returns them. */
type ResolvedCoordinates = { latitude: number; longitude: number };

type FormState = {
  name: string;
  description: string;
  category: string;
  /** Left as text so a half-typed number is not rewritten to "NaN" mid-keystroke. */
  entryfee: string;
  /**
   * The guide pastes a Google Maps link here; the coordinates are derived from it
   * and are never typed. They live outside `FormState` because they are resolved
   * output, not something the guide edits — see `resolved`.
   */
  mapsUrl: string;
  photos: Photo[];
  pricing: PlacePricingBand[];
};

/** Falls back to the flat fee for a place that has no bands. */
function priceLabel(bands: PlacePricingBand[], flat: number | null): string {
  if (bands.length > 0) {
    const cheapest = Math.min(...bands.map((band) => band.amount));
    const dearest = Math.max(...bands.map((band) => band.amount));
    return cheapest === dearest
      ? `${formatCurrency(cheapest)} entry`
      : `From ${formatCurrency(cheapest)} entry`;
  }
  return flat === null ? "Free entry" : `${formatCurrency(flat)} entry`;
}

function initialState(): FormState {
  return {
    name: "",
    description: "",
    category: "",
    entryfee: "",
    mapsUrl: "",
    photos: [],
    pricing: [],
  };
}

type Errors = Partial<Record<keyof FormState, string>>;

const INVALID_MAPS_LINK = "Please enter a valid Google Maps location link.";

/**
 * Validates the form exactly once, at the point of saving, and reports every
 * problem together. Checking each keystroke would flag a half-typed price, which
 * reads as the form refusing input.
 *
 * The location is not checked here: it has no field of its own any more, so it is
 * gated at the point of saving, where a missing or unresolved link is reported
 * with the rest of the problems.
 */
function validate(state: FormState, hasFlatFee: boolean): Errors {
  const errors: Errors = {};

  if (state.name.trim().length < 2) {
    errors.name = "Give the place a name of at least 2 characters.";
  }
  if (state.description.trim().length < 10) {
    errors.description = "Describe the place in at least 10 characters.";
  }
  if (state.category.trim().length === 0) {
    errors.category = "Choose or type a category.";
  } else if (state.category.trim().length > CATEGORY_LIMIT) {
    errors.category = `Keep the category under ${CATEGORY_LIMIT} characters.`;
  }

  // The flat fee is only a question when there are no bands, because bands are
  // then the only prices a customer is shown.
  if (hasFlatFee && state.entryfee.trim() !== "") {
    const fee = Number(state.entryfee);
    if (!Number.isFinite(fee) || fee < 0) {
      errors.entryfee = "Enter a price of zero or more, or leave it empty if entry is free.";
    }
  }

  const seen = new Set<string>();
  state.pricing.forEach((band, index) => {
    const key = `${band.visitor}:${band.ageGroup.trim().toLowerCase()}`;
    if (band.ageGroup.trim().length === 0) {
      errors.pricing = "Every price row needs an age group.";
      return;
    }
    if (!Number.isFinite(band.amount) || band.amount < 0) {
      errors.pricing = "Every price must be zero or more.";
      return;
    }
    if (seen.has(key)) {
      errors.pricing = `“${band.ageGroup.trim()}” is listed twice for ${VISITOR_LABEL[band.visitor].toLowerCase()} visitors.`;
      return;
    }
    seen.add(key);
    void index;
  });

  return errors;
}

/**
 * Create a place from inside the tour-package form.
 *
 * A full place form rather than a name-and-district shortcut: a place created
 * here is a real place that travellers can open, so it needs the same description,
 * category, photos, location and pricing the admin panel collects. The backend is
 * the existing `places/submit` route, so the normal approval rules apply
 * unchanged.
 *
 * The created place is handed straight back so the caller can select it — the
 * point of creating it from here is to use it in the package being edited, which
 * works even when the place is still awaiting review because the guide may use
 * their own place immediately.
 */
export function CreatePlaceDialog({
  open,
  onOpenChange,
  districtId,
  districtName,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pre-selected and not editable: a package's place is picked per district. */
  districtId: string;
  districtName: string;
  onCreated: (place: ManageablePlace) => void;
}) {
  const [state, setState] = React.useState<FormState>(initialState);
  const [errors, setErrors] = React.useState<Errors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  /**
   * The link's coordinates, kept with the exact link they came from. Any edit to
   * the link drops them, so a place can never be saved with coordinates belonging
   * to a link the guide has since replaced.
   */
  const [resolved, setResolved] = React.useState<
    ({ url: string } & ResolvedCoordinates) | null
  >(null);
  const [resolvingLocation, setResolvingLocation] = React.useState(false);
  const [locationResolutionFailed, setLocationResolutionFailed] = React.useState(false);

  const hasBands = state.pricing.length > 0;
  /** Only the coordinates matching the link currently in the field may be used. */
  const coordinates = resolved?.url === state.mapsUrl.trim() ? resolved : null;

  // A draft that survives closing the dialog: reopening the form should not
  // silently discard a half-written description and photos.
  const reset = React.useCallback(() => {
    setState(initialState());
    setErrors({});
    setFormError(null);
    setResolved(null);
    setLocationResolutionFailed(false);
  }, []);

  // Resolves the pasted link through the same backend the admin place form uses,
  // debounced so a link that is still being pasted is not fetched once per
  // character, and discarding a stale answer so a slow reply cannot overwrite a
  // newer link's coordinates.
  React.useEffect(() => {
    const url = state.mapsUrl.trim();
    setResolved(null);
    setLocationResolutionFailed(false);
    setResolvingLocation(false);
    if (!url) return;

    let active = true;
    const timeout = window.setTimeout(() => {
      setResolvingLocation(true);
      void resolveGuidePlaceLocation(url).then((result) => {
        if (!active) return;
        setResolvingLocation(false);
        if (!result.ok) {
          setLocationResolutionFailed(true);
          return;
        }
        if (!result.data) {
          setLocationResolutionFailed(true);
          return;
        }
        setResolved({ url, ...result.data });
      });
    }, 500);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [state.mapsUrl]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined, pricing: undefined }));
    setFormError(null);
  }

  function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    setState((previous) => {
      const room = MAX_PHOTOS - previous.photos.length;
      const next = Array.from(files)
        .slice(0, Math.max(room, 0))
        .map((file) => ({ file, url: "" }));
      return { ...previous, photos: [...previous.photos, ...next] };
    });
  }

  function removePhoto(index: number) {
    setState((previous) => ({
      ...previous,
      photos: previous.photos.filter((_, at) => at !== index),
    }));
  }

  function addBand(visitor: PlaceVisitor = "DOMESTIC") {
    setState((previous) => ({
      ...previous,
      // Seeded from the first domestic suggestion so the row is immediately
      // usable; the label itself stays editable.
      pricing: [
        ...previous.pricing,
        { visitor, ageGroup: AGE_GROUP_SUGGESTIONS[0], amount: 0 },
      ],
    }));
  }

  function updateBand(index: number, patch: Partial<PlacePricingBand>) {
    setState((previous) => ({
      ...previous,
      pricing: previous.pricing.map((band, at) =>
        at === index ? { ...band, ...patch } : band
      ),
    }));
    setErrors((previous) => ({ ...previous, pricing: undefined }));
  }

  function removeBand(index: number) {
    setState((previous) => ({
      ...previous,
      pricing: previous.pricing.filter((_, at) => at !== index),
    }));
  }

  async function save() {
    const found = validate(state, !hasBands);
    // The coordinates have no field of their own, so the location is gated here
    // rather than in `validate`: a link that did not resolve is reported with the
    // rest of the problems, and saving stops before anything is written.
    const location = coordinates;
    if (!location) {
      setErrors({ ...found, mapsUrl: INVALID_MAPS_LINK });
      toast.error("Please fix the highlighted fields");
      return;
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      toast.error("Please fix the highlighted fields");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      // Photos go up first: the place row needs its image URLs, and an upload
      // failure is worth reporting before anything is written.
      const images: string[] = [];
      for (const photo of state.photos) {
        if (photo.url) {
          images.push(photo.url);
          continue;
        }
        if (!photo.file) continue;
        setUploading(true);
        const uploaded = await uploadPlacePhoto(photo.file);
        setUploading(false);
        if (!uploaded.ok) {
          setFormError(uploaded.message);
          toast.error(uploaded.message);
          return;
        }
        images.push(uploaded.data);
      }

      const result = await submitGuidePlace({
        name: state.name.trim(),
        description: state.description.trim(),
        districtId,
        images,
        entryfee: hasBands
          ? null
          : state.entryfee.trim() === ""
            ? null
            : Number(state.entryfee),
        category: state.category.trim(),
        // Resolved from the pasted link by the same resolver the admin form uses;
        // the create payload is unchanged, so the place row still stores the two
        // numbers it always did.
        latitude: location.latitude,
        longitude: location.longitude,
        // With no bands the field is left off entirely, so the place is stored as
        // a normal single-price place.
        ...(hasBands ? { pricing: state.pricing } : {}),
      });

      if (!result.ok) {
        setFormError(result.message);
        toast.error(result.message);
        return;
      }

      const created = result.data;
      onCreated(created);
      reset();
      onOpenChange(false);
      toast.success(
        created.status === "APPROVED"
          ? "Place added to this package"
          : "Place saved — it is awaiting review, and you can use it in this package now"
      );
    } finally {
      setUploading(false);
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a new place</DialogTitle>
          <DialogDescription>
            This creates a real place travellers can open, in {districtName}. It
            is added to your package straight away; if your district reviews new
            places, it becomes publicly visible once approved.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="place-name">Place name</Label>
            <Input
              id="place-name"
              value={state.name}
              maxLength={NAME_LIMIT}
              onChange={(event) => set("name", event.target.value)}
              placeholder="Mysore Palace"
            />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="place-description">Description</Label>
            <Textarea
              id="place-description"
              value={state.description}
              maxLength={DESCRIPTION_LIMIT}
              rows={4}
              onChange={(event) => set("description", event.target.value)}
              placeholder="What is here, what makes it worth visiting, and how long a visit takes."
            />
            {errors.description ? (
              <p className="text-xs text-destructive">{errors.description}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="place-category">Category</Label>
            <Select
              value={CATEGORY_OPTIONS.includes(state.category as never) ? state.category : undefined}
              onValueChange={(value) => set("category", value)}
            >
              <SelectTrigger id="place-category">
                <SelectValue placeholder="Choose a category, or type one below" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              value={state.category}
              maxLength={CATEGORY_LIMIT}
              onChange={(event) => set("category", event.target.value)}
              placeholder="Or type your own category"
              aria-label="Category"
            />
            {errors.category ? (
              <p className="text-xs text-destructive">{errors.category}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Used to group the place for travellers, so matching an existing
                category keeps it easy to find.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Entry pricing</Label>
              {hasBands ? (
                <Badge variant="outline">Per band</Badge>
              ) : (
                <Badge variant="outline">One price</Badge>
              )}
            </div>

            {!hasBands ? (
              <div className="flex flex-col gap-1.5">
                <Input
                  value={state.entryfee}
                  inputMode="decimal"
                  onChange={(event) => set("entryfee", event.target.value)}
                  placeholder="Leave empty if entry is free"
                  aria-label="Entry price"
                />
                {errors.entryfee ? (
                  <p className="text-xs text-destructive">{errors.entryfee}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    A single price for everyone. Leave empty for free entry.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {state.pricing.map((band, index) => (
                  <div key={`${band.visitor}-${index}`} className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Select
                        value={band.visitor}
                        onValueChange={(value) =>
                          updateBand(index, { visitor: value as PlaceVisitor })
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
                        list="place-age-groups"
                        onChange={(event) =>
                          updateBand(index, { ageGroup: event.target.value })
                        }
                        placeholder="Age group"
                        aria-label={`Age group ${index + 1}`}
                        className="flex-1"
                      />
                      <Input
                        value={Number.isFinite(band.amount) ? String(band.amount) : ""}
                        inputMode="decimal"
                        onChange={(event) =>
                          updateBand(index, { amount: Number(event.target.value) })
                        }
                        placeholder="0"
                        aria-label={`Price for ${band.ageGroup || `band ${index + 1}`}`}
                        className="w-28 shrink-0"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={`Remove ${band.ageGroup || "price row"}`}
                        onClick={() => removeBand(index)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
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

                <p className="text-xs text-muted-foreground">
                  Prices vary by age group and visitor type. These replace the
                  single price, so leave the rows out if one price covers
                  everyone.
                </p>
              </div>
            )}

            {errors.pricing ? (
              <p className="text-xs text-destructive">{errors.pricing}</p>
            ) : null}

            <datalist id="place-age-groups">
              {AGE_GROUP_SUGGESTIONS.map((group) => (
                <option key={group} value={group} />
              ))}
            </datalist>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Photos</Label>
            <label
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground transition-colors",
                "hover:bg-accent"
              )}
            >
              <ImagePlus className="size-4" />
              {state.photos.length === 0
                ? "Add photos of the place"
                : `${state.photos.length} of ${MAX_PHOTOS} added`}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                className="sr-only"
                onChange={(event) => {
                  addPhotos(event.target.files);
                  event.target.value = "";
                }}
              />
            </label>
            {state.photos.length > 0 ? (
              <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {state.photos.map((photo, index) => (
                  <li
                    key={`${photo.url}-${index}`}
                    className="relative aspect-square overflow-hidden rounded-xl border border-border"
                  >
                    {photo.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo.url}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center text-xs text-muted-foreground">
                        {photo.file?.name ?? "Photo"}
                      </span>
                    )}
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      aria-label={`Remove photo ${index + 1}`}
                      onClick={() => removePhoto(index)}
                      className="absolute right-1 top-1 size-6 p-0"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">
                Optional, but places with photos get far more bookings.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="place-maps-url" className="flex items-center gap-1.5">
              <MapPin className="size-3.5" />
              Google Maps location
            </Label>
            <Input
              id="place-maps-url"
              type="url"
              value={state.mapsUrl}
              onChange={(event) => set("mapsUrl", event.target.value)}
              placeholder="Paste a Google Maps link"
            />
            {resolvingLocation ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Resolving Google Maps link…
              </p>
            ) : coordinates ? (
              <p className="text-xs text-emerald-600">Location detected</p>
            ) : errors.mapsUrl ? (
              <p className="text-xs text-destructive">{errors.mapsUrl}</p>
            ) : locationResolutionFailed ? (
              <p className="text-xs text-destructive">{INVALID_MAPS_LINK}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Share the place on Google Maps, copy the link, and paste it here —
                the coordinates are filled in from it.
              </p>
            )}
          </div>

          {formError ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {formError}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            {/* Mirrors what the customer place page will show, so a guide can see
                the consequence of the pricing they just entered. */}
            <span>
              Customers see{" "}
              {priceLabel(
                hasBands
                  ? state.pricing
                  : state.entryfee.trim() === ""
                    ? []
                    : [{ visitor: "DOMESTIC", ageGroup: "", amount: Number(state.entryfee) }],
                !hasBands && state.entryfee.trim() !== ""
                  ? Number(state.entryfee)
                  : null
              ).toLowerCase()}
              .
            </span>
            {uploading ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="size-3.5 animate-spin" />
                Uploading photos…
              </span>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={saving || uploading || resolvingLocation || !coordinates}
            onClick={save}
          >
            {saving ? "Creating…" : "Create place"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
