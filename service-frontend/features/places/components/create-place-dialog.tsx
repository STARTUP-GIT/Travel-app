"use client";

import {
  Globe2,
  ImagePlus,
  Info,
  Loader2,
  MapPin,
  Sparkles,
  Ticket,
  Trash2,
  X,
} from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  submitGuidePlace,
  resolveGuidePlaceLocation,
  uploadPlacePhoto,
  loadEnabledStates,
  loadEnabledDistrictsByState,
} from "@/features/provider/api/provider.actions";
import { CategoryMultiSelect } from "@/features/places/components/category-select";
import { AdditionalFeesSection } from "@/features/places/components/additional-fees-section";
import type {
  DistrictRef,
  ManageablePlace,
  PlacePricingBand,
  PlaceAdditionalFee,
} from "@/features/provider/types";
import type { StateRef } from "@/features/locations/api/locations.api";
import { cn } from "@/lib/utils";

const NAME_LIMIT = 120;
const DESCRIPTION_LIMIT = 2000;
const MAX_PHOTOS = 6;

type Photo = { file: File | null; url: string };
type ResolvedCoordinates = { latitude: number; longitude: number };

type EntryFeeType = "FREE" | "PAID" | "UNKNOWN";

export type CreatePlaceFormState = {
  // Location
  stateId: string;
  districtId: string;

  // Basic Info
  name: string;
  description: string;
  categories: string[];

  // Indian Visitor Entry Fees
  entryFeeType: EntryFeeType;
  adultFee: string;
  childFee: string;
  childMaxAge: number;
  entryFeeConditions: string;

  // Additional Fees
  hasAdditionalFees: boolean;
  additionalFees: PlaceAdditionalFee[];

  // Foreign Visitor Entry Fees
  hasForeignPricing: boolean;
  foreignEntryFeeType: EntryFeeType;
  foreignAdultFee: string;
  foreignChildFee: string;
  foreignChildMaxAge: number;
  foreignEntryFeeConditions: string;

  // Address
  addressLine: string;
  locality: string;
  pincode: string;

  // Google Maps
  mapsUrl: string;

  // Media
  photos: Photo[];
};

function initialFormState(initialDistrictId = "", initialStateId = ""): CreatePlaceFormState {
  return {
    stateId: initialStateId,
    districtId: initialDistrictId,
    name: "",
    description: "",
    categories: [],
    entryFeeType: "UNKNOWN",
    adultFee: "",
    childFee: "",
    childMaxAge: 12,
    entryFeeConditions: "",
    hasAdditionalFees: false,
    additionalFees: [],
    hasForeignPricing: false,
    foreignEntryFeeType: "UNKNOWN",
    foreignAdultFee: "",
    foreignChildFee: "",
    foreignChildMaxAge: 12,
    foreignEntryFeeConditions: "",
    addressLine: "",
    locality: "",
    pincode: "",
    mapsUrl: "",
    photos: [],
  };
}

type FormErrors = {
  stateId?: string;
  districtId?: string;
  name?: string;
  description?: string;
  categories?: string[];
  adultFee?: string;
  childFee?: string;
  foreignAdultFee?: string;
  foreignChildFee?: string;
  pincode?: string;
  mapsUrl?: string;
};

