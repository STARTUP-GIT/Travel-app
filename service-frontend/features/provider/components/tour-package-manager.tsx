"use client";

import { Check, MapPin, Pencil, Plus, Route, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ErrorState, EmptyState } from "@/components/shared/states";
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
 *
 * `error` is a real service failure and nothing else: a guide with no packages
 * passes `null` and sees the empty state, so a fresh account is never told the
 * feature is unavailable.
 */
export function TourPackageManager({
  packages,
  error,
}: {
  packages: TourPackage[];
  /** The service failure that stopped the list from loading, if there was one. */
  error: string | null;
}) {
  const [items, setItems] = React.useState<TourPackage[]>(packages);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  // `router.refresh()` re-runs the server component, which re-reads the package
  // list; the pending transition is what the loading state is driven from.
  const router = useRouter();
  const [refreshing, startRefresh] = React.useTransition();
  const retrying = refreshing;

  function openCreate() {
    setFormError(null);
    setDraft(emptyDraft());
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

  function createButton() {
    return (
      <Button type="button" onClick={openCreate}>
        <Plus className="size-4" />
        Create package
      </Button>
    );
  }

  if (error !== null) {
    /*
     * Reached only when the package service really failed. Retrying re-runs the
     * server component, so a transient failure recovers without the guide having
     * to sign in again.
     */
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-sm font-semibold">Tour packages</h2>
        {retrying ? (
          <LoadingState label="Loading tour packages…" />
        ) : (
          <ErrorState
            title="Tour packages unavailable"
            description={`${error} Your existing place coverage is unchanged.`}
            retry={() => startRefresh(() => router.refresh())}
          />
        )}
      </div>
    );
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
        {draft === null ? createButton() : null}
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

      {/*
        Zero packages is a normal, valid state for a Common Guide — the sign-up
        form lets a guide register without a place — so it gets a real empty state
        with the same create action, not a service error.
      */}
      {items.length === 0 && draft === null ? (
        <EmptyState
          className="p-8"
          icon={Route}
          title="No tour packages yet"
          description="Create packages by grouping the places you cover into tours. Every place in a package is also added to your coverage."
          action={createButton()}
        />
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

      {/* A Common Guide may own any number of packages, so the create action
          stays reachable at the end of the list as well as at the top. */}
      {items.length > 0 && draft === null ? (
        <div className="flex justify-center pt-1">{createButton()}</div>
      ) : null}
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
