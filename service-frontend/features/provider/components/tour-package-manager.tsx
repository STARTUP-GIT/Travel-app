"use client";

import { Check, MapPin, Pencil, Plus, Route, Trash2, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState } from "@/components/shared/states";
import { LoadingState } from "@/components/shared/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  addTourPackage,
  editTourPackage,
  removeTourPackage,
} from "@/features/provider/api/provider.actions";
import type {
  PackagePlace,
  TourPackage,
  TourPackageInput,
} from "@/features/provider/types";
import { getDistricts } from "@/features/locations/api/locations.api";
import { getPlaces, type Place } from "@/features/places/api/places.api";
import { cn } from "@/lib/utils";
import { useAsync } from "@/lib/hooks/use-async";

const NAME_LIMIT = 80;
const DESCRIPTION_LIMIT = 1000;

type Draft = {
  id: string | null;
  name: string;
  description: string;
  /** Selected ids plus the places already known for them, so the chips can be shown for every district. */
  placeIds: string[];
  places: Record<string, PackagePlace>;
};

function emptyDraft(): Draft {
  return { id: null, name: "", description: "", placeIds: [], places: {} };
}

function draftFrom(pkg: TourPackage): Draft {
  return {
    id: pkg.id,
    name: pkg.name,
    description: pkg.description ?? "",
    placeIds: pkg.places.map((place) => place.id),
    places: Object.fromEntries(pkg.places.map((place) => [place.id, place])),
  };
}

function validate(draft: Draft): string | null {
  if (draft.name.trim().length < 2) return "Give the package a name of at least 2 characters.";
  if (draft.placeIds.length === 0) return "Add at least one place to the package.";
  return null;
}

/**
 * Create / edit / delete for the signed-in tour guide's packages.
 *
 * The list is rendered from server data and every mutation returns the saved
 * record, so the local state is replaced with what the backend actually stored
 * rather than with the form values — the same pattern the profile form uses.
 */
