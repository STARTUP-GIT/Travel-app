"use client";

import { Check, ExternalLink, MapPin, Pencil, Plus, Route, Trash2, X } from "lucide-react";
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
  loadManageablePlaces,
  removeTourPackage,
} from "@/features/provider/api/provider.actions";
import type {
  ManageablePlace,
  PackagePlace,
  TourPackage,
  TourPackageInput,
} from "@/features/provider/types";
import { getDistricts } from "@/features/locations/api/locations.api";
import { CreatePlaceDialog } from "@/features/places/components/create-place-dialog";
import { cn } from "@/lib/utils";
import { useAsync } from "@/lib/hooks/use-async";

const NAME_LIMIT = 80;
const DESCRIPTION_LIMIT = 1000;

type Draft = {
  id: string | null;
  name: string;
  description: string;
  pricingMode: "WHOLE_TOUR" | "PLACE_BASED";
  pricingUnit: "PER_TOUR" | "PER_PERSON";
  price: number;
  allowCustomerPlaceSelection: boolean;
  cancellationPolicy: string;
  foodStatus: string;
  foodDetails: string;
  transportStatus: string;
  transportDetails: string;
  entryFeeStatus: string;
  entryFeeDetails: string;
  additionalCostsDetails: string;
  tripStartTime: string;
  pickupName: string;
  pickupAddress: string;
  pickupMapsUrl: string;
  placeIds: string[];
  placePrices: Record<string, number>;
  places: Record<string, PackagePlace>;
};

function emptyDraft(): Draft {
  return {
    id: null,
    name: "",
    description: "",
    pricingMode: "WHOLE_TOUR",
    pricingUnit: "PER_TOUR",
    price: 0,
    allowCustomerPlaceSelection: true,
    cancellationPolicy: "Free cancellation up to 24h before trip start",
    foodStatus: "EXCLUDED",
    foodDetails: "",
    transportStatus: "EXCLUDED",
    transportDetails: "",
    entryFeeStatus: "EXCLUDED",
    entryFeeDetails: "",
    additionalCostsDetails: "",
    tripStartTime: "09:00 AM",
    pickupName: "",
    pickupAddress: "",
    pickupMapsUrl: "",
    placeIds: [],
    placePrices: {},
    places: {},
  };
}

/** Narrows a picker place to the fields a package stores and shows. */
function toPackagePlace(place: ManageablePlace): PackagePlace {
  return {
    id: place.id,
    name: place.name,
    description: null,
    images: place.images,
    category: place.category,
    entryfee: place.entryfee,
    pricing: [],
    district: place.district,
  };
}

function draftFrom(pkg: TourPackage): Draft {
  return {
    id: pkg.id,
    name: pkg.name,
    description: pkg.description ?? "",
    pricingMode: pkg.pricingMode ?? "WHOLE_TOUR",
    pricingUnit: pkg.pricingUnit ?? "PER_TOUR",
    price: pkg.price ?? 0,
    allowCustomerPlaceSelection: pkg.allowCustomerPlaceSelection ?? true,
    cancellationPolicy: pkg.cancellationPolicy ?? "Free cancellation up to 24h before trip start",
    foodStatus: pkg.foodStatus ?? "EXCLUDED",
    foodDetails: pkg.foodDetails ?? "",
    transportStatus: pkg.transportStatus ?? "EXCLUDED",
    transportDetails: pkg.transportDetails ?? "",
    entryFeeStatus: pkg.entryFeeStatus ?? "EXCLUDED",
    entryFeeDetails: pkg.entryFeeDetails ?? "",
    additionalCostsDetails: pkg.additionalCostsDetails ?? "",
    tripStartTime: pkg.tripStartTime ?? "09:00 AM",
    pickupName: pkg.pickupName ?? "",
    pickupAddress: pkg.pickupAddress ?? "",
    pickupMapsUrl: pkg.pickupMapsUrl ?? "",
    placeIds: pkg.places.map((place) => place.id),
    placePrices: Object.fromEntries(pkg.places.map((p) => [p.id, p.price ?? 0])),
    places: Object.fromEntries(pkg.places.map((place) => [place.id, place])),
  };
}

