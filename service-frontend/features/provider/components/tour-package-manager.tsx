"use client";

import {
  ArrowDown,
  ArrowUp,
  Baby,
  Car,
  Check,
  Clock,
  ExternalLink,
  Eye,
  Info,
  MapPin,
  Pencil,
  Plus,
  Route,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  Utensils,
  X,
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  addTourPackage,
  editTourPackage,
  loadAvailableSpecificGuides,
  loadManageablePlaces,
  removeTourPackage,
} from "@/features/provider/api/provider.actions";
import type {
  ManageablePlace,
  PackagePlace,
  PackagePlaceItineraryInput,
  SpecificGuideSummary,
  TourPackage,
  TourPackageInput,
  TransportVehicleConfig,
  MealsServiceOption,
  TransportServiceOption,
  PlaceVisitArrangement,
  PlaceEntryFeeStatus,
} from "@/features/provider/types";
import { getDistricts } from "@/features/locations/api/locations.api";
import { CreatePlaceDialog } from "@/features/places/components/create-place-dialog";
import { cn } from "@/lib/utils";
import { useAsync } from "@/lib/hooks/use-async";

const NAME_LIMIT = 80;
const DESCRIPTION_LIMIT = 1000;

type EditorTab = "basic" | "itinerary" | "meals" | "transport" | "guide" | "children";

type ItineraryPlaceConfig = {
  placeId: string;
  itineraryOrder: number;
  visitArrangement: PlaceVisitArrangement;
  expectedDuration: string;
  entryFeeStatus: PlaceEntryFeeStatus;
  entryFeeAmount: number;
  price: number;
};

type Draft = {
  id: string | null;
  name: string;
  description: string;
  duration: string;
  maxGroupSize: number;
  pricingMode: "WHOLE_TOUR" | "PLACE_BASED";
  pricingUnit: "PER_TOUR" | "PER_PERSON";
  price: number;
  allowCustomerPlaceSelection: boolean;
  cancellationPolicy: string;
  tripStartTime: string;
  pickupName: string;
  pickupAddress: string;
  pickupMapsUrl: string;

  // Places & Itinerary
  placeIds: string[];
  placePrices: Record<string, number>;
  places: Record<string, PackagePlace>;
  itineraryConfig: Record<string, ItineraryPlaceConfig>;

  // Meals
  mealsService: MealsServiceOption;
  includedMeals: string[];
  mealDetails: string;

  // Transport
  transportService: TransportServiceOption;
  transportVehicles: TransportVehicleConfig[];
  transportDetails: string;

  // Specific Guide
  hasSpecificGuide: boolean;
  specificGuideId: string | null;

  // Children
  childrenAllowed: boolean;
  childMaxAge: number;
  maxChildren: number;
  childrenCountTowardCapacity: boolean;
  childPrice: number;
  childConditions: string;
};

function emptyDraft(): Draft {
  return {
    id: null,
    name: "",
    description: "",
    duration: "Full Day (6-8 hours)",
    maxGroupSize: 10,
    pricingMode: "WHOLE_TOUR",
    pricingUnit: "PER_TOUR",
    price: 0,
    allowCustomerPlaceSelection: true,
    cancellationPolicy: "Free cancellation up to 24h before trip start",
    tripStartTime: "09:00 AM",
    pickupName: "",
    pickupAddress: "",
    pickupMapsUrl: "",

    placeIds: [],
    placePrices: {},
    places: {},
    itineraryConfig: {},

    mealsService: "NO_SERVICE",
    includedMeals: [],
    mealDetails: "",

    transportService: "NO_SERVICE",
    transportVehicles: [],
    transportDetails: "",

    hasSpecificGuide: false,
    specificGuideId: null,

    childrenAllowed: true,
    childMaxAge: 12,
    maxChildren: 4,
    childrenCountTowardCapacity: true,
    childPrice: 0,
    childConditions: "Children under 12 must be accompanied by an adult.",
  };
}

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
    itineraryOrder: 0,
    visitArrangement: "GUIDED",
    expectedDuration: "1 hour",
    entryFeeStatus: place.entryfee && place.entryfee > 0 ? "EXCLUDED" : "INCLUDED",
    entryFeeAmount: place.entryfee ?? 0,
  };
}

function draftFrom(pkg: TourPackage): Draft {
  const itineraryConfig: Record<string, ItineraryPlaceConfig> = {};
  const placePrices: Record<string, number> = {};
  const placesMap: Record<string, PackagePlace> = {};

  const sortedPlaces = [...pkg.places].sort(
    (a, b) => (a.itineraryOrder ?? 0) - (b.itineraryOrder ?? 0)
  );

  sortedPlaces.forEach((place, index) => {
    placesMap[place.id] = place;
    placePrices[place.id] = place.price ?? 0;
    itineraryConfig[place.id] = {
      placeId: place.id,
      itineraryOrder: place.itineraryOrder ?? index,
      visitArrangement: place.visitArrangement ?? "GUIDED",
      expectedDuration: place.expectedDuration ?? "1 hour",
      entryFeeStatus: place.entryFeeStatus ?? (place.entryfee && place.entryfee > 0 ? "EXCLUDED" : "INCLUDED"),
      entryFeeAmount: place.entryFeeAmount ?? (place.entryfee ?? 0),
      price: place.price ?? 0,
    };
  });

  return {
    id: pkg.id,
    name: pkg.name,
    description: pkg.description ?? "",
    duration: pkg.duration ?? "Full Day",
    maxGroupSize: pkg.maxGroupSize ?? 10,
    pricingMode: pkg.pricingMode ?? "WHOLE_TOUR",
    pricingUnit: pkg.pricingUnit ?? "PER_TOUR",
    price: pkg.price ?? 0,
    allowCustomerPlaceSelection: pkg.allowCustomerPlaceSelection ?? true,
    cancellationPolicy: pkg.cancellationPolicy ?? "Free cancellation up to 24h before trip start",
    tripStartTime: pkg.tripStartTime ?? "09:00 AM",
    pickupName: pkg.pickupName ?? "",
    pickupAddress: pkg.pickupAddress ?? "",
    pickupMapsUrl: pkg.pickupMapsUrl ?? "",

    placeIds: sortedPlaces.map((p) => p.id),
    placePrices,
    places: placesMap,
    itineraryConfig,

    mealsService: pkg.mealsService ?? (pkg.foodStatus === "INCLUDED" ? "INCLUDED" : pkg.foodStatus === "OPTIONAL" ? "ON_REQUEST" : "NO_SERVICE"),
    includedMeals: pkg.includedMeals ?? [],
    mealDetails: pkg.mealDetails ?? pkg.foodDetails ?? "",

    transportService: pkg.transportService ?? (pkg.transportStatus === "INCLUDED" ? "INCLUDED" : pkg.transportStatus === "OPTIONAL" ? "ON_REQUEST" : "NO_SERVICE"),
    transportVehicles: Array.isArray(pkg.transportVehicles) ? pkg.transportVehicles : [],
    transportDetails: pkg.transportDetails ?? "",

    hasSpecificGuide: Boolean(pkg.hasSpecificGuide),
    specificGuideId: pkg.specificGuideId ?? null,

    childrenAllowed: pkg.childrenAllowed ?? true,
    childMaxAge: pkg.childMaxAge ?? 12,
    maxChildren: pkg.maxChildren ?? 4,
    childrenCountTowardCapacity: pkg.childrenCountTowardCapacity ?? true,
    childPrice: pkg.childPrice ?? 0,
    childConditions: pkg.childConditions ?? "",
  };
}