export function TourPackageManager({
  packages,
  unavailable,
}: {
  packages: TourPackage[];
  /** True while the backend has not run the package migration. */
  unavailable: boolean;
}) {
  const [items, setItems] = React.useState<TourPackage[]>(packages);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  if (unavailable) {
    return (
      <ErrorState
        title="Tour packages unavailable"
        description="The service is not ready for tour packages yet. Your existing place coverage is unchanged — please try again shortly."
      />
    );
  }

  async function save() {
    if (!draft) return;

    const problem = validate(draft);
    if (problem) {
      setFormError(problem);
      return;
    }

    const input: TourPackageInput = {
      name: draft.name.trim(),
      description: draft.description,
      placeIds: draft.placeIds,
    };

    setSaving(true);
    setFormError(null);
    try {
      const result = draft.id
        ? await editTourPackage(draft.id, input)
        : await addTourPackage(input);

      if (!result.ok) {
        setFormError(result.message);
        return;
      }

      // The list is ordered by creation date server-side, so a new package goes
      // to the front while an edit keeps the entry where it already was.
      setItems((current) => {
        if (!draft.id) return [result.data, ...current];
        return current.map((pkg) =>
          pkg.id === result.data.id ? result.data : pkg
        );
      });
      setDraft(null);
      toast.success(draft.id ? "Package updated" : "Package created");
    } finally {
      setSaving(false);
    }
  }

  async function remove(packageId: string) {
    setDeletingId(packageId);
    try {
      const result = await removeTourPackage(packageId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setItems((current) => current.filter((pkg) => pkg.id !== packageId));
      toast.success("Package deleted");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">Tour packages</h2>
          <p className="text-xs text-muted-foreground">
            Group the places you cover into named tours. Travellers see a package
            on every place it contains, and your per-day rate still applies.
          </p>
        </div>
        {draft === null ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setFormError(null);
              setDraft(emptyDraft());
            }}
          >
            <Plus className="size-4" />
            New package
          </Button>
        ) : null}
      </div>

      {draft !== null ? (
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-muted/30 p-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="package-name">Package name</Label>
            <Input
              id="package-name"
              value={draft.name}
              maxLength={NAME_LIMIT}
              placeholder="Mysuru heritage walk"
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Shown to travellers as the tour title.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="package-description">What's included (optional)</Label>
            <Textarea
              id="package-description"
              value={draft.description}
              maxLength={DESCRIPTION_LIMIT}
              rows={3}
              placeholder="Palace, market street and a lunch stop, in one morning."
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
            />
          </div>

          <PackagePlacePicker
            draft={draft}
            onChange={(placeIds, places) =>
              setDraft((current) =>
                current ? { ...current, placeIds, places } : current
              )
            }
          />

          {formError ? (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {formError}
            </p>
          ) : null}

          <div className="flex gap-2">
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Saving…" : draft.id ? "Save changes" : "Create package"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => {
                setDraft(null);
                setFormError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {items.length === 0 && draft === null ? (
        <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No packages yet. Create one to bundle places into a tour travellers can
          book.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {items.map((pkg) => (
            <li
              key={pkg.id}
              className="flex flex-col gap-2.5 rounded-2xl border border-border p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="flex items-center gap-1.5 text-sm font-semibold break-words">
                    <Route className="size-4 shrink-0 text-primary" />
                    {pkg.name}
                  </p>
                  {pkg.description ? (
                    <p className="text-xs text-muted-foreground break-words">
                      {pkg.description}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Edit ${pkg.name}`}
                    onClick={() => {
                      setFormError(null);
                      setDraft(draftFrom(pkg));
                    }}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={`Delete ${pkg.name}`}
                        disabled={deletingId === pkg.id}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    }
                    title={`Delete ${pkg.name}?`}
                    description="The package is removed from every place it lists. Places you already cover stay on your profile."
                    confirmLabel="Delete package"
                    onConfirm={() => remove(pkg.id)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {pkg.places.map((place) => (
                  <Badge key={place.id} variant="outline" className="gap-1">
                    <MapPin className="size-3" />
                    {place.name}
                  </Badge>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Adds places to a package, one district at a time.
 *
 * Deliberately not the sign-up `PlacePicker`: that one clears the whole
 * selection when the district changes, which is right for a form that starts
 * empty but would silently wipe the places of a package being edited — a package
 * can legitimately span districts, and the already-picked places are always
 * shown as removable chips instead, whatever district they belong to.
 */
function PackagePlacePicker({
  draft,
  onChange,
}: {
  draft: Draft;
  onChange: (placeIds: string[], places: Record<string, PackagePlace>) => void;
}) {
  const [districtId, setDistrictId] = React.useState("");

  const districts = useAsync(() => getDistricts(), []);

  /**
   * The district the returned list belongs to is carried alongside it, because
   * `useAsync` only flips `isLoading` on its first load and on an explicit
   * refetch — it stays settled while a new dependency list is in flight, which
   * would leave the previous district's places listed under the new district's
   * name. Comparing the two is what keeps a stale list off screen.
   */
  const places = useAsync(
    async (): Promise<{ districtId: string; places: Place[] }> =>
      districtId
        ? { districtId, places: await getPlaces(districtId) }
        : { districtId: "", places: [] },
    [districtId]
  );

  const listed = places.data?.districtId === districtId ? places.data.places : null;

  const selected = new Set(draft.placeIds);

  function toggle(place: PackagePlace) {
    if (selected.has(place.id)) {
      deselect(place.id);
      return;
    }
    onChange([...draft.placeIds, place.id], { ...draft.places, [place.id]: place });
  }

  /**
   * Takes the id rather than the place: a chip can also be removed for a place
   * from another district, whose details this district's list never loaded, so
   * only the id is always on hand.
   */
  function deselect(placeId: string) {
    const known = { ...draft.places };
    delete known[placeId];
    onChange(
      draft.placeIds.filter((id) => id !== placeId),
      known
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="package-district">Add places</Label>

      {draft.placeIds.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {draft.placeIds.map((id) => {
            const place = draft.places[id];
            return (
              <Badge key={id} variant="info" className="gap-1">
                {place?.name ?? "Selected place"}
                {place?.district ? (
                  <span className="text-[0.6rem] opacity-80">
                    {place.district.name}
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-label={`Remove ${place?.name ?? "place"}`}
                  onClick={() => deselect(id)}
                  className="text-primary/70 hover:text-primary"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      ) : null}

      <Select value={districtId} onValueChange={setDistrictId}>
        <SelectTrigger id="package-district" className="w-full">
          <SelectValue placeholder="Select a district to add its places" />
        </SelectTrigger>
        <SelectContent>
          {(districts.data ?? []).map((district) => (
            <SelectItem key={district.id} value={district.id}>
              {district.name}
              {district.state?.name ? `, ${district.state.name}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/*
        `!listed` covers the window right after a district is switched, where the
        hook is neither loading nor holding a matching list, so the spinner is
        shown from the list's own state rather than the hook's.
      */}
      {districtId && !listed && !places.error ? (
        <LoadingState label="Loading places…" />
      ) : null}

      {districtId && places.error ? (
        <ErrorState
          title="Places unavailable"
          description="The place list could not be loaded. Please try again."
          retry={places.refetch}
        />
      ) : null}

      {listed && listed.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          This district has no approved places yet.
        </p>
      ) : null}

      {listed && listed.length > 0 ? (
        <div className="grid max-h-56 gap-2 overflow-y-auto rounded-2xl border border-border p-2">
          {listed.map((place) => {
            const active = selected.has(place.id);
            return (
              <button
                key={place.id}
                type="button"
                role="checkbox"
                aria-checked={active}
                onClick={() =>
                  toggle({
                    id: place.id,
                    name: place.name,
                    images: place.images,
                    category: place.category,
                    district: place.district
                      ? { id: place.district.id, name: place.district.name }
                      : null,
                  })
                }
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                  active ? "bg-primary/10 text-primary" : "hover:bg-accent"
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  )}
                >
                  {active ? <Check className="size-3.5" /> : null}
                </span>
                <span className="min-w-0 flex-1 truncate">{place.name}</span>
                <Badge variant="outline" className="shrink-0 text-[0.6rem]">
                  <MapPin className="size-3" />
                  {place.category}
                </Badge>
              </button>
            );
          })}
        </div>
      ) : null}

      <p className="text-xs text-muted-foreground">
        {draft.placeIds.length === 0
          ? "A package needs at least one place. Switch districts as often as you like — picked places are kept."
          : `${draft.placeIds.length} place${draft.placeIds.length === 1 ? "" : "s"} in this package.`}
      </p>
    </div>
  );
}