function validate(draft: Draft): string | null {
  if (draft.name.trim().length < 2) return "Give the package a name of at least 2 characters.";
  if (draft.placeIds.length === 0) return "Add at least one place to the package.";
  if (draft.pricingMode === "WHOLE_TOUR" && (draft.price === undefined || draft.price === null || draft.price < 0)) {
    return "Please enter a valid whole-tour price.";
  }
  return null;
}

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
      pricingMode: draft.pricingMode,
      pricingUnit: draft.pricingUnit,
      price: Number(draft.price) || 0,
      allowCustomerPlaceSelection: draft.allowCustomerPlaceSelection,
      cancellationPolicy: draft.cancellationPolicy,
      foodStatus: draft.foodStatus,
      foodDetails: draft.foodDetails,
      transportStatus: draft.transportStatus,
      transportDetails: draft.transportDetails,
      entryFeeStatus: draft.entryFeeStatus,
      entryFeeDetails: draft.entryFeeDetails,
      additionalCostsDetails: draft.additionalCostsDetails,
      tripStartTime: draft.tripStartTime,
      pickupName: draft.pickupName,
      pickupAddress: draft.pickupAddress,
      pickupMapsUrl: draft.pickupMapsUrl,
      placeIds: draft.placeIds,
      placePrices: draft.placePrices,
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="pricing-mode">Pricing Mode</Label>
              <Select
                value={draft.pricingMode}
                onValueChange={(val: "WHOLE_TOUR" | "PLACE_BASED") =>
                  setDraft({ ...draft, pricingMode: val })
                }
              >
                <SelectTrigger id="pricing-mode">
                  <SelectValue placeholder="Select pricing mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WHOLE_TOUR">Whole-tour pricing (Default)</SelectItem>
                  <SelectItem value="PLACE_BASED">Optional place-based pricing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="pricing-unit">Pricing Unit</Label>
              <Select
                value={draft.pricingUnit}
                onValueChange={(val: "PER_TOUR" | "PER_PERSON") =>
                  setDraft({ ...draft, pricingUnit: val })
                }
              >
                <SelectTrigger id="pricing-unit">
                  <SelectValue placeholder="Select pricing unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PER_TOUR">Per Tour / Group</SelectItem>
                  <SelectItem value="PER_PERSON">Per Person</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {draft.pricingMode === "WHOLE_TOUR" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="package-price">Whole-tour price (₹)</Label>
              <Input
                id="package-price"
                type="number"
                min={0}
                value={draft.price}
                onChange={(event) =>
                  setDraft({ ...draft, price: Number(event.target.value) || 0 })
                }
                placeholder="2400"
              />
              <p className="text-xs text-muted-foreground">
                Single flat cost for the whole tour, regardless of place selection.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 rounded-xl border p-3 bg-card/40">
              <Label className="text-sm font-semibold">Place-based prices (₹)</Label>
              <p className="text-xs text-muted-foreground">
                Set individual price for each included place.
              </p>
              {draft.placeIds.map((pid) => {
                const place = draft.places[pid];
                return (
                  <div key={pid} className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium truncate min-w-0 flex-1">
                      {place?.name || pid}
                    </span>
                    <Input
                      type="number"
                      min={0}
                      className="w-28 h-8 text-xs"
                      value={draft.placePrices[pid] ?? 0}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setDraft({
                          ...draft,
                          placePrices: { ...draft.placePrices, [pid]: val },
                        });
                      }}
                      placeholder="Price in ₹"
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center gap-2.5 rounded-xl border p-3 bg-muted/20">
            <input
              type="checkbox"
              id="allow-place-selection"
              checked={draft.allowCustomerPlaceSelection}
              onChange={(e) =>
                setDraft({ ...draft, allowCustomerPlaceSelection: e.target.checked })
              }
              className="size-4 rounded border-border text-primary focus:ring-ring"
            />
            <div className="flex flex-col">
              <Label htmlFor="allow-place-selection" className="text-sm font-semibold cursor-pointer">
                Allow customers to choose individual places
              </Label>
              <p className="text-xs text-muted-foreground">
                When turned OFF, customers must book the complete tour and cannot deselect places.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="trip-start-time">Trip start time</Label>
              <Input
                id="trip-start-time"
                value={draft.tripStartTime}
                placeholder="09:00 AM"
                onChange={(e) => setDraft({ ...draft, tripStartTime: e.target.value })}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="pickup-name">Meeting / Pickup point name</Label>
              <Input
                id="pickup-name"
                value={draft.pickupName}
                placeholder="Central Bus Stand / Hotel Lobby"
                onChange={(e) => setDraft({ ...draft, pickupName: e.target.value })}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pickup-address">Full Pickup Address / Instructions</Label>
            <Input
              id="pickup-address"
              value={draft.pickupAddress}
              placeholder="Main Gate Entrance, Opposite Clock Tower"
              onChange={(e) => setDraft({ ...draft, pickupAddress: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="pickup-maps-url">Google Maps Location Link</Label>
            <Input
              id="pickup-maps-url"
              value={draft.pickupMapsUrl}
              placeholder="Paste Google Maps link for the meeting point"
              onChange={(e) => setDraft({ ...draft, pickupMapsUrl: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Open Google Maps, select the exact pickup location, and paste the Share link here. Customers can open it directly in Google Maps.
            </p>
            {draft.pickupMapsUrl.trim() ? (
              <div className="pt-1">
                <a
                  href={draft.pickupMapsUrl.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                >
                  <ExternalLink className="size-3.5" /> Preview / Open in Google Maps
                </a>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 rounded-xl border p-4 bg-card/50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Facilities & Cost Disclosures
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="food-status" className="text-xs">Food / Meals</Label>
                <Select
                  value={draft.foodStatus}
                  onValueChange={(val) => setDraft({ ...draft, foodStatus: val })}
                >
                  <SelectTrigger id="food-status" className="h-9 text-xs">
                    <SelectValue placeholder="Food status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXCLUDED">Excluded (Customer pays)</SelectItem>
                    <SelectItem value="INCLUDED">Included in price</SelectItem>
                    <SelectItem value="OPTIONAL">Optional arrangement</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="e.g. Breakfast included"
                  value={draft.foodDetails}
                  onChange={(e) => setDraft({ ...draft, foodDetails: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="transport-status" className="text-xs">Transport</Label>
                <Select
                  value={draft.transportStatus}
                  onValueChange={(val) => setDraft({ ...draft, transportStatus: val })}
                >
                  <SelectTrigger id="transport-status" className="h-9 text-xs">
                    <SelectValue placeholder="Transport status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXCLUDED">Excluded</SelectItem>
                    <SelectItem value="INCLUDED">Included (AC Cab)</SelectItem>
                    <SelectItem value="OPTIONAL">Optional add-on</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="e.g. Sedan for up to 4"
                  value={draft.transportDetails}
                  onChange={(e) => setDraft({ ...draft, transportDetails: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="entry-fee-status" className="text-xs">Entry Fees</Label>
                <Select
                  value={draft.entryFeeStatus}
                  onValueChange={(val) => setDraft({ ...draft, entryFeeStatus: val })}
                >
                  <SelectTrigger id="entry-fee-status" className="h-9 text-xs">
                    <SelectValue placeholder="Entry fee policy" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXCLUDED">Excluded (Paid separately)</SelectItem>
                    <SelectItem value="INCLUDED">Included in tour price</SelectItem>
                    <SelectItem value="FREE">Free entry places</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="e.g. Approx ₹150/head"
                  value={draft.entryFeeDetails}
                  onChange={(e) => setDraft({ ...draft, entryFeeDetails: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5 pt-1">
              <Label htmlFor="cancellation-policy" className="text-xs font-semibold">Cancellation Policy</Label>
              <Input
                id="cancellation-policy"
                placeholder="Free cancellation up to 24h before trip start"
                value={draft.cancellationPolicy}
                onChange={(e) => setDraft({ ...draft, cancellationPolicy: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
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

              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary">
                  {pkg.pricingMode === "WHOLE_TOUR" ? "Whole Tour" : "Place Based"}
                </Badge>
                <Badge variant="outline">
                  {pkg.pricingUnit === "PER_TOUR" ? "Per Tour" : "Per Person"}
                </Badge>
                {pkg.pricingMode === "WHOLE_TOUR" ? (
                  <Badge variant="info" className="font-semibold">
                    ₹{pkg.price} {pkg.pricingUnit === "PER_PERSON" ? "/ person" : "/ tour"}
                  </Badge>
                ) : null}
                {pkg.tripStartTime ? (
                  <Badge variant="outline">Start: {pkg.tripStartTime}</Badge>
                ) : null}
                {pkg.pickupName ? (
                  <Badge variant="outline" className="gap-1">
                    <MapPin className="size-3" />
                    {pkg.pickupName}
                  </Badge>
                ) : null}
                {pkg.pickupMapsUrl ? (
                  <a
                    href={pkg.pickupMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline self-center"
                  >
                    <ExternalLink className="size-3.5" /> Open in Google Maps
                  </a>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {pkg.places.map((place) => (
                  <Badge key={place.id} variant="outline" className="gap-1">
                    <MapPin className="size-3" />
                    {place.name}
                    {pkg.pricingMode === "PLACE_BASED" && place.price ? (
                      <span className="font-semibold text-primary ml-1">₹{place.price}</span>
                    ) : null}
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
  const [districtSearch, setDistrictSearch] = React.useState("");

  const districts = useAsync(() => getDistricts(), []);

  const filteredDistricts = React.useMemo(() => {
    const list = districts.data ?? [];
    if (!districtSearch.trim()) return list;
    const q = districtSearch.toLowerCase().trim();
    return list.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.state?.name && d.state.name.toLowerCase().includes(q))
    );
  }, [districts.data, districtSearch]);

  /**
   * The district the returned list belongs to is carried alongside it, because
   * `useAsync` only flips `isLoading` on its first load and on an explicit
   * refetch — it stays settled while a new dependency list is in flight, which
   * would leave the previous district's places listed under the new district's
   * name. Comparing the two is what keeps a stale list off screen.
   *
   * The guide-scoped list is used rather than the public one because it is the
   * only list that includes the guide's own places awaiting review, which a guide
   * is allowed to put in a package straight away.
   */
  const places = useAsync(
    async (): Promise<{
      districtId: string;
      places: ManageablePlace[];
      error: string | null;
    }> =>
      districtId
        ? await loadManageablePlaces(districtId).then((result) => ({
            districtId,
            places: result.places,
            error: result.error,
          }))
        : { districtId: "", places: [], error: null },
    [districtId]
  );

  // The error is read off the same object as the list, so the two can never
  // disagree: a district that failed to load cannot also look like an empty one.
  const loaded = places.data?.districtId === districtId ? places.data : null;
  const listed = loaded?.places ?? null;
  const placesError = loaded?.error ?? null;
  const [creating, setCreating] = React.useState(false);

  // Named in the create button and the dialog, so the guide is always told which
  // district the place will land in rather than having to remember what they
  // picked.
  const districtName = React.useMemo(() => {
    if (!districtId) return null;
    const match = (districts.data ?? []).find(
      (district) => district.id === districtId
    );
    if (!match) return null;
    return match.state?.name
      ? `${match.name}, ${match.state.name}`
      : match.name;
  }, [districts.data, districtId]);

  const selected = new Set(draft.placeIds);

  function toggle(place: ManageablePlace) {
    if (selected.has(place.id)) {
      deselect(place.id);
      return;
    }
    onChange([...draft.placeIds, place.id], {
      ...draft.places,
      [place.id]: toPackagePlace(place),
    });
  }

  /**
   * Selects a place the guide has just created.
   *
   * Also added here rather than left to the next list fetch: the new place is
   * inserted into the draft directly, so it appears as a selected chip straight
   * away and the guide can see it was added without waiting for a reload.
   */
  function addCreated(place: ManageablePlace) {
    if (draft.placeIds.includes(place.id)) return;
    onChange([...draft.placeIds, place.id], {
      ...draft.places,
      [place.id]: toPackagePlace(place),
    });
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

      <div className="flex flex-col gap-1.5">
        <Input
          type="text"
          placeholder="Type to filter districts (e.g. Mysuru, Bengaluru, Jaipur)…"
          value={districtSearch}
          onChange={(e) => setDistrictSearch(e.target.value)}
          className="text-xs h-9 rounded-xl"
        />
        <Select value={districtId} onValueChange={setDistrictId}>
          <SelectTrigger id="package-district" className="w-full">
            <SelectValue
              placeholder={
                districtSearch
                  ? `Matching districts (${filteredDistricts.length})`
                  : "Select a district to add its places"
              }
            />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {filteredDistricts.slice(0, 150).map((district) => (
              <SelectItem key={district.id} value={district.id}>
                {district.name}
                {district.state?.name ? `, ${district.state.name}` : ""}
              </SelectItem>
            ))}
            {filteredDistricts.length === 0 ? (
              <div className="p-2 text-xs text-muted-foreground text-center">
                No districts matching &ldquo;{districtSearch}&rdquo;
              </div>
            ) : null}
          </SelectContent>
        </Select>
      </div>

      {/*
        `!listed` covers the window right after a district is switched, where the
        hook is neither loading nor holding a matching list, so the spinner is
        shown from the list's own state rather than the hook's.
      */}
      {districtId && !listed && !placesError ? (
        <LoadingState label="Loading places…" />
      ) : null}

      {districtId && placesError ? (
        <ErrorState
          title="Places unavailable"
          description="The place list could not be loaded. Please try again."
          retry={places.refetch}
        />
      ) : null}

      {listed && listed.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          This district has no places yet — create the first one below.
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
                onClick={() => toggle(place)}
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
                {/*
                  An unapproved place is selectable on purpose — the guide may use
                  their own place in a package before review — so it is labelled
                  rather than hidden, otherwise it would look identical to a live
                  one and the guide could not tell why a package is not yet
                  visible to travellers.
                */}
                {place.status === "APPROVED" ? null : (
                  <Badge variant="warning" className="shrink-0 text-[0.6rem]">
                    {place.status === "PENDING" ? "Awaiting review" : "Not live"}
                  </Badge>
                )}
                <Badge variant="outline" className="shrink-0 text-[0.6rem]">
                  <MapPin className="size-3" />
                  {place.category}
                </Badge>
              </button>
            );
          })}
        </div>
      ) : null}

      {/* Only offered once a district is chosen: the place belongs to it, and the
          form cannot guess one. Placed after the list so the existing places stay
          the first thing a guide reaches for. */}
      {districtId && !placesError ? (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCreating(true)}
          >
            <Plus className="size-4" />
            Create a new place in {districtName ?? "this district"}
          </Button>
          <CreatePlaceDialog
            open={creating}
            onOpenChange={setCreating}
            districtId={districtId}
            districtName={districtName ?? "this district"}
            onCreated={addCreated}
          />
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