function validate(draft: Draft): string | null {
  if (draft.name.trim().length < 2) return "Give the package a name of at least 2 characters.";
  if (draft.placeIds.length === 0) return "Add at least one place to the package.";
  if (draft.pricingMode === "WHOLE_TOUR" && (draft.price === undefined || draft.price === null || draft.price < 0)) {
    return "Please enter a valid whole-tour price.";
  }
  if (draft.hasSpecificGuide && !draft.specificGuideId) {
    return "Please select a Specific Guide or choose 'No Specific Guide included'.";
  }
  if (draft.transportService === "INCLUDED" && draft.transportVehicles.length === 0) {
    return "Please configure at least one vehicle for the included transport service.";
  }
  return null;
}

export function TourPackageManager({
  packages,
  error,
}: {
  packages: TourPackage[];
  error: string | null;
}) {
  const [items, setItems] = React.useState<TourPackage[]>(packages);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [activeTab, setActiveTab] = React.useState<EditorTab>("basic");
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [viewingPackage, setViewingPackage] = React.useState<TourPackage | null>(null);

  const [availableGuides, setAvailableGuides] = React.useState<SpecificGuideSummary[]>([]);
  const [loadingGuides, setLoadingGuides] = React.useState(false);

  const router = useRouter();
  const [refreshing, startRefresh] = React.useTransition();
  const retrying = refreshing;

  // Load available specific guides
  React.useEffect(() => {
    let mounted = true;
    async function fetchGuides() {
      setLoadingGuides(true);
      try {
        const res = await loadAvailableSpecificGuides();
        if (mounted && res.ok && res.data) {
          setAvailableGuides(res.data);
        }
      } catch {
        // Silently handle if guides can't load
      } finally {
        if (mounted) setLoadingGuides(false);
      }
    }
    fetchGuides();
    return () => {
      mounted = false;
    };
  }, []);

  function openCreate() {
    setFormError(null);
    setActiveTab("basic");
    setDraft(emptyDraft());
  }

  function openEdit(pkg: TourPackage) {
    setFormError(null);
    setActiveTab("basic");
    setDraft(draftFrom(pkg));
  }

  async function save() {
    if (!draft) return;

    const problem = validate(draft);
    if (problem) {
      setFormError(problem);
      return;
    }

    const placeItinerary: PackagePlaceItineraryInput[] = draft.placeIds.map((pid, idx) => {
      const cfg = draft.itineraryConfig[pid] || {
        placeId: pid,
        itineraryOrder: idx,
        visitArrangement: "GUIDED",
        expectedDuration: "1 hour",
        entryFeeStatus: "EXCLUDED",
        entryFeeAmount: 0,
        price: draft.placePrices[pid] ?? 0,
      };
      return {
        placeId: pid,
        itineraryOrder: idx,
        visitArrangement: cfg.visitArrangement,
        expectedDuration: cfg.expectedDuration,
        entryFeeStatus: cfg.entryFeeStatus,
        entryFeeAmount: Number(cfg.entryFeeAmount) || 0,
        price: Number(draft.placePrices[pid]) || 0,
      };
    });

    const input: TourPackageInput = {
      name: draft.name.trim(),
      description: draft.description,
      duration: draft.duration.trim() || undefined,
      maxGroupSize: Number(draft.maxGroupSize) || 10,
      pricingMode: draft.pricingMode,
      pricingUnit: draft.pricingUnit,
      price: Number(draft.price) || 0,
      allowCustomerPlaceSelection: draft.allowCustomerPlaceSelection,
      cancellationPolicy: draft.cancellationPolicy,
      tripStartTime: draft.tripStartTime,
      pickupName: draft.pickupName,
      pickupAddress: draft.pickupAddress,
      pickupMapsUrl: draft.pickupMapsUrl,

      mealsService: draft.mealsService,
      includedMeals: draft.mealsService === "INCLUDED" ? draft.includedMeals : [],
      mealDetails: draft.mealDetails,

      transportService: draft.transportService,
      transportVehicles: draft.transportService === "INCLUDED" ? draft.transportVehicles : [],
      transportDetails: draft.transportDetails,

      hasSpecificGuide: draft.hasSpecificGuide,
      specificGuideId: draft.hasSpecificGuide ? draft.specificGuideId : null,

      childrenAllowed: draft.childrenAllowed,
      childMaxAge: draft.childrenAllowed ? Number(draft.childMaxAge) : null,
      maxChildren: draft.childrenAllowed ? Number(draft.maxChildren) : null,
      childrenCountTowardCapacity: draft.childrenCountTowardCapacity,
      childPrice: draft.childrenAllowed ? Number(draft.childPrice) : null,
      childConditions: draft.childConditions,

      placeIds: draft.placeIds,
      placePrices: draft.placePrices,
      placeItinerary,
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

      setItems((current) => {
        if (!draft.id) return [result.data, ...current];
        return current.map((pkg) => (pkg.id === result.data.id ? result.data : pkg));
      });
      setDraft(null);
      toast.success(draft.id ? "Package updated successfully" : "Package created successfully");
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

  function movePlace(index: number, direction: "up" | "down") {
    if (!draft) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= draft.placeIds.length) return;

    const newIds = [...draft.placeIds];
    const [moved] = newIds.splice(index, 1);
    newIds.splice(targetIndex, 0, moved);

    setDraft({ ...draft, placeIds: newIds });
  }

  function updatePlaceConfig(placeId: string, partial: Partial<ItineraryPlaceConfig>) {
    if (!draft) return;
    const current = draft.itineraryConfig[placeId] || {
      placeId,
      itineraryOrder: draft.placeIds.indexOf(placeId),
      visitArrangement: "GUIDED",
      expectedDuration: "1 hour",
      entryFeeStatus: "EXCLUDED",
      entryFeeAmount: 0,
      price: draft.placePrices[placeId] ?? 0,
    };
    setDraft({
      ...draft,
      itineraryConfig: {
        ...draft.itineraryConfig,
        [placeId]: { ...current, ...partial },
      },
    });
  }

  function addVehicle() {
    if (!draft) return;
    const newVehicle: TransportVehicleConfig = {
      vehicleType: "Car",
      type: "Car",
      capacity: 4,
      isShared: false,
      isPrivate: true,
      chargesIncluded: "Fuel and driver allowance included",
      chargesExcluded: "Tolls & parking paid separately",
      additionalChargesExcluded: "Tolls & parking paid separately",
      conditions: "Air-conditioned sedan",
    };
    setDraft({
      ...draft,
      transportVehicles: [...draft.transportVehicles, newVehicle],
    });
  }

  function updateVehicle(index: number, partial: Partial<TransportVehicleConfig>) {
    if (!draft) return;
    const updated = draft.transportVehicles.map((v, i) =>
      i === index ? { ...v, ...partial } : v
    );
    setDraft({ ...draft, transportVehicles: updated });
  }

  function removeVehicle(index: number) {
    if (!draft) return;
    setDraft({
      ...draft,
      transportVehicles: draft.transportVehicles.filter((_, i) => i !== index),
    });
  }

  function toggleMeal(meal: string) {
    if (!draft) return;
    const current = new Set(draft.includedMeals);
    if (current.has(meal)) current.delete(meal);
    else current.add(meal);
    setDraft({ ...draft, includedMeals: Array.from(current) });
  }

  if (error !== null) {
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

  const selectedSpecificGuide = draft?.specificGuideId
    ? availableGuides.find((g) => g.id === draft.specificGuideId)
    : null;

  return (
    <div className="flex flex-col gap-5">
      {/* Header bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Tour Packages Management
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create, edit, and configure comprehensive packages with transparent itineraries, meals, transport, and guide assignments.
          </p>
        </div>
        {draft === null && (
          <Button type="button" onClick={openCreate} className="shadow-sm">
            <Plus className="size-4 mr-1.5" />
            Create Package
          </Button>
        )}
      </div>

      {/* Package Editor (When draft is active) */}
      {draft !== null ? (
        <div className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="text-base font-bold text-foreground">
                {draft.id ? `Edit Package: ${draft.name || "Untitled"}` : "Create New Tour Package"}
              </h3>
              <p className="text-xs text-muted-foreground">
                Fill in the sections below to define a complete tour experience for your travellers.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setDraft(null);
                  setFormError(null);
                }}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={save} disabled={saving}>
                {saving ? "Saving…" : draft.id ? "Save Changes" : "Create Package"}
              </Button>
            </div>
          </div>

          {/* Section Navigation Tabs */}
          <div className="flex flex-wrap gap-1.5 border-b pb-2">
            {[
              { id: "basic", label: "1. Basic Info", icon: Info },
              { id: "itinerary", label: `2. Places & Itinerary (${draft.placeIds.length})`, icon: Route },
              { id: "meals", label: "3. Meals & Food", icon: Utensils },
              { id: "transport", label: "4. Transport", icon: Car },
              { id: "guide", label: "5. Specific Guide", icon: UserCheck },
              { id: "children", label: "6. Children & Rules", icon: Baby },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as EditorTab)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="size-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* TAB 1: BASIC INFORMATION */}
          {activeTab === "basic" && (
            <div className="flex flex-col gap-4 animate-in fade-in-50">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="package-name" className="text-xs font-semibold">
                    Package Name *
                  </Label>
                  <Input
                    id="package-name"
                    value={draft.name}
                    maxLength={NAME_LIMIT}
                    placeholder="e.g. Royal Heritage & Cultural Mysore Tour"
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="package-duration" className="text-xs font-semibold">
                    Duration & Schedule
                  </Label>
                  <Input
                    id="package-duration"
                    value={draft.duration}
                    placeholder="e.g. Full Day (8 Hours) or 2 Days"
                    onChange={(e) => setDraft({ ...draft, duration: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="package-description" className="text-xs font-semibold">
                  Package Overview & Description
                </Label>
                <Textarea
                  id="package-description"
                  value={draft.description}
                  maxLength={DESCRIPTION_LIMIT}
                  rows={3}
                  placeholder="Detail the tour highlights, places explored, and unique experiences offered..."
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pricing-mode" className="text-xs font-semibold">Pricing Mode</Label>
                  <Select
                    value={draft.pricingMode}
                    onValueChange={(val: "WHOLE_TOUR" | "PLACE_BASED") =>
                      setDraft({ ...draft, pricingMode: val })
                    }
                  >
                    <SelectTrigger id="pricing-mode" className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WHOLE_TOUR">Whole-Tour Pricing</SelectItem>
                      <SelectItem value="PLACE_BASED">Place-Based Pricing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="pricing-unit" className="text-xs font-semibold">Pricing Unit</Label>
                  <Select
                    value={draft.pricingUnit}
                    onValueChange={(val: "PER_TOUR" | "PER_PERSON") =>
                      setDraft({ ...draft, pricingUnit: val })
                    }
                  >
                    <SelectTrigger id="pricing-unit" className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PER_TOUR">Per Tour / Group</SelectItem>
                      <SelectItem value="PER_PERSON">Per Person</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="package-price" className="text-xs font-semibold">
                    Base Package Price (₹) *
                  </Label>
                  <Input
                    id="package-price"
                    type="number"
                    min={0}
                    value={draft.price}
                    onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) || 0 })}
                    placeholder="2500"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="max-group-size" className="text-xs font-semibold">
                    Maximum Group Size
                  </Label>
                  <Input
                    id="max-group-size"
                    type="number"
                    min={1}
                    value={draft.maxGroupSize}
                    onChange={(e) => setDraft({ ...draft, maxGroupSize: Number(e.target.value) || 1 })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="trip-start-time" className="text-xs font-semibold">Trip Start Time</Label>
                  <Input
                    id="trip-start-time"
                    value={draft.tripStartTime}
                    placeholder="09:00 AM"
                    onChange={(e) => setDraft({ ...draft, tripStartTime: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="cancellation-policy" className="text-xs font-semibold">Cancellation Policy</Label>
                  <Input
                    id="cancellation-policy"
                    value={draft.cancellationPolicy}
                    placeholder="Free cancellation up to 24h before start"
                    onChange={(e) => setDraft({ ...draft, cancellationPolicy: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Pickup Point Information */}
              <div className="rounded-xl border p-4 bg-muted/20 flex flex-col gap-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-primary" /> Meeting / Pickup Point Details
                </h4>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="pickup-name" className="text-xs">Meeting Location Name</Label>
                    <Input
                      id="pickup-name"
                      value={draft.pickupName}
                      placeholder="e.g. Mysore Palace North Gate or Hotel Lobby"
                      onChange={(e) => setDraft({ ...draft, pickupName: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="pickup-address" className="text-xs">Address / Instructions</Label>
                    <Input
                      id="pickup-address"
                      value={draft.pickupAddress}
                      placeholder="e.g. Opposite City Bus Station, near ticket counter"
                      onChange={(e) => setDraft({ ...draft, pickupAddress: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <Label htmlFor="pickup-maps" className="text-xs">Google Maps Share Link</Label>
                  <Input
                    id="pickup-maps"
                    value={draft.pickupMapsUrl}
                    placeholder="https://maps.google.com/?q=..."
                    onChange={(e) => setDraft({ ...draft, pickupMapsUrl: e.target.value })}
                    className="h-8 text-xs"
                  />
                  {draft.pickupMapsUrl.trim() && (
                    <a
                      href={draft.pickupMapsUrl.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[0.7rem] text-primary font-semibold hover:underline mt-0.5"
                    >
                      <ExternalLink className="size-3" /> Preview pickup location in Google Maps
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PLACES & ITINERARY */}
          {activeTab === "itinerary" && (
            <div className="flex flex-col gap-4 animate-in fade-in-50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-foreground">Itinerary Stops & Arrangement</h4>
                  <p className="text-xs text-muted-foreground">
                    Arrange the order of stops and specify whether each stop includes a guided tour or drop-off/self-guided exploration.
                  </p>
                </div>
              </div>

              {draft.placeIds.length === 0 ? (
                <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">
                  No places added yet. Use the place picker below to select places for this package.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {draft.placeIds.map((pid, index) => {
                    const place = draft.places[pid];
                    const cfg = draft.itineraryConfig[pid] || {
                      placeId: pid,
                      itineraryOrder: index,
                      visitArrangement: "GUIDED",
                      expectedDuration: "1 hour",
                      entryFeeStatus: "EXCLUDED",
                      entryFeeAmount: 0,
                      price: draft.placePrices[pid] ?? 0,
                    };

                    return (
                      <div
                        key={pid}
                        className="rounded-xl border border-border bg-card p-3.5 shadow-xs flex flex-col gap-3"
                      >
                        <div className="flex items-center justify-between gap-2 border-b pb-2">
                          <div className="flex items-center gap-2">
                            <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                              {index + 1}
                            </span>
                            <span className="font-semibold text-sm text-foreground">
                              {place?.name || "Selected stop"}
                            </span>
                            {place?.district?.name && (
                              <Badge variant="outline" className="text-[0.65rem]">
                                {place.district.name}
                              </Badge>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              disabled={index === 0}
                              onClick={() => movePlace(index, "up")}
                              title="Move up in itinerary"
                            >
                              <ArrowUp className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              disabled={index === draft.placeIds.length - 1}
                              onClick={() => movePlace(index, "down")}
                              title="Move down in itinerary"
                            >
                              <ArrowDown className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                const newIds = draft.placeIds.filter((id) => id !== pid);
                                const newPlaces = { ...draft.places };
                                delete newPlaces[pid];
                                setDraft({ ...draft, placeIds: newIds, places: newPlaces });
                              }}
                              title="Remove stop"
                            >
                              <X className="size-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Arrangement and fee configuration */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                          <div className="flex flex-col gap-1">
                            <Label className="text-[0.7rem] font-semibold text-muted-foreground">
                              Visit Arrangement *
                            </Label>
                            <Select
                              value={cfg.visitArrangement}
                              onValueChange={(val: PlaceVisitArrangement) =>
                                updatePlaceConfig(pid, { visitArrangement: val })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="GUIDED">
                                  Included stop with guided visit
                                </SelectItem>
                                <SelectItem value="DROP_OFF">
                                  Drop-off only / self-guided visit
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex flex-col gap-1">
                            <Label className="text-[0.7rem] font-semibold text-muted-foreground">
                              Expected Duration
                            </Label>
                            <Input
                              value={cfg.expectedDuration}
                              onChange={(e) =>
                                updatePlaceConfig(pid, { expectedDuration: e.target.value })
                              }
                              placeholder="e.g. 1.5 hours"
                              className="h-8 text-xs"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <Label className="text-[0.7rem] font-semibold text-muted-foreground">
                              Entry Fee Policy *
                            </Label>
                            <Select
                              value={cfg.entryFeeStatus}
                              onValueChange={(val: PlaceEntryFeeStatus) =>
                                updatePlaceConfig(pid, { entryFeeStatus: val })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="INCLUDED">Included in tour price</SelectItem>
                                <SelectItem value="EXCLUDED">Excluded (Paid separately)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex flex-col gap-1">
                            <Label className="text-[0.7rem] font-semibold text-muted-foreground">
                              {cfg.entryFeeStatus === "INCLUDED" ? "Included Fee (₹)" : "Estimated Fee (₹)"}
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              value={cfg.entryFeeAmount}
                              onChange={(e) =>
                                updatePlaceConfig(pid, {
                                  entryFeeAmount: Number(e.target.value) || 0,
                                })
                              }
                              placeholder="₹ per person"
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>

                        {draft.pricingMode === "PLACE_BASED" && (
                          <div className="flex items-center gap-2 pt-1 border-t">
                            <Label className="text-xs font-semibold">Individual Place Price (₹):</Label>
                            <Input
                              type="number"
                              min={0}
                              className="w-32 h-7 text-xs"
                              value={draft.placePrices[pid] ?? 0}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0;
                                setDraft({
                                  ...draft,
                                  placePrices: { ...draft.placePrices, [pid]: val },
                                });
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Places Picker */}
              <div className="rounded-xl border p-4 bg-muted/20">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Add Places to Package
                </h4>
                <PackagePlacePicker
                  draft={draft}
                  onChange={(placeIds, places) =>
                    setDraft((current) =>
                      current ? { ...current, placeIds, places } : current
                    )
                  }
                />
              </div>
            </div>
          )}

          {/* TAB 3: MEALS & FOOD */}
          {activeTab === "meals" && (
            <div className="flex flex-col gap-4 animate-in fade-in-50">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Meals & Food Policy</h4>
                <p className="text-xs text-muted-foreground">
                  Choose exactly one top-level option for food and meal services in this package.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  {
                    id: "INCLUDED",
                    label: "Included in package",
                    desc: "Meals are provided and covered in the tour price.",
                  },
                  {
                    id: "ON_REQUEST",
                    label: "Can be arranged if requested",
                    desc: "Optional arrangement. Payable/confirmed separately.",
                  },
                  {
                    id: "NO_SERVICE",
                    label: "No such service",
                    desc: "Meals are not provided or arranged through this package.",
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setDraft({ ...draft, mealsService: opt.id as MealsServiceOption })
                    }
                    className={cn(
                      "flex flex-col gap-1 rounded-xl border p-3.5 text-left transition-all",
                      draft.mealsService === opt.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted/40"
                    )}
                  >
                    <span className="text-xs font-bold text-foreground">{opt.label}</span>
                    <span className="text-[0.7rem] text-muted-foreground">{opt.desc}</span>
                  </button>
                ))}
              </div>

              {draft.mealsService === "INCLUDED" && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-3">
                  <Label className="text-xs font-bold text-foreground">
                    Select Which Meals Are Included:
                  </Label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {["Breakfast", "Lunch", "Snacks", "Dinner"].map((meal) => {
                      const checked = draft.includedMeals.includes(meal);
                      return (
                        <label
                          key={meal}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer text-xs font-medium transition-colors",
                            checked
                              ? "border-primary bg-primary text-primary-foreground font-semibold"
                              : "border-border bg-card hover:bg-muted"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleMeal(meal)}
                            className="sr-only"
                          />
                          <span>{meal}</span>
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex flex-col gap-1 pt-2">
                    <Label htmlFor="meal-details" className="text-xs font-semibold">
                      Meal Details & Dietary Notes (Optional)
                    </Label>
                    <Textarea
                      id="meal-details"
                      rows={2}
                      value={draft.mealDetails}
                      onChange={(e) => setDraft({ ...draft, mealDetails: e.target.value })}
                      placeholder="e.g. Traditional South Indian thali lunch; vegetarian and vegan options available upon notice."
                      className="text-xs"
                    />
                  </div>
                </div>
              )}

              {draft.mealsService === "ON_REQUEST" && (
                <div className="rounded-xl border p-4 bg-muted/20 flex flex-col gap-2">
                  <Label htmlFor="meal-details-request" className="text-xs font-semibold">
                    Request Conditions & Pricing
                  </Label>
                  <Textarea
                    id="meal-details-request"
                    rows={2}
                    value={draft.mealDetails}
                    onChange={(e) => setDraft({ ...draft, mealDetails: e.target.value })}
                    placeholder="Specify available meal options, expected additional cost (e.g. ₹350/person), and lead time required."
                    className="text-xs"
                  />
                  <p className="text-[0.7rem] text-muted-foreground">
                    Travellers will see that meals are not automatically included and must be confirmed prior to the tour.
                  </p>
                </div>
              )}

              {draft.mealsService === "NO_SERVICE" && (
                <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                  Travellers will be informed that meals are not provided or arranged as part of this tour.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: TRANSPORT */}
          {activeTab === "transport" && (
            <div className="flex flex-col gap-4 animate-in fade-in-50">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Transport Configuration</h4>
                <p className="text-xs text-muted-foreground">
                  Choose exactly one top-level option for transport in this package.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  {
                    id: "INCLUDED",
                    label: "Included in package",
                    desc: "Dedicated transport is provided and included in tour price.",
                  },
                  {
                    id: "ON_REQUEST",
                    label: "Can be arranged if requested",
                    desc: "Available upon customer request; quoted and confirmed separately.",
                  },
                  {
                    id: "NO_SERVICE",
                    label: "No such service",
                    desc: "Transport is not provided. Customers travel independently.",
                  },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setDraft({ ...draft, transportService: opt.id as TransportServiceOption })
                    }
                    className={cn(
                      "flex flex-col gap-1 rounded-xl border p-3.5 text-left transition-all",
                      draft.transportService === opt.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-muted/40"
                    )}
                  >
                    <span className="text-xs font-bold text-foreground">{opt.label}</span>
                    <span className="text-[0.7rem] text-muted-foreground">{opt.desc}</span>
                  </button>
                ))}
              </div>

              {draft.transportService === "INCLUDED" && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold text-foreground">Configured Vehicles</h5>
                      <p className="text-[0.7rem] text-muted-foreground">
                        Define vehicle types and capacities provided for this package.
                      </p>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={addVehicle} className="h-8 text-xs">
                      <Plus className="size-3.5 mr-1" /> Add Vehicle
                    </Button>
                  </div>

                  {draft.transportVehicles.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                      No vehicles configured. Click &ldquo;Add Vehicle&rdquo; to add a Car, Minibus, or Bus.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {draft.transportVehicles.map((vehicle, vIndex) => (
                        <div
                          key={vIndex}
                          className="rounded-xl border border-border bg-card p-3 shadow-xs flex flex-col gap-2.5"
                        >
                          <div className="flex items-center justify-between border-b pb-2">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <Car className="size-3.5 text-primary" /> Vehicle #{vIndex + 1}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-6 text-destructive"
                              onClick={() => removeVehicle(vIndex)}
                            >
                              <X className="size-3.5" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                            <div className="flex flex-col gap-1">
                              <Label className="text-[0.7rem] font-semibold">Vehicle Type</Label>
                              <Select
                                value={vehicle.type}
                                onValueChange={(val: any) => updateVehicle(vIndex, { type: val })}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Car">Car / Sedan</SelectItem>
                                  <SelectItem value="Minibus">Minibus / Tempo</SelectItem>
                                  <SelectItem value="Bus">Coach / Bus</SelectItem>
                                  <SelectItem value="Van">Van / SUV</SelectItem>
                                  <SelectItem value="Other">Other</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex flex-col gap-1">
                              <Label className="text-[0.7rem] font-semibold">Max Passenger Capacity</Label>
                              <Input
                                type="number"
                                min={1}
                                value={vehicle.capacity}
                                onChange={(e) =>
                                  updateVehicle(vIndex, { capacity: Number(e.target.value) || 1 })
                                }
                                className="h-8 text-xs"
                              />
                            </div>

                            <div className="flex flex-col gap-1">
                              <Label className="text-[0.7rem] font-semibold">Vehicle Arrangement</Label>
                              <Select
                                value={vehicle.isPrivate ? "private" : "shared"}
                                onValueChange={(val) =>
                                  updateVehicle(vIndex, { isPrivate: val === "private" })
                                }
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="private">Private Vehicle (Tour only)</SelectItem>
                                  <SelectItem value="shared">Shared Transport</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                            <div className="flex flex-col gap-1">
                              <Label className="text-[0.7rem] font-semibold">Included Transport Charges</Label>
                              <Input
                                value={vehicle.chargesIncluded || ""}
                                onChange={(e) =>
                                  updateVehicle(vIndex, { chargesIncluded: e.target.value })
                                }
                                placeholder="e.g. Fuel, Driver allowance, AC"
                                className="h-8 text-xs"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <Label className="text-[0.7rem] font-semibold">Excluded Transport Charges</Label>
                              <Input
                                value={vehicle.chargesExcluded || ""}
                                onChange={(e) =>
                                  updateVehicle(vIndex, { chargesExcluded: e.target.value })
                                }
                                placeholder="e.g. Interstate toll permits, parking fee"
                                className="h-8 text-xs"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {draft.transportService === "ON_REQUEST" && (
                <div className="rounded-xl border p-4 bg-muted/20 flex flex-col gap-2">
                  <Label htmlFor="transport-details-request" className="text-xs font-semibold">
                    Request Details & Pricing
                  </Label>
                  <Textarea
                    id="transport-details-request"
                    rows={2}
                    value={draft.transportDetails}
                    onChange={(e) => setDraft({ ...draft, transportDetails: e.target.value })}
                    placeholder="Specify available vehicle options, rates (e.g. ₹2000 for AC sedan), and confirmation policy."
                    className="text-xs"
                  />
                  <p className="text-[0.7rem] text-muted-foreground">
                    Customer can request transport when booking; confirmation and payment will be arranged accordingly.
                  </p>
                </div>
              )}

              {draft.transportService === "NO_SERVICE" && (
                <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">
                  Transport is not provided or arranged through this package. Travellers meet at the pickup point or travel independently.
                </div>
              )}
            </div>
          )}

          {/* TAB 5: SPECIFIC GUIDE */}
          {activeTab === "guide" && (
            <div className="flex flex-col gap-4 animate-in fade-in-50">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Specific Guide Assignment</h4>
                <p className="text-xs text-muted-foreground">
                  Choose whether a dedicated Place/Specific Guide is included in this package.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, hasSpecificGuide: false, specificGuideId: null })}
                  className={cn(
                    "flex flex-col gap-1 rounded-xl border p-3.5 text-left transition-all",
                    !draft.hasSpecificGuide
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/40"
                  )}
                >
                  <span className="text-xs font-bold text-foreground">No Specific Guide included</span>
                  <span className="text-[0.7rem] text-muted-foreground">
                    This package is led solely by the Tour Guide without a dedicated place guide.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, hasSpecificGuide: true })}
                  className={cn(
                    "flex flex-col gap-1 rounded-xl border p-3.5 text-left transition-all",
                    draft.hasSpecificGuide
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/40"
                  )}
                >
                  <span className="text-xs font-bold text-foreground">Specific Guide included</span>
                  <span className="text-[0.7rem] text-muted-foreground">
                    Include an approved expert Specific Guide to accompany travellers at designated places.
                  </span>
                </button>
              </div>

              {draft.hasSpecificGuide && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="specific-guide-select" className="text-xs font-bold">
                      Select Approved Specific Guide *
                    </Label>
                    <Select
                      value={draft.specificGuideId || ""}
                      onValueChange={(val) => setDraft({ ...draft, specificGuideId: val || null })}
                    >
                      <SelectTrigger id="specific-guide-select" className="h-9 text-xs bg-card">
                        <SelectValue placeholder={loadingGuides ? "Loading guides..." : "Choose a specific guide"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableGuides.map((guide) => {
                          const gName = guide.name || guide.full_name;
                          const gCost = guide.pricePerDay ?? guide.cost ?? 0;
                          return (
                            <SelectItem key={guide.id} value={guide.id}>
                              {gName} {guide.agencyName ? `(${guide.agencyName})` : ""} - ₹{gCost}/day
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedSpecificGuide && (
                    <div className="rounded-xl border border-border bg-card p-3.5 shadow-xs flex items-start gap-3 mt-1">
                      {selectedSpecificGuide.profilePic || selectedSpecificGuide.profile_pic ? (
                        <img
                          src={(selectedSpecificGuide.profilePic || selectedSpecificGuide.profile_pic)!}
                          alt={selectedSpecificGuide.name || selectedSpecificGuide.full_name}
                          className="size-12 rounded-full object-cover shrink-0 border"
                        />
                      ) : (
                        <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold shrink-0">
                          {(selectedSpecificGuide.name || selectedSpecificGuide.full_name).slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-foreground">
                            {selectedSpecificGuide.name || selectedSpecificGuide.full_name}
                          </span>
                          <Badge variant="secondary" className="text-[0.65rem]">
                            {(selectedSpecificGuide.experienceYears ?? selectedSpecificGuide.experience ?? 1)}+ yrs exp
                          </Badge>
                        </div>
                        {selectedSpecificGuide.tagline && (
                          <p className="text-[0.7rem] text-muted-foreground italic truncate">
                            &ldquo;{selectedSpecificGuide.tagline}&rdquo;
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 text-[0.7rem] text-muted-foreground mt-1">
                          {((selectedSpecificGuide.languages || selectedSpecificGuide.language) ?? []).length > 0 && (
                            <span>Languages: {((selectedSpecificGuide.languages || selectedSpecificGuide.language) ?? []).join(", ")}</span>
                          )}
                          <span>Rate: ₹{selectedSpecificGuide.pricePerDay ?? selectedSpecificGuide.cost ?? 0}/day</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: CHILDREN & AGE LIMITS */}
          {activeTab === "children" && (
            <div className="flex flex-col gap-4 animate-in fade-in-50">
              <div>
                <h4 className="text-sm font-semibold text-foreground">Children & Age Policies</h4>
                <p className="text-xs text-muted-foreground">
                  Configure whether children are permitted on this tour, age limits, capacity counting, and child pricing.
                </p>
              </div>

              <div className="flex items-center gap-3 rounded-xl border p-3.5 bg-muted/20">
                <input
                  type="checkbox"
                  id="children-allowed"
                  checked={draft.childrenAllowed}
                  onChange={(e) => setDraft({ ...draft, childrenAllowed: e.target.checked })}
                  className="size-4 rounded border-border text-primary focus:ring-ring"
                />
                <div className="flex flex-col">
                  <Label htmlFor="children-allowed" className="text-xs font-bold cursor-pointer">
                    Children Allowed on This Package
                  </Label>
                  <p className="text-[0.7rem] text-muted-foreground">
                    When disabled, the customer booking modal will lock children selection to 0.
                  </p>
                </div>
              </div>

              {draft.childrenAllowed ? (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col gap-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="child-max-age" className="text-xs font-semibold">
                        Maximum Child Age (Years)
                      </Label>
                      <Input
                        id="child-max-age"
                        type="number"
                        min={1}
                        max={17}
                        value={draft.childMaxAge}
                        onChange={(e) =>
                          setDraft({ ...draft, childMaxAge: Number(e.target.value) || 12 })
                        }
                        className="h-8 text-xs bg-card"
                      />
                      <span className="text-[0.65rem] text-muted-foreground">
                        Travellers above this age count as adults.
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <Label htmlFor="max-children" className="text-xs font-semibold">
                        Max Children Allowed per Booking
                      </Label>
                      <Input
                        id="max-children"
                        type="number"
                        min={1}
                        value={draft.maxChildren}
                        onChange={(e) =>
                          setDraft({ ...draft, maxChildren: Number(e.target.value) || 4 })
                        }
                        className="h-8 text-xs bg-card"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <Label htmlFor="child-price" className="text-xs font-semibold">
                        Child Price (₹ per child)
                      </Label>
                      <Input
                        id="child-price"
                        type="number"
                        min={0}
                        value={draft.childPrice}
                        onChange={(e) =>
                          setDraft({ ...draft, childPrice: Number(e.target.value) || 0 })
                        }
                        placeholder="0 (Free or discount)"
                        className="h-8 text-xs bg-card"
                      />
                      <span className="text-[0.65rem] text-muted-foreground">
                        Applies when pricing unit is Per Person.
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      id="child-capacity"
                      checked={draft.childrenCountTowardCapacity}
                      onChange={(e) =>
                        setDraft({ ...draft, childrenCountTowardCapacity: e.target.checked })
                      }
                      className="size-4 rounded border-border text-primary focus:ring-ring"
                    />
                    <Label htmlFor="child-capacity" className="text-xs font-medium cursor-pointer">
                      Children count towards total passenger & vehicle capacity
                    </Label>
                  </div>

                  <div className="flex flex-col gap-1 pt-1">
                    <Label htmlFor="child-conditions" className="text-xs font-semibold">
                      Applicable Child Conditions & Restrictions
                    </Label>
                    <Input
                      id="child-conditions"
                      value={draft.childConditions}
                      onChange={(e) => setDraft({ ...draft, childConditions: e.target.value })}
                      placeholder="e.g. Children must be accompanied by an adult guardian at all times."
                      className="h-8 text-xs bg-card"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-xs text-destructive">
                  Adults-only tour: Children are not permitted to book or participate in this package.
                </div>
              )}
            </div>
          )}

          {/* Form Error Message */}
          {formError && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-2">
              <Info className="size-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Footer Save & Cancel Buttons */}
          <div className="flex items-center justify-end gap-2 border-t pt-4">
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
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Saving…" : draft.id ? "Save Changes" : "Create Package"}
            </Button>
          </div>
        </div>
      ) : null}

      {/* Package List */}
      {items.length === 0 && draft === null ? (
        <EmptyState
          className="p-8"
          icon={Route}
          title="No tour packages yet"
          description="Create comprehensive packages grouping places, meals, transport, and guide services."
          action={
            <Button type="button" onClick={openCreate}>
              <Plus className="size-4 mr-1.5" />
              Create First Package
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((pkg) => (
            <div
              key={pkg.id}
              className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs transition-shadow hover:shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Route className="size-4 shrink-0 text-primary" />
                    <h3 className="text-sm font-bold text-foreground break-words">{pkg.name}</h3>
                    {pkg.duration && (
                      <Badge variant="outline" className="text-[0.65rem] gap-1">
                        <Clock className="size-3" />
                        {pkg.duration}
                      </Badge>
                    )}
                  </div>
                  {pkg.description ? (
                    <p className="text-xs text-muted-foreground line-clamp-2">{pkg.description}</p>
                  ) : null}
                </div>

                {/* Actions: View Details, Edit, Delete */}
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1"
                    onClick={() => setViewingPackage(pkg)}
                  >
                    <Eye className="size-3.5" />
                    View Details
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                    aria-label={`Edit ${pkg.name}`}
                    onClick={() => openEdit(pkg)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                        aria-label={`Delete ${pkg.name}`}
                        disabled={deletingId === pkg.id}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    }
                    title={`Delete ${pkg.name}?`}
                    description="The package is removed from every place it lists. Places you already cover stay on your profile."
                    confirmLabel="Delete package"
                    onConfirm={() => remove(pkg.id)}
                  />
                </div>
              </div>

              {/* Badges Bar */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <Badge variant="info" className="font-bold">
                  ₹{pkg.price} {pkg.pricingUnit === "PER_PERSON" ? "/ person" : "/ tour"}
                </Badge>
                <Badge variant="secondary">
                  {pkg.pricingMode === "WHOLE_TOUR" ? "Whole Tour" : "Place Based"}
                </Badge>
                {pkg.maxGroupSize && (
                  <Badge variant="outline" className="gap-1">
                    <Users className="size-3" /> Max {pkg.maxGroupSize} guests
                  </Badge>
                )}
                {pkg.mealsService === "INCLUDED" ? (
                  <Badge variant="success" className="gap-1">
                    <Utensils className="size-3" /> Meals Included
                  </Badge>
                ) : pkg.mealsService === "ON_REQUEST" ? (
                  <Badge variant="outline" className="gap-1">
                    <Utensils className="size-3" /> Meals on request
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-muted-foreground gap-1">
                    <Utensils className="size-3" /> No meals
                  </Badge>
                )}
                {pkg.transportService === "INCLUDED" ? (
                  <Badge variant="success" className="gap-1">
                    <Car className="size-3" /> Transport Included
                  </Badge>
                ) : pkg.transportService === "ON_REQUEST" ? (
                  <Badge variant="outline" className="gap-1">
                    <Car className="size-3" /> Transport on request
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-muted-foreground gap-1">
                    <Car className="size-3" /> No transport
                  </Badge>
                )}
                {pkg.hasSpecificGuide ? (
                  <Badge variant="info" className="gap-1">
                    <UserCheck className="size-3" /> Specific Guide Included
                  </Badge>
                ) : null}
                {pkg.childrenAllowed ? (
                  <Badge variant="outline" className="gap-1 text-[0.65rem]">
                    <Baby className="size-3" /> Children up to {pkg.childMaxAge || 12}y
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="gap-1 text-[0.65rem]">
                    <Baby className="size-3" /> Adults only
                  </Badge>
                )}
              </div>

              {/* Included Places List */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t text-xs">
                <span className="text-[0.7rem] font-semibold text-muted-foreground">Itinerary stops:</span>
                {pkg.places.map((place, pIndex) => (
                  <Badge key={place.id} variant="outline" className="gap-1 text-[0.7rem]">
                    <span className="font-bold text-primary">{pIndex + 1}.</span>
                    {place.name}
                    {place.visitArrangement === "DROP_OFF" ? (
                      <span className="text-[0.6rem] text-muted-foreground">(Drop-off)</span>
                    ) : (
                      <span className="text-[0.6rem] text-primary">(Guided)</span>
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW PACKAGE DETAILS DIALOG */}
      {viewingPackage && (
        <Dialog open={Boolean(viewingPackage)} onOpenChange={() => setViewingPackage(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <Route className="size-4 text-primary" /> {viewingPackage.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Authoritative package details and saved configuration.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4 text-xs py-2">
              {viewingPackage.description && (
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-foreground leading-relaxed">{viewingPackage.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 rounded-xl border p-3 bg-card">
                <div>
                  <span className="text-[0.65rem] text-muted-foreground uppercase font-bold">Price</span>
                  <p className="font-bold text-primary text-sm">
                    ₹{viewingPackage.price} {viewingPackage.pricingUnit === "PER_PERSON" ? "/ person" : "/ tour"}
                  </p>
                </div>
                <div>
                  <span className="text-[0.65rem] text-muted-foreground uppercase font-bold">Duration</span>
                  <p className="font-semibold">{viewingPackage.duration || "Full Day"}</p>
                </div>
                <div>
                  <span className="text-[0.65rem] text-muted-foreground uppercase font-bold">Max Guests</span>
                  <p className="font-semibold">{viewingPackage.maxGroupSize || "Standard"} guests</p>
                </div>
                <div>
                  <span className="text-[0.65rem] text-muted-foreground uppercase font-bold">Start Time</span>
                  <p className="font-semibold">{viewingPackage.tripStartTime || "09:00 AM"}</p>
                </div>
              </div>

              {/* Itinerary */}
              <div className="flex flex-col gap-2 rounded-xl border p-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Route className="size-3.5 text-primary" /> Stops & Itinerary ({viewingPackage.places.length})
                </h4>
                <div className="flex flex-col gap-2">
                  {viewingPackage.places.map((place, idx) => (
                    <div key={place.id} className="flex items-center justify-between rounded-lg border p-2 bg-muted/20">
                      <div className="flex items-center gap-2">
                        <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[0.65rem] font-bold">
                          {idx + 1}
                        </span>
                        <span className="font-semibold">{place.name}</span>
                        <Badge variant="outline" className="text-[0.65rem]">
                          {place.visitArrangement === "DROP_OFF" ? "Drop-off only" : "Guided visit"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-[0.7rem] text-muted-foreground">
                        <span>{place.expectedDuration || "1h"}</span>
                        <Badge variant={place.entryFeeStatus === "INCLUDED" ? "success" : "secondary"} className="text-[0.65rem]">
                          Entry fee: {place.entryFeeStatus === "INCLUDED" ? "Included" : "Excluded"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Meals & Transport breakdown */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border p-3 flex flex-col gap-1.5">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Utensils className="size-3.5 text-primary" /> Meals
                  </h4>
                  <p className="font-semibold">
                    {viewingPackage.mealsService === "INCLUDED"
                      ? `Included: ${viewingPackage.includedMeals.join(", ") || "Meals included"}`
                      : viewingPackage.mealsService === "ON_REQUEST"
                      ? "Available upon request (additional charges apply)"
                      : "No meal service provided"}
                  </p>
                  {viewingPackage.mealDetails && (
                    <p className="text-[0.7rem] text-muted-foreground">{viewingPackage.mealDetails}</p>
                  )}
                </div>

                <div className="rounded-xl border p-3 flex flex-col gap-1.5">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Car className="size-3.5 text-primary" /> Transport
                  </h4>
                  <p className="font-semibold">
                    {viewingPackage.transportService === "INCLUDED"
                      ? "Included with package"
                      : viewingPackage.transportService === "ON_REQUEST"
                      ? "Available upon request (additional charges apply)"
                      : "No transport service provided"}
                  </p>
                  {Array.isArray(viewingPackage.transportVehicles) && viewingPackage.transportVehicles.length > 0 && (
                    <div className="text-[0.7rem] text-muted-foreground flex flex-col gap-0.5">
                      {viewingPackage.transportVehicles.map((v, i) => (
                        <span key={i}>
                          • {v.type} ({v.capacity} seats, {v.isPrivate ? "Private" : "Shared"})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Specific Guide Details */}
              {viewingPackage.hasSpecificGuide && viewingPackage.specificGuide && (
                <div className="rounded-xl border p-3 flex items-center gap-3 bg-muted/20">
                  <UserCheck className="size-6 text-primary shrink-0" />
                  <div>
                    <h5 className="font-bold text-xs">
                      Included Specific Guide: {viewingPackage.specificGuide.name || viewingPackage.specificGuide.full_name}
                    </h5>
                    <p className="text-[0.7rem] text-muted-foreground">
                      {((viewingPackage.specificGuide.languages || viewingPackage.specificGuide.language) ?? []).join(", ")} •{" "}
                      {(viewingPackage.specificGuide.experienceYears ?? viewingPackage.specificGuide.experience ?? 1)}+ years experience
                    </p>
                  </div>
                </div>
              )}

              {/* Pickup & Cancellation */}
              <div className="rounded-xl border p-3 flex flex-col gap-1.5 bg-muted/10">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Meeting Point: {viewingPackage.pickupName || "To be confirmed"}</span>
                  {viewingPackage.pickupMapsUrl && (
                    <a
                      href={viewingPackage.pickupMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[0.7rem] text-primary font-semibold hover:underline"
                    >
                      <ExternalLink className="size-3" /> Open in Maps
                    </a>
                  )}
                </div>
                {viewingPackage.pickupAddress && (
                  <p className="text-[0.7rem] text-muted-foreground">{viewingPackage.pickupAddress}</p>
                )}
                <p className="text-[0.7rem] text-muted-foreground pt-1 border-t">
                  Policy: {viewingPackage.cancellationPolicy || "Standard cancellation terms apply."}
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/** Place picker for districts */
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

  const loaded = places.data?.districtId === districtId ? places.data : null;
  const listed = loaded?.places ?? null;
  const placesError = loaded?.error ?? null;
  const [creating, setCreating] = React.useState(false);

  const districtName = React.useMemo(() => {
    if (!districtId) return null;
    const match = (districts.data ?? []).find((district) => district.id === districtId);
    if (!match) return null;
    return match.state?.name ? `${match.name}, ${match.state.name}` : match.name;
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

  function addCreated(place: ManageablePlace) {
    if (draft.placeIds.includes(place.id)) return;
    onChange([...draft.placeIds, place.id], {
      ...draft.places,
      [place.id]: toPackagePlace(place),
    });
  }

  function deselect(placeId: string) {
    const known = { ...draft.places };
    delete known[placeId];
    onChange(
      draft.placeIds.filter((id) => id !== placeId),
      known
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-1.5">
        <Input
          type="text"
          placeholder="Filter districts (e.g. Mysuru, Bengaluru, Jaipur)…"
          value={districtSearch}
          onChange={(e) => setDistrictSearch(e.target.value)}
          className="text-xs h-8 rounded-lg"
        />
        <Select value={districtId} onValueChange={setDistrictId}>
          <SelectTrigger className="w-full h-8 text-xs">
            <SelectValue
              placeholder={
                districtSearch
                  ? `Matching districts (${filteredDistricts.length})`
                  : "Select a district to view places"
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
          </SelectContent>
        </Select>
      </div>

      {districtId && !listed && !placesError ? (
        <LoadingState label="Loading places in district…" />
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
        <div className="grid max-h-56 gap-1.5 overflow-y-auto rounded-xl border border-border p-2">
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
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors",
                  active ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent"
                )}
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  )}
                >
                  {active ? <Check className="size-3" /> : null}
                </span>
                <span className="min-w-0 flex-1 truncate">{place.name}</span>
                {place.status !== "APPROVED" && (
                  <Badge variant="warning" className="shrink-0 text-[0.6rem]">
                    {place.status === "PENDING" ? "Awaiting review" : "Not live"}
                  </Badge>
                )}
                <Badge variant="outline" className="shrink-0 text-[0.6rem]">
                  {place.category}
                </Badge>
              </button>
            );
          })}
        </div>
      ) : null}

      {districtId && !placesError ? (
        <div className="flex flex-col gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCreating(true)}
            className="h-8 text-xs"
          >
            <Plus className="size-3.5 mr-1" />
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
    </div>
  );
}