export function CreatePlaceDialog({
  open,
  onOpenChange,
  districtId: propDistrictId,
  districtName: propDistrictName,
  stateId: propStateId,
  districts: initialDistrictsList,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional pre-selected district (e.g. from a package form). */
  districtId?: string;
  districtName?: string;
  stateId?: string;
  /** List of districts when caller already has a list. */
  districts?: { id: string; name: string }[];
  onCreated: (place: ManageablePlace) => void;
}) {
  const [form, setForm] = React.useState<CreatePlaceFormState>(() =>
    initialFormState(propDistrictId ?? "", propStateId ?? "")
  );

  // States & Districts loading
  const [states, setStates] = React.useState<StateRef[]>([]);
  const [loadingStates, setLoadingStates] = React.useState(false);
  const [districts, setDistricts] = React.useState<DistrictRef[]>([]);
  const [loadingDistricts, setLoadingDistricts] = React.useState(false);

  // Validation & status
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);

  // Maps Link Resolution
  const [resolved, setResolved] = React.useState<
    ({ url: string } & ResolvedCoordinates) | null
  >(null);
  const [resolvingLocation, setResolvingLocation] = React.useState(false);
  const [locationResolutionFailed, setLocationResolutionFailed] = React.useState(false);

  // Revoke blob URLs on teardown
  const revokePhotoUrls = React.useCallback((photos: Photo[]) => {
    photos.forEach((photo) => {
      if (photo.file && photo.url.startsWith("blob:")) {
        URL.revokeObjectURL(photo.url);
      }
    });
  }, []);

  const reset = React.useCallback(() => {
    revokePhotoUrls(form.photos);
    setForm(initialFormState());
    setErrors({});
    setFormError(null);
    setResolved(null);
    setLocationResolutionFailed(false);
  }, [form.photos, revokePhotoUrls]);

  // Load enabled states when dialog opens
  React.useEffect(() => {
    if (!open) return;
    let active = true;
    setLoadingStates(true);
    void loadEnabledStates().then((res) => {
      if (!active) return;
      setLoadingStates(false);
      if (res.ok && res.data) {
        setStates(res.data);
      }
    });
    return () => {
      active = false;
    };
  }, [open]);

  // If propDistrictId or propStateId provided, initialize
  React.useEffect(() => {
    if (open) {
      if (propStateId) {
        setForm((prev) => ({ ...prev, stateId: propStateId }));
      }
      if (propDistrictId) {
        setForm((prev) => ({ ...prev, districtId: propDistrictId }));
      }
    }
  }, [open, propDistrictId, propStateId]);

  // Load districts whenever stateId changes
  React.useEffect(() => {
    if (!form.stateId) {
      setDistricts([]);
      return;
    }
    let active = true;
    setLoadingDistricts(true);
    void loadEnabledDistrictsByState(form.stateId).then((res) => {
      if (!active) return;
      setLoadingDistricts(false);
      if (res.ok && res.data) {
        setDistricts(res.data);
      } else {
        setDistricts([]);
      }
    });
    return () => {
      active = false;
    };
  }, [form.stateId]);

  // Handle Google Maps link resolution debounced
  React.useEffect(() => {
    const url = form.mapsUrl.trim();
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
        if (result.ok && result.data) {
          setResolved({ url, ...result.data });
        } else {
          setLocationResolutionFailed(true);
        }
      });
    }, 500);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [form.mapsUrl]);

  function updateField<K extends keyof CreatePlaceFormState>(
    key: K,
    value: CreatePlaceFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
    setFormError(null);
  }

  function handleStateChange(newStateId: string) {
    updateField("stateId", newStateId);
    // Clear district when state changes as per Rule 1
    updateField("districtId", "");
  }

  function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_PHOTOS - form.photos.length;
    if (remaining <= 0) {
      toast.error(`A place can have at most ${MAX_PHOTOS} photos.`);
      return;
    }

    const next: Photo[] = Array.from(files)
      .slice(0, remaining)
      .map((file) => ({ file, url: URL.createObjectURL(file) }));

    updateField("photos", [...form.photos, ...next]);
  }

  function removePhoto(index: number) {
    const photo = form.photos[index];
    if (photo?.file && photo.url.startsWith("blob:")) {
      URL.revokeObjectURL(photo.url);
    }
    updateField(
      "photos",
      form.photos.filter((_, at) => at !== index)
    );
  }

  function validateForm(): Record<string, string> {
    const found: Record<string, string> = {};

    if (!form.stateId) {
      found.stateId = "Please select a state.";
    }

    if (!form.districtId) {
      found.districtId = "Please select a district belonging to this state.";
    }

    if (form.name.trim().length < 2) {
      found.name = "Give the place a name of at least 2 characters.";
    } else if (form.name.trim().length > NAME_LIMIT) {
      found.name = `Keep name under ${NAME_LIMIT} characters.`;
    }

    if (form.description.trim().length < 10) {
      found.description = "Describe what makes this place worth visiting (at least 10 characters).";
    } else if (form.description.trim().length > DESCRIPTION_LIMIT) {
      found.description = `Keep description under ${DESCRIPTION_LIMIT} characters.`;
    }

    if (form.categories.length === 0) {
      found.categories = "Select or enter at least one category.";
    }

    // Indian Visitor Fee validation
    if (form.entryFeeType === "PAID") {
      if (form.adultFee.trim() === "") {
        found.adultFee = "Enter the adult entry fee amount (₹).";
      } else {
        const val = Number(form.adultFee);
        if (!Number.isFinite(val) || val < 0) {
          found.adultFee = "Adult fee must be a valid non-negative number.";
        }
      }

      if (form.childFee.trim() !== "") {
        const val = Number(form.childFee);
        if (!Number.isFinite(val) || val < 0) {
          found.childFee = "Child fee must be a valid non-negative number.";
        }
      }
    }

    // Foreign Visitor Fee validation if enabled
    if (form.hasForeignPricing && form.foreignEntryFeeType === "PAID") {
      if (form.foreignAdultFee.trim() === "") {
        found.foreignAdultFee = "Enter the foreign adult entry fee amount (₹).";
      } else {
        const val = Number(form.foreignAdultFee);
        if (!Number.isFinite(val) || val < 0) {
          found.foreignAdultFee = "Foreign adult fee must be a valid non-negative number.";
        }
      }

      if (form.foreignChildFee.trim() !== "") {
        const val = Number(form.foreignChildFee);
        if (!Number.isFinite(val) || val < 0) {
          found.foreignChildFee = "Foreign child fee must be a valid non-negative number.";
        }
      }
    }

    // Maps link check: only invalid if user provided a URL and it could not be resolved
    if (form.mapsUrl.trim() && locationResolutionFailed) {
      found.mapsUrl = "Could not resolve coordinates from this link. Please check the URL.";
    }

    // PIN code check
    if (form.pincode.trim() && !/^\d{6}$/.test(form.pincode.trim())) {
      found.pincode = "Enter a valid 6-digit PIN code or leave blank.";
    }

    return found;
  }

  async function handleSave() {
    const errs = validateForm();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast.error("Please fix the highlighted fields");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      // 1. Upload photos first
      const images: string[] = [];
      for (const photo of form.photos) {
        if (photo.file) {
          setUploading(true);
          const uploaded = await uploadPlacePhoto(photo.file);
          setUploading(false);
          if (!uploaded.ok) {
            setFormError(uploaded.message);
            toast.error(uploaded.message);
            setSaving(false);
            return;
          }
          images.push(uploaded.data);
          continue;
        }
        if (photo.url) {
          images.push(photo.url);
        }
      }

      // 2. Parse domestic fee numbers
      let entryfee: number | null = null;
      let childEntryFee: number | null = null;
      if (form.entryFeeType === "PAID") {
        entryfee = form.adultFee.trim() !== "" ? Number(form.adultFee) : 0;
        childEntryFee = form.childFee.trim() !== "" ? Number(form.childFee) : 0;
      } else if (form.entryFeeType === "FREE") {
        entryfee = 0;
        childEntryFee = 0;
      }

      // 3. Parse foreign fee numbers
      let foreignAdultFee: number | null = null;
      let foreignChildFee: number | null = null;
      if (form.hasForeignPricing) {
        if (form.foreignEntryFeeType === "PAID") {
          foreignAdultFee = form.foreignAdultFee.trim() !== "" ? Number(form.foreignAdultFee) : null;
          foreignChildFee = form.foreignChildFee.trim() !== "" ? Number(form.foreignChildFee) : null;
        } else if (form.foreignEntryFeeType === "FREE") {
          foreignAdultFee = 0;
          foreignChildFee = 0;
        }
      }

      // 4. Coordinates derived from resolved link, or 0,0 for manual address
      const coords = resolved?.url === form.mapsUrl.trim() ? resolved : null;
      const latitude = coords?.latitude ?? 0;
      const longitude = coords?.longitude ?? 0;

      // 5. Build pricing bands for backward compatibility
      const pricingBands: PlacePricingBand[] = [];
      if (form.entryFeeType === "PAID" && entryfee !== null) {
        pricingBands.push({ visitor: "DOMESTIC", ageGroup: "Adult", amount: entryfee });
        if (childEntryFee !== null) {
          pricingBands.push({ visitor: "DOMESTIC", ageGroup: "Child", amount: childEntryFee });
        }
      }
      if (form.hasForeignPricing && form.foreignEntryFeeType === "PAID" && foreignAdultFee !== null) {
        pricingBands.push({ visitor: "FOREIGN", ageGroup: "Adult", amount: foreignAdultFee });
        if (foreignChildFee !== null) {
          pricingBands.push({ visitor: "FOREIGN", ageGroup: "Child", amount: foreignChildFee });
        }
      }

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        districtId: form.districtId,
        stateId: form.stateId,
        images,
        category: form.categories[0] || "Attraction",
        categories: form.categories,
        entryfee,
        entryFeeType: form.entryFeeType,
        childEntryFee,
        childMaxAge: form.childMaxAge,
        entryFeeConditions: form.entryFeeConditions.trim() || null,
        hasForeignPricing: form.hasForeignPricing,
        foreignEntryFeeType: form.hasForeignPricing ? form.foreignEntryFeeType : null,
        foreignAdultFee,
        foreignChildFee,
        foreignChildMaxAge: form.foreignChildMaxAge,
        foreignEntryFeeConditions: form.foreignEntryFeeConditions.trim() || null,
        hasAdditionalFees: form.hasAdditionalFees,
        additionalFees: form.hasAdditionalFees ? form.additionalFees : [],
        addressLine: form.addressLine.trim() || null,
        locality: form.locality.trim() || null,
        pincode: form.pincode.trim() || null,
        mapsUrl: form.mapsUrl.trim() || null,
        latitude,
        longitude,
        ...(pricingBands.length > 0 ? { pricing: pricingBands } : {}),
      };

      const result = await submitGuidePlace(payload);

      if (!result.ok) {
        setFormError(result.message);
        toast.error(result.message);
        return;
      }

      toast.success("Place created successfully!");
      onCreated(result.data);
      reset();
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred while saving.";
      setFormError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
      setSaving(false);
    }
  }

  const selectedStateName = states.find((s) => s.id === form.stateId)?.name;
  const selectedDistrictName = districts.find((d) => d.id === form.districtId)?.name;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) reset();
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add a new place</DialogTitle>
          <DialogDescription>
            Creates an independent, reusable place record. Once saved, it can be
            selected across any of your tour packages.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-2">
          {/* 1. STATE & DISTRICT SELECTION */}
          <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card/50 p-4">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Location & Jurisdiction</h3>
            </div>

            {/* State Field */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-place-state">
                State <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.stateId}
                onValueChange={handleStateChange}
                disabled={loadingStates}
              >
                <SelectTrigger id="create-place-state" className="text-sm">
                  <SelectValue
                    placeholder={
                      loadingStates ? "Loading available states…" : "Select a state"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {states.map((state) => (
                    <SelectItem key={state.id} value={state.id}>
                      {state.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.stateId && (
                <p className="text-xs text-destructive">{errors.stateId}</p>
              )}
            </div>

            {/* District Field */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-place-district">
                District <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.districtId}
                onValueChange={(val) => updateField("districtId", val)}
                disabled={!form.stateId || loadingDistricts}
              >
                <SelectTrigger id="create-place-district" className="text-sm">
                  <SelectValue
                    placeholder={
                      !form.stateId
                        ? "Select a state first"
                        : loadingDistricts
                        ? "Loading districts…"
                        : districts.length === 0
                        ? "No enabled districts in this state"
                        : "Select a district"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {districts.map((district) => (
                    <SelectItem key={district.id} value={district.id}>
                      {district.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.districtId && (
                <p className="text-xs text-destructive">{errors.districtId}</p>
              )}
              {form.stateId && !loadingDistricts && districts.length === 0 && (
                <p className="text-xs text-amber-600">
                  There are no active districts available in {selectedStateName}. Please pick another state.
                </p>
              )}
            </div>
          </section>

          {/* 2. BASIC DETAILS */}
          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-place-name">
                Place name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-place-name"
                value={form.name}
                maxLength={NAME_LIMIT}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g. Mysore Palace, Jog Falls, Amber Fort"
                className="text-sm"
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-place-description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="create-place-description"
                value={form.description}
                maxLength={DESCRIPTION_LIMIT}
                rows={4}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="What makes this place worth visiting, historical significance, what to expect, and recommended visit duration…"
                className="text-sm leading-relaxed"
              />
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description}</p>
              )}
            </div>

            {/* Multiple Categories */}
            <CategoryMultiSelect
              selected={form.categories}
              onChange={(cats) => updateField("categories", cats)}
              error={errors.categories}
            />
          </section>

          {/* 3. INDIAN VISITOR ENTRY FEES */}
          <section className="flex flex-col gap-3.5 rounded-2xl border border-border bg-card/60 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="size-4 text-primary" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Indian Visitor Entry Fees
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Ticket prices for domestic / Indian citizens
                  </p>
                </div>
              </div>

              <div className="w-36">
                <Select
                  value={form.entryFeeType}
                  onValueChange={(val) => updateField("entryFeeType", val as EntryFeeType)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PAID">Paid entry</SelectItem>
                    <SelectItem value="FREE">Free entry</SelectItem>
                    <SelectItem value="UNKNOWN">Not provided</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.entryFeeType === "PAID" && (
              <div className="mt-2 flex flex-col gap-3 rounded-xl border border-border/80 bg-background/50 p-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="create-adult-fee" className="text-xs">
                      Adult entry fee (₹) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="create-adult-fee"
                      type="number"
                      min={0}
                      step="any"
                      value={form.adultFee}
                      onChange={(e) => updateField("adultFee", e.target.value)}
                      placeholder="e.g. 50"
                      className="text-sm"
                    />
                    {errors.adultFee && (
                      <p className="text-xs text-destructive">{errors.adultFee}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="create-child-fee" className="text-xs">
                      Child entry fee (₹)
                    </Label>
                    <Input
                      id="create-child-fee"
                      type="number"
                      min={0}
                      step="any"
                      value={form.childFee}
                      onChange={(e) => updateField("childFee", e.target.value)}
                      placeholder="e.g. 25 (or 0 if free for kids)"
                      className="text-sm"
                    />
                    {errors.childFee && (
                      <p className="text-xs text-destructive">{errors.childFee}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="create-child-max-age" className="text-xs">
                      Maximum child age for child ticket
                    </Label>
                    <span className="text-xs font-semibold text-primary">
                      Up to {form.childMaxAge} years
                    </span>
                  </div>
                  <Select
                    value={String(form.childMaxAge)}
                    onValueChange={(val) => updateField("childMaxAge", Number(val))}
                  >
                    <SelectTrigger id="create-child-max-age" className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 13 }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          {i === 0 ? "Under 1 year (infants only)" : `${i} years and below`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[0.72rem] text-muted-foreground">
                    Children aged {form.childMaxAge} and under pay the child fee. Visitors older than {form.childMaxAge} pay the adult entry fee.
                  </p>
                </div>
              </div>
            )}

            {form.entryFeeType === "FREE" && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                Entry is marked completely free for all Indian visitors.
              </p>
            )}

            {form.entryFeeType === "UNKNOWN" && (
              <p className="text-xs text-muted-foreground">
                Entry fee status is unknown or not configured. It will be clearly indicated to travellers rather than assumed as ₹0.
              </p>
            )}
          </section>

          {/* ADDITIONAL FEES */}
          <AdditionalFeesSection
            enabled={form.hasAdditionalFees}
            onEnabledChange={(enabled) => updateField("hasAdditionalFees", enabled)}
            fees={form.additionalFees}
            onChange={(fees) => updateField("additionalFees", fees)}
          />

          {/* 4. FOREIGN VISITOR ENTRY FEES */}
          <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe2 className="size-4 text-primary" />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Foreign Visitor Entry Fees
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Separate ticketing rules for international tourists
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="toggle-foreign-pricing"
                  checked={form.hasForeignPricing}
                  onCheckedChange={(checked) => updateField("hasForeignPricing", checked)}
                />
                <Label htmlFor="toggle-foreign-pricing" className="cursor-pointer text-xs font-medium">
                  {form.hasForeignPricing ? "Enabled" : "Disabled"}
                </Label>
              </div>
            </div>

            {!form.hasForeignPricing ? (
              <p className="text-xs text-muted-foreground">
                Separate foreign visitor pricing is not configured. When disabled, international pricing is omitted rather than treated as free.
              </p>
            ) : (
              <div className="mt-2 flex flex-col gap-3 rounded-xl border border-border/80 bg-background/50 p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium">Pricing status for foreign visitors</Label>
                  <div className="w-36">
                    <Select
                      value={form.foreignEntryFeeType}
                      onValueChange={(val) =>
                        updateField("foreignEntryFeeType", val as EntryFeeType)
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PAID">Paid entry</SelectItem>
                        <SelectItem value="FREE">Free entry</SelectItem>
                        <SelectItem value="UNKNOWN">Not provided</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {form.foreignEntryFeeType === "PAID" && (
                  <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="create-foreign-adult-fee" className="text-xs">
                          Foreign adult fee (₹) <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="create-foreign-adult-fee"
                          type="number"
                          min={0}
                          step="any"
                          value={form.foreignAdultFee}
                          onChange={(e) => updateField("foreignAdultFee", e.target.value)}
                          placeholder="e.g. 500"
                          className="text-sm"
                        />
                        {errors.foreignAdultFee && (
                          <p className="text-xs text-destructive">{errors.foreignAdultFee}</p>
                        )}
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="create-foreign-child-fee" className="text-xs">
                          Foreign child fee (₹)
                        </Label>
                        <Input
                          id="create-foreign-child-fee"
                          type="number"
                          min={0}
                          step="any"
                          value={form.foreignChildFee}
                          onChange={(e) => updateField("foreignChildFee", e.target.value)}
                          placeholder="e.g. 250 (or 0 if free)"
                          className="text-sm"
                        />
                        {errors.foreignChildFee && (
                          <p className="text-xs text-destructive">{errors.foreignChildFee}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="create-foreign-child-max-age" className="text-xs">
                          Maximum child age for foreign child ticket
                        </Label>
                        <span className="text-xs font-semibold text-primary">
                          Up to {form.foreignChildMaxAge} years
                        </span>
                      </div>
                      <Select
                        value={String(form.foreignChildMaxAge)}
                        onValueChange={(val) =>
                          updateField("foreignChildMaxAge", Number(val))
                        }
                      >
                        <SelectTrigger id="create-foreign-child-max-age" className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 13 }, (_, i) => (
                            <SelectItem key={i} value={String(i)}>
                              {i === 0 ? "Under 1 year (infants only)" : `${i} years and below`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[0.72rem] text-muted-foreground">
                        Foreign children aged {form.foreignChildMaxAge} and under pay the child fee. Visitors older than {form.foreignChildMaxAge} pay the foreign adult fee.
                      </p>
                    </div>

                    <div className="flex flex-col gap-1">
                      <Label htmlFor="create-foreign-fee-notes" className="text-xs">
                        Foreign fee conditions or notes (optional)
                      </Label>
                      <Input
                        id="create-foreign-fee-notes"
                        value={form.foreignEntryFeeConditions}
                        onChange={(e) => updateField("foreignEntryFeeConditions", e.target.value)}
                        placeholder="e.g. Passport required at entrance"
                        className="text-xs"
                      />
                    </div>
                  </>
                )}

                {form.foreignEntryFeeType === "FREE" && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">
                    Entry is explicitly marked free for foreign visitors.
                  </p>
                )}

                {form.foreignEntryFeeType === "UNKNOWN" && (
                  <p className="text-xs text-muted-foreground">
                    Foreign entry fee is not configured or unknown.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* 5. PLACE ADDRESS & GOOGLE MAPS LOCATION */}
          <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-4">
            <div className="flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              <div>
                <h3 className="text-sm font-semibold text-foreground">Place Address & Location</h3>
                <p className="text-xs text-muted-foreground">
                  Manual physical address and optional Google Maps sharing link
                </p>
              </div>
            </div>

            {/* Read-only State & District summary */}
            <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs">
              <span className="text-muted-foreground">Region:</span>
              <Badge variant="outline" className="font-medium">
                {selectedDistrictName || "No district selected"}
              </Badge>
              <span className="text-muted-foreground">·</span>
              <Badge variant="outline" className="font-medium">
                {selectedStateName || "No state selected"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="create-place-address-line" className="text-xs">
                  Address line or landmark (optional)
                </Label>
                <Input
                  id="create-place-address-line"
                  value={form.addressLine}
                  onChange={(e) => updateField("addressLine", e.target.value)}
                  placeholder="e.g. Sayyaji Rao Rd, Agrahara"
                  className="text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="create-place-locality" className="text-xs">
                  Locality or town (optional)
                </Label>
                <Input
                  id="create-place-locality"
                  value={form.locality}
                  onChange={(e) => updateField("locality", e.target.value)}
                  placeholder="e.g. Chamrajpura"
                  className="text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="create-place-pincode" className="text-xs">
                  PIN code (optional)
                </Label>
                <Input
                  id="create-place-pincode"
                  value={form.pincode}
                  maxLength={6}
                  onChange={(e) => updateField("pincode", e.target.value)}
                  placeholder="e.g. 570001"
                  className="text-sm"
                />
                {errors.pincode && (
                  <p className="text-xs text-destructive">{errors.pincode}</p>
                )}
              </div>
            </div>

            {/* Google Maps link */}
            <div className="mt-1 flex flex-col gap-1.5">
              <Label htmlFor="create-place-maps-link" className="flex items-center gap-1.5 text-xs">
                <span>Google Maps sharing link (optional)</span>
              </Label>
              <Input
                id="create-place-maps-link"
                type="url"
                value={form.mapsUrl}
                onChange={(e) => updateField("mapsUrl", e.target.value)}
                placeholder="Paste Google Maps sharing link (e.g. https://maps.app.goo.gl/...)"
                className="text-sm"
              />
              {resolvingLocation ? (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                  Resolving coordinates from Google Maps link…
                </p>
              ) : resolved ? (
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  ✓ Coordinates resolved: {resolved.latitude.toFixed(5)}, {resolved.longitude.toFixed(5)}
                </p>
              ) : locationResolutionFailed ? (
                <p className="text-xs text-destructive">
                  Could not read coordinates from this link. Check the link or rely on the manual address above.
                </p>
              ) : (
                <p className="text-[0.72rem] text-muted-foreground">
                  Share the place on Google Maps, copy the link, and paste here. Coordinates will be automatically extracted.
                </p>
              )}
              {errors.mapsUrl && (
                <p className="text-xs text-destructive">{errors.mapsUrl}</p>
              )}
            </div>
          </section>

          {/* 6. PHOTOS */}
          <section className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                Photos <span className="text-xs font-normal text-muted-foreground">({form.photos.length}/{MAX_PHOTOS})</span>
              </Label>
              <span className="text-xs text-muted-foreground">
                Optional, but places with photos attract more visitors
              </span>
            </div>

            <label
              className={cn(
                "flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                form.photos.length >= MAX_PHOTOS && "pointer-events-none opacity-50"
              )}
            >
              <ImagePlus className="size-5 text-primary" />
              <span>{form.photos.length === 0 ? "Add photos of the place" : "Add more photos"}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                disabled={form.photos.length >= MAX_PHOTOS}
                className="sr-only"
                onChange={(e) => {
                  addPhotos(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>

            {form.photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                {form.photos.map((photo, idx) => (
                  <div
                    key={`${photo.url}-${idx}`}
                    className="group relative aspect-video overflow-hidden rounded-xl border border-border bg-muted"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt="" className="size-full object-cover" />
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => removePhoto(idx)}
                      className="absolute right-1 top-1 size-6 p-0 opacity-80 transition-opacity hover:opacity-100"
                      aria-label="Remove photo"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Global error banner */}
          {formError && (
            <p className="rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
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
            onClick={handleSave}
            className="gap-2"
          >
            {saving || uploading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                {uploading ? "Uploading photos…" : "Saving place…"}
              </>
            ) : (
              "Save place"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
