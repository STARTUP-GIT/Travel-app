"use client";

import {
  Building2,
  CalendarCheck,
  Check,
  Clock,
  Compass,
  FileImage,
  GitBranch,
  Info,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  Upload,
  UtensilsCrossed,
  X,
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { AppImage } from "@/components/shared/app-image";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  addService,
  editService,
  fetchDistrictsByState,
  fetchStates,
  resolveLocationLink,
  uploadRestaurantPhoto,
} from "@/features/provider/api/provider.actions";
import {
  emptyRestaurant,
  emptyRestaurantBranch,
  emptyRestaurantDish,
  restaurantFormSchema,
  type RestaurantBranchValues,
  type RestaurantDishValues,
  type RestaurantFormValues,
} from "@/features/provider/schemas";
import type {
  DistrictRef,
  FoodCategory,
  RestaurantRecord,
} from "@/features/provider/types";
import { type StateRef } from "@/features/locations/api/locations.api";

const TIME_OPTIONS = [
  "06:00 AM", "06:30 AM", "07:00 AM", "07:30 AM", "08:00 AM", "08:30 AM",
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM", "02:00 PM", "02:30 PM",
  "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
  "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM",
  "09:00 PM", "09:30 PM", "10:00 PM", "10:30 PM", "11:00 PM", "11:30 PM",
  "12:00 AM", "12:30 AM", "01:00 AM", "01:30 AM", "02:00 AM", "02:30 AM",
  "03:00 AM", "04:00 AM", "05:00 AM",
];

const FOOD_CATEGORY_OPTIONS: { value: FoodCategory; label: string; tone: "success" | "warning" | "default" }[] = [
  { value: "PUREVEG", label: "Pure Vegetarian", tone: "success" },
  { value: "NONVEG", label: "Non-Vegetarian", tone: "warning" },
  { value: "VEG_AND_NONVEG", label: "Both Veg & Non-Veg", tone: "default" },
];

export function RestaurantForm({
  initialRestaurant,
  listingId,
  submitLabel = "Save Restaurant",
  initialStates = [],
  initialDistricts = [],
}: {
  initialRestaurant?: RestaurantRecord;
  listingId?: string;
  submitLabel?: string;
  initialStates?: StateRef[];
  initialDistricts?: DistrictRef[];
}) {
  const router = useRouter();

  // Location Cascading State
  const [states, setStates] = React.useState<StateRef[]>(initialStates);
  const [districts, setDistricts] = React.useState<DistrictRef[]>(initialDistricts);
  const [loadingStates, setLoadingStates] = React.useState(false);
  const [loadingDistricts, setLoadingDistricts] = React.useState(false);

  // Form State
  const [values, setValues] = React.useState<RestaurantFormValues>(() => {
    if (!initialRestaurant) return emptyRestaurant();

    const parentStateId =
      initialRestaurant.district?.stateId ??
      initialRestaurant.district?.state?.id ??
      "";

    return {
      name: initialRestaurant.name,
      address: initialRestaurant.address,
      profileLogo: initialRestaurant.profile_logo || "",
      stateId: parentStateId,
      districtId: initialRestaurant.districtId || "",
      description: initialRestaurant.description || "",
      mapsUrl: initialRestaurant.maps_url || "",
      phone: initialRestaurant.phone_number || "",
      whatsapp: initialRestaurant.whatsapp_number || "",
      email: initialRestaurant.email || "",
      website: initialRestaurant.website || "",
      foodCategory: initialRestaurant.food_category || "VEG_AND_NONVEG",
      openingTime: initialRestaurant.opening_time || "09:00 AM",
      closingTime: initialRestaurant.closing_time || "10:30 PM",
      bookingEnabled: initialRestaurant.booking_enabled ?? true,
      hasBranches: initialRestaurant.has_branches ?? false,
      images: initialRestaurant.images || [],
      dishes: initialRestaurant.dishes?.length
        ? initialRestaurant.dishes.map((d, i) => ({
            id: d.id,
            name: d.name,
            description: d.description || "",
            foodCategory: d.foodCategory || "VEG_AND_NONVEG",
            price: d.price ?? null,
            image: d.image || "",
            isAvailable: d.isAvailable ?? true,
            displayOrder: d.displayOrder ?? i,
          }))
        : initialRestaurant.menu?.length
        ? initialRestaurant.menu.map((m, i) => ({
            name: m,
            description: "",
            foodCategory: initialRestaurant.food_category || "VEG_AND_NONVEG",
            price: null,
            image: "",
            isAvailable: true,
            displayOrder: i,
          }))
        : [emptyRestaurantDish(0)],
      branches: initialRestaurant.branches?.length
        ? initialRestaurant.branches.map((b) => ({
            id: b.id,
            name: initialRestaurant.name, // Enforce parent name
            address: b.address,
            stateId: b.district?.stateId ?? b.district?.state?.id ?? parentStateId,
            districtId: b.districtId,
            mapsUrl: b.maps_url || "",
            latitude: b.latitude,
            longitude: b.longitude,
            phone: b.phone_number || "",
            whatsapp: b.whatsapp_number || "",
            email: b.email || "",
            openingTime: b.opening_time || "09:00 AM",
            closingTime: b.closing_time || "10:30 PM",
            bookingEnabled: b.booking_enabled ?? true,
            profileLogo: b.profile_logo || "",
            images: b.images || [],
          }))
        : [],
    };
  });

  // Coordinates resolution state
  const [coords, setCoords] = React.useState<{ latitude: number; longitude: number } | null>(() => {
    if (initialRestaurant?.latitude && initialRestaurant?.longitude) {
      return { latitude: initialRestaurant.latitude, longitude: initialRestaurant.longitude };
    }
    return null;
  });
  const [resolvingMap, setResolvingMap] = React.useState(false);
  const [mapError, setMapError] = React.useState<string | null>(null);

  // Branch districts cache: stateId -> DistrictRef[]
  const [branchDistrictsByState, setBranchDistrictsByState] = React.useState<Record<string, DistrictRef[]>>({});

  // UI state
  const [busy, setBusy] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [uploadingCover, setUploadingCover] = React.useState(false);
  const [uploadingGallery, setUploadingGallery] = React.useState(false);

  // Load States on mount
  React.useEffect(() => {
    if (states.length === 0) {
      setLoadingStates(true);
      fetchStates()
        .then((res) => {
          if (Array.isArray(res)) setStates(res);
        })
        .finally(() => setLoadingStates(false));
    }
  }, [states.length]);

  // Load parent districts when state changes
  React.useEffect(() => {
    if (values.stateId) {
      setLoadingDistricts(true);
      fetchDistrictsByState(values.stateId)
        .then((res) => {
          if (Array.isArray(res)) {
            setDistricts(res);
            setBranchDistrictsByState((prev) => ({ ...prev, [values.stateId]: res }));
          }
        })
        .finally(() => setLoadingDistricts(false));
    } else {
      setDistricts([]);
    }
  }, [values.stateId]);

  // Helper to load branch districts for a given state
  const loadBranchDistricts = React.useCallback(async (stateId: string) => {
    if (!stateId || branchDistrictsByState[stateId]) return;
    const res = await fetchDistrictsByState(stateId);
    if (Array.isArray(res)) {
      setBranchDistrictsByState((prev) => ({ ...prev, [stateId]: res }));
    }
  }, [branchDistrictsByState]);

  // Pre-load branch districts
  React.useEffect(() => {
    values.branches.forEach((b) => {
      if (b.stateId) loadBranchDistricts(b.stateId);
    });
  }, [values.branches, loadBranchDistricts]);

  function set<K extends keyof RestaurantFormValues>(key: K, val: RestaurantFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: val }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  // Cover photo upload
  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Cover image must be smaller than 8MB");
      return;
    }

    setUploadingCover(true);
    try {
      const res = await uploadRestaurantPhoto(file, "restaurant_profile");
      if (res.ok) {
        set("profileLogo", res.data);
        toast.success("Cover photo uploaded successfully");
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Failed to upload cover photo");
    } finally {
      setUploadingCover(false);
      e.target.value = "";
    }
  }

  // Gallery photos upload
  async function handleGalleryUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingGallery(true);
    let successCount = 0;

    for (const file of files) {
      if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) continue;
      try {
        const res = await uploadRestaurantPhoto(file, "restaurant_profile");
        if (res.ok && res.data) {
          setValues((prev) => ({ ...prev, images: [...prev.images, res.data!] }));
          successCount++;
        }
      } catch {
        // continue uploading other files
      }
    }

    setUploadingGallery(false);
    if (successCount > 0) {
      toast.success(`Uploaded ${successCount} gallery photo(s)`);
    } else {
      toast.error("Could not upload photos. Please verify file sizes and types.");
    }
    e.target.value = "";
  }

  function removeGalleryImage(index: number) {
    setValues((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  }

  // Google Maps coordinate resolution
  async function handleResolveMap() {
    if (!values.mapsUrl?.trim()) {
      toast.error("Please enter a Google Maps sharing link first");
      return;
    }

    setResolvingMap(true);
    setMapError(null);

    const res = await resolveLocationLink(values.mapsUrl.trim());
    setResolvingMap(false);

    if (res.ok && res.data) {
      setCoords(res.data);
      toast.success("Coordinates successfully resolved from Google Maps link!");
    } else {
      setCoords(null);
      setMapError("Could not determine coordinates from this link. Please check the sharing URL.");
      toast.error("Could not resolve location coordinates");
    }
  }

  // Dish management
  function addDish() {
    setValues((prev) => ({
      ...prev,
      dishes: [...prev.dishes, emptyRestaurantDish(prev.dishes.length)],
    }));
  }

  function updateDish(index: number, patch: Partial<RestaurantDishValues>) {
    setValues((prev) => ({
      ...prev,
      dishes: prev.dishes.map((dish, i) => (i === index ? { ...dish, ...patch } : dish)),
    }));
  }

  function removeDish(index: number) {
    if (values.dishes.length <= 1) {
      toast.error("Keep at least one menu highlight or dish");
      return;
    }
    setValues((prev) => ({
      ...prev,
      dishes: prev.dishes.filter((_, i) => i !== index),
    }));
  }

  async function handleDishPhotoUpload(index: number, file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }
    try {
      const res = await uploadRestaurantPhoto(file, "restaurant_dishes");
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      if (res.data) {
        updateDish(index, { image: res.data });
        toast.success("Dish photo uploaded");
      }
    } catch {
      toast.error("Failed to upload dish photo");
    }
  }

  // Branch management
  function addBranch() {
    setValues((prev) => ({
      ...prev,
      branches: [...prev.branches, emptyRestaurantBranch(prev.name)],
    }));
  }

  function updateBranch(index: number, patch: Partial<RestaurantBranchValues>) {
    setValues((prev) => ({
      ...prev,
      branches: prev.branches.map((branch, i) => {
        if (i !== index) return branch;
        const updated = { ...branch, ...patch };
        // Always enforce parent restaurant name
        updated.name = prev.name;
        return updated;
      }),
    }));
  }

  function removeBranch(index: number) {
    setValues((prev) => ({
      ...prev,
      branches: prev.branches.filter((_, i) => i !== index),
    }));
  }

  async function handleResolveBranchMap(index: number) {
    const branch = values.branches[index];
    if (!branch?.mapsUrl?.trim()) {
      toast.error("Enter a Google Maps sharing link for this branch first");
      return;
    }

    const res = await resolveLocationLink(branch.mapsUrl.trim());
    if (res.ok && res.data) {
      updateBranch(index, {
        latitude: res.data.latitude,
        longitude: res.data.longitude,
      });
      toast.success("Branch coordinates resolved successfully!");
    } else {
      toast.error("Could not resolve coordinates for this branch link");
    }
  }

  // Form submission
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    // Validate using Zod schema
    const parsed = restaurantFormSchema.safeParse(values);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const path = issue.path.join(".");
        errors[path] = issue.message;
      });
      setFieldErrors(errors);
      setFormError("Please correct the highlighted fields before submitting.");
      toast.error("Please fill in all required fields accurately");
      return;
    }

    // Backend coordinates check
    const finalLat = coords?.latitude ?? (initialRestaurant?.latitude || 0);
    const finalLng = coords?.longitude ?? (initialRestaurant?.longitude || 0);

    setBusy(true);

    const payload = {
      name: parsed.data.name.trim(),
      address: parsed.data.address.trim(),
      profileLogo: parsed.data.profileLogo,
      districtId: parsed.data.districtId,
      stateId: parsed.data.stateId,
      description: parsed.data.description.trim(),
      rating: initialRestaurant?.rating ?? 0,
      costPerNight: 0,
      latitude: finalLat,
      longitude: finalLng,
      phone: parsed.data.phone.trim(),
      whatsapp: parsed.data.whatsapp.trim(),
      email: parsed.data.email.trim(),
      website: parsed.data.website.trim(),
      bookingEnabled: parsed.data.bookingEnabled,
      images: parsed.data.images,
      foodCategory: parsed.data.foodCategory,
      menu: parsed.data.dishes.map((d) => d.name),
      mapsUrl: parsed.data.mapsUrl.trim() || null,
      openingTime: parsed.data.openingTime.trim() || null,
      closingTime: parsed.data.closingTime.trim() || null,
      hasBranches: parsed.data.hasBranches,
      branches: parsed.data.hasBranches
        ? parsed.data.branches.map((b) => ({
            id: b.id,
            name: parsed.data.name.trim(), // Strict parent name matching
            address: b.address.trim(),
            districtId: b.districtId,
            stateId: b.stateId,
            maps_url: b.mapsUrl?.trim() || null,
            latitude: b.latitude,
            longitude: b.longitude,
            phone_number: b.phone?.trim() || null,
            whatsapp_number: b.whatsapp?.trim() || null,
            email: b.email?.trim() || null,
            opening_time: b.openingTime?.trim() || parsed.data.openingTime.trim() || null,
            closing_time: b.closingTime?.trim() || parsed.data.closingTime.trim() || null,
            booking_enabled: b.bookingEnabled,
            profile_logo: b.profileLogo || parsed.data.profileLogo,
            images: b.images || [],
          }))
        : [],
      dishes: parsed.data.dishes.map((d, i) => ({
        id: d.id,
        name: d.name.trim(),
        description: d.description?.trim() || null,
        foodCategory: d.foodCategory,
        price: d.price ?? null,
        image: d.image?.trim() || null,
        isAvailable: d.isAvailable ?? true,
        displayOrder: i,
      })),
    };

    const res = listingId
      ? await editService(listingId, payload)
      : await addService(payload);

    setBusy(false);

    if (!res.ok) {
      setFormError(res.message || "Failed to save restaurant");
      toast.error(res.message || "Failed to save restaurant");
      return;
    }

    toast.success(listingId ? "Restaurant updated successfully!" : "Restaurant submitted for review!");
    router.push("/services");
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-5xl flex-col gap-8 pb-16" noValidate>
      {/* Top Banner Error */}
      {formError && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive">
          <Info className="mt-0.5 size-5 shrink-0" />
          <div>
            <h4 className="font-semibold">Unable to save restaurant</h4>
            <p className="mt-1 text-xs opacity-90">{formError}</p>
          </div>
        </div>
      )}

      {/* ONLINE TABLE BOOKING TOGGLE AT THE TOP */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-secondary/10 p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
              <CalendarCheck className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-foreground">Online Table Booking Available</h3>
                {values.bookingEnabled ? (
                  <Badge variant="default" className="bg-emerald-600 text-white">Accepting Bookings</Badge>
                ) : (
                  <Badge variant="secondary">Discovery Only</Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                When enabled, travellers can reserve a table by choosing their date, preferred time, and party size.
                When disabled, your restaurant will still appear in search results, but reservation buttons will be deactivated.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:shrink-0">
            <Label htmlFor="booking-toggle" className="cursor-pointer text-sm font-medium">
              {values.bookingEnabled ? "Enabled" : "Disabled"}
            </Label>
            <Switch
              id="booking-toggle"
              checked={values.bookingEnabled}
              onCheckedChange={(checked) => set("bookingEnabled", checked)}
            />
          </div>
        </div>
      </div>

      {/* SECTION 1: BASICS */}
      <section className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UtensilsCrossed className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-bold">Restaurant Basics</h2>
            <p className="text-xs text-muted-foreground">General information, cuisine category, and cover imagery</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Restaurant Name */}
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="rest-name" className="text-xs font-semibold">
              Restaurant Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="rest-name"
              placeholder="e.g. Nagarjuna Heritage Restaurant"
              value={values.name}
              onChange={(e) => {
                const newName = e.target.value;
                set("name", newName);
                // Propagate to all branches
                if (values.branches.length > 0) {
                  setValues((prev) => ({
                    ...prev,
                    branches: prev.branches.map((b) => ({ ...b, name: newName })),
                  }));
                }
              }}
              className="rounded-xl"
            />
            {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
          </div>

          {/* Food Category */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="food-category" className="text-xs font-semibold">
              Food Category <span className="text-destructive">*</span>
            </Label>
            <Select
              value={values.foodCategory}
              onValueChange={(val: FoodCategory) => set("foodCategory", val)}
            >
              <SelectTrigger id="food-category" className="rounded-xl">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {FOOD_CATEGORY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[0.7rem] text-muted-foreground">
              Displayed as a badge on your listing to help travellers find their preferred dining style.
            </p>
          </div>

          {/* Website URL */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="rest-website" className="text-xs font-semibold">
              Website URL (Optional)
            </Label>
            <Input
              id="rest-website"
              type="url"
              placeholder="https://example.com"
              value={values.website}
              onChange={(e) => set("website", e.target.value)}
              className="rounded-xl"
            />
            {fieldErrors.website && <p className="text-xs text-destructive">{fieldErrors.website}</p>}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="rest-desc" className="text-xs font-semibold">
              Restaurant Description
            </Label>
            <Textarea
              id="rest-desc"
              rows={3}
              placeholder="Describe your cuisine, ambiance, specialties, and dining experience..."
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              className="rounded-xl"
            />
            {fieldErrors.description && <p className="text-xs text-destructive">{fieldErrors.description}</p>}
          </div>
        </div>

        {/* Cover Photo Upload */}
        <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-5">
          <Label className="text-xs font-semibold">
            Restaurant Cover Photo <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">
            The main banner displayed on search cards and at the top of your restaurant profile.
          </p>

          {values.profileLogo ? (
            <div className="relative mt-2 flex items-center gap-4">
              <div className="relative aspect-video w-48 overflow-hidden rounded-2xl border border-border bg-muted">
                <AppImage src={values.profileLogo} alt="Restaurant Cover" className="size-full object-cover" />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1.5"
                  onClick={() => document.getElementById("cover-photo-input")?.click()}
                  disabled={uploadingCover}
                >
                  <Upload className="size-3.5" /> Replace Photo
                </Button>
                <span className="text-[0.7rem] text-muted-foreground">Stored securely on Cloudinary</span>
              </div>
            </div>
          ) : (
            <div className="mt-2 flex flex-col items-center justify-center rounded-2xl border border-border bg-muted/40 p-6 text-center">
              <FileImage className="size-10 text-muted-foreground/60 mb-2" />
              <p className="text-xs font-medium">Upload high quality cover image</p>
              <p className="text-[0.7rem] text-muted-foreground mt-0.5">JPEG, PNG, or WEBP up to 8MB</p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-4 rounded-xl gap-1.5"
                onClick={() => document.getElementById("cover-photo-input")?.click()}
                disabled={uploadingCover}
              >
                {uploadingCover ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {uploadingCover ? "Uploading…" : "Choose Cover Photo"}
              </Button>
            </div>
          )}
          <input
            id="cover-photo-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleCoverUpload}
          />
          {fieldErrors.profileLogo && <p className="text-xs text-destructive">{fieldErrors.profileLogo}</p>}
        </div>

        {/* Optional Gallery Photos */}
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-muted/20 p-5">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-semibold">Restaurant Gallery (Optional)</Label>
              <p className="text-xs text-muted-foreground">Upload photos of interiors, dining area, outdoor seating, or food</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5"
              onClick={() => document.getElementById("gallery-photo-input")?.click()}
              disabled={uploadingGallery}
            >
              {uploadingGallery ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
              Add Photos
            </Button>
          </div>

          <input
            id="gallery-photo-input"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleGalleryUpload}
          />

          {values.images.length > 0 ? (
            <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {values.images.map((imgUrl, idx) => (
                <div key={idx} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
                  <AppImage src={imgUrl} alt={`Gallery ${idx + 1}`} className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeGalleryImage(idx)}
                    className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:bg-destructive"
                    title="Remove photo"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs italic text-muted-foreground mt-1">No additional gallery photos added yet.</p>
          )}
        </div>
      </section>

      {/* SECTION 2: LOCATION & CONTACT */}
      <section className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MapPin className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-bold">Location & Contact</h2>
            <p className="text-xs text-muted-foreground">Physical address, dynamic state and district, map link, and contact info</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* State */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="rest-state" className="text-xs font-semibold">
              State <span className="text-destructive">*</span>
            </Label>
            <Select
              value={values.stateId}
              onValueChange={(val) => {
                set("stateId", val);
                set("districtId", ""); // Clear district on state change
              }}
              disabled={loadingStates}
            >
              <SelectTrigger id="rest-state" className="rounded-xl">
                <SelectValue placeholder={loadingStates ? "Loading states…" : "Select State"} />
              </SelectTrigger>
              <SelectContent>
                {states.map((st) => (
                  <SelectItem key={st.id} value={st.id}>
                    {st.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.stateId && <p className="text-xs text-destructive">{fieldErrors.stateId}</p>}
          </div>

          {/* District */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="rest-district" className="text-xs font-semibold">
              District <span className="text-destructive">*</span>
            </Label>
            <Select
              value={values.districtId}
              onValueChange={(val) => set("districtId", val)}
              disabled={!values.stateId || loadingDistricts}
            >
              <SelectTrigger id="rest-district" className="rounded-xl">
                <SelectValue
                  placeholder={
                    !values.stateId
                      ? "Select state first"
                      : loadingDistricts
                      ? "Loading districts…"
                      : "Select District"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {districts.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.districtId && <p className="text-xs text-destructive">{fieldErrors.districtId}</p>}
          </div>

          {/* Physical Address */}
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="rest-address" className="text-xs font-semibold">
              Physical Street Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="rest-address"
              placeholder="e.g. 14th Cross, Gandhi Square, Mysuru"
              value={values.address}
              onChange={(e) => set("address", e.target.value)}
              className="rounded-xl"
            />
            {fieldErrors.address && <p className="text-xs text-destructive">{fieldErrors.address}</p>}
          </div>

          {/* Google Maps Link with Resolver */}
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="rest-maps" className="text-xs font-semibold">
              Google Maps Sharing Link (Optional)
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="rest-maps"
                placeholder="https://maps.app.goo.gl/..."
                value={values.mapsUrl}
                onChange={(e) => {
                  set("mapsUrl", e.target.value);
                  setMapError(null);
                }}
                className="rounded-xl flex-1"
              />
              <Button
                type="button"
                variant="secondary"
                className="rounded-xl shrink-0 gap-1.5"
                onClick={handleResolveMap}
                disabled={resolvingMap || !values.mapsUrl?.trim()}
              >
                {resolvingMap ? <Loader2 className="size-4 animate-spin" /> : <Compass className="size-4" />}
                {resolvingMap ? "Resolving…" : "Resolve Coordinates"}
              </Button>
            </div>

            {coords && (
              <div className="mt-1 flex items-center gap-2 text-xs text-emerald-600 font-medium">
                <Check className="size-3.5" /> Coordinates set: {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
              </div>
            )}
            {mapError && <p className="text-xs text-destructive">{mapError}</p>}
            <p className="text-[0.7rem] text-muted-foreground">
              Coordinates will be automatically derived from the share link. Manual latitude & longitude inputs have been removed.
            </p>
          </div>

          {/* Phone */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="rest-phone" className="text-xs font-semibold">
              Contact Phone (Optional)
            </Label>
            <Input
              id="rest-phone"
              type="tel"
              placeholder="+91 9876543210"
              value={values.phone}
              onChange={(e) => set("phone", e.target.value)}
              className="rounded-xl"
            />
            {fieldErrors.phone && <p className="text-xs text-destructive">{fieldErrors.phone}</p>}
          </div>

          {/* WhatsApp */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="rest-whatsapp" className="text-xs font-semibold">
              WhatsApp Number (Optional)
            </Label>
            <Input
              id="rest-whatsapp"
              type="tel"
              placeholder="+91 9876543210"
              value={values.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value)}
              className="rounded-xl"
            />
            {fieldErrors.whatsapp && <p className="text-xs text-destructive">{fieldErrors.whatsapp}</p>}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-2 sm:col-span-2">
            <Label htmlFor="rest-email" className="text-xs font-semibold">
              Contact Email (Optional)
            </Label>
            <Input
              id="rest-email"
              type="email"
              placeholder="contact@restaurant.com"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
              className="rounded-xl"
            />
            {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
          </div>
        </div>
      </section>

      {/* SECTION 3: OPERATING HOURS */}
      <section className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Clock className="size-5" />
          </div>
          <div>
            <h2 className="text-base font-bold">Operating Hours</h2>
            <p className="text-xs text-muted-foreground">Configure standard opening and closing times. Overnight schedules are supported.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* Opening Time */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="opening-time" className="text-xs font-semibold">
              Opening Time <span className="text-destructive">*</span>
            </Label>
            <Select
              value={values.openingTime}
              onValueChange={(val) => set("openingTime", val)}
            >
              <SelectTrigger id="opening-time" className="rounded-xl">
                <SelectValue placeholder="Select Opening Time" />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((time) => (
                  <SelectItem key={`open-${time}`} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Closing Time */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="closing-time" className="text-xs font-semibold">
              Closing Time <span className="text-destructive">*</span>
            </Label>
            <Select
              value={values.closingTime}
              onValueChange={(val) => set("closingTime", val)}
            >
              <SelectTrigger id="closing-time" className="rounded-xl">
                <SelectValue placeholder="Select Closing Time" />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((time) => (
                  <SelectItem key={`close-${time}`} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-[0.7rem] text-muted-foreground italic">
          Tip: If your restaurant closes after midnight (e.g. 01:00 AM), select your late-night closing hour. The reservation system natively supports overnight operations.
        </p>
      </section>

      {/* SECTION 4: MENU HIGHLIGHTS & DISHES */}
      <section className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UtensilsCrossed className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">Menu Highlights & Dishes</h2>
              <p className="text-xs text-muted-foreground">Add popular signature dishes with pricing and photos</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addDish}
            className="rounded-xl gap-1.5"
          >
            <Plus className="size-4" /> Add a Dish
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          {values.dishes.map((dish, idx) => (
            <div key={idx} className="flex flex-col gap-4 rounded-2xl border border-border bg-muted/20 p-5">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <div className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-semibold">{dish.name || "Untitled Dish"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Label htmlFor={`dish-avail-${idx}`} className="cursor-pointer text-muted-foreground">
                      {dish.isAvailable ? "Available" : "Sold out"}
                    </Label>
                    <Switch
                      id={`dish-avail-${idx}`}
                      checked={dish.isAvailable}
                      onCheckedChange={(checked) => updateDish(idx, { isAvailable: checked })}
                    />
                  </div>
                  {values.dishes.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:bg-destructive/10"
                      onClick={() => removeDish(idx)}
                      title="Remove dish"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Dish Name */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium">Dish Name *</Label>
                  <Input
                    placeholder="e.g. Mysuru Masala Dosa"
                    value={dish.name}
                    onChange={(e) => updateDish(idx, { name: e.target.value })}
                    className="rounded-xl"
                  />
                </div>

                {/* Classification */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium">Classification</Label>
                  <Select
                    value={dish.foodCategory}
                    onValueChange={(val: FoodCategory) => updateDish(idx, { foodCategory: val })}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUREVEG">Vegetarian</SelectItem>
                      <SelectItem value="NONVEG">Non-Vegetarian</SelectItem>
                      <SelectItem value="VEG_AND_NONVEG">Mixed / Special</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Price */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium">Price (INR)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="e.g. 180"
                    value={dish.price ?? ""}
                    onChange={(e) => updateDish(idx, { price: e.target.value ? Number(e.target.value) : null })}
                    className="rounded-xl"
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium">Dish Description</Label>
                  <Input
                    placeholder="Ingredients, preparation style, or serving notes..."
                    value={dish.description || ""}
                    onChange={(e) => updateDish(idx, { description: e.target.value })}
                    className="rounded-xl"
                  />
                </div>

                {/* Dish Photo */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-medium">Dish Photo (Cloudinary)</Label>
                  {dish.image ? (
                    <div className="flex items-center gap-2">
                      <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border border-border">
                        <AppImage src={dish.image} alt={dish.name} className="size-full object-cover" />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => updateDish(idx, { image: "" })}
                      >
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs gap-1.5"
                      onClick={() => document.getElementById(`dish-photo-${idx}`)?.click()}
                    >
                      <Upload className="size-3.5" /> Upload Photo
                    </Button>
                  )}
                  <input
                    id={`dish-photo-${idx}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleDishPhotoUpload(idx, file);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 5: BRANCH MANAGEMENT */}
      <section className="flex flex-col gap-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div className="flex items-start gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <GitBranch className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-bold">This Restaurant Has Multiple Branches</h2>
              <p className="text-xs text-muted-foreground">
                Enable to manage multiple physical locations. Every branch automatically inherits the exact restaurant name.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="branch-toggle" className="cursor-pointer text-sm font-medium">
              {values.hasBranches ? "Enabled" : "Single Location"}
            </Label>
            <Switch
              id="branch-toggle"
              checked={values.hasBranches}
              onCheckedChange={(checked) => set("hasBranches", checked)}
            />
          </div>
        </div>

        {values.hasBranches && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Define the branches where customers can visit and reserve tables.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addBranch}
                className="rounded-xl gap-1.5"
              >
                <Plus className="size-4" /> Add Branch Location
              </Button>
            </div>

            {values.branches.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-8 text-center">
                <Building2 className="size-8 text-muted-foreground/60 mb-2" />
                <p className="text-sm font-semibold">No additional branches configured</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click &ldquo;Add Branch Location&rdquo; above to register other branches of {values.name || "your restaurant"}.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {values.branches.map((branch, bIdx) => {
                  const bDistricts = branchDistrictsByState[branch.stateId] || districts;
                  return (
                    <div key={bIdx} className="flex flex-col gap-4 rounded-2xl border border-border bg-muted/20 p-5">
                      <div className="flex items-center justify-between border-b border-border/50 pb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-semibold">
                            Branch #{bIdx + 1}
                          </Badge>
                          <span className="text-sm font-bold">{values.name}</span>
                          <span className="text-xs text-muted-foreground">({branch.address || "Pending Address"})</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:bg-destructive/10"
                          onClick={() => removeBranch(bIdx)}
                          title="Remove branch"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {/* Inherited Name */}
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                          <Label className="text-xs font-semibold">
                            Branch Name (Inherited)
                          </Label>
                          <Input
                            value={values.name}
                            disabled
                            className="rounded-xl bg-muted/50 cursor-not-allowed font-medium"
                          />
                          <p className="text-[0.7rem] text-muted-foreground">
                            Inherited from the parent restaurant name. Branch suffixes and city names are not permitted.
                          </p>
                        </div>

                        {/* Branch State */}
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs font-semibold">Branch State *</Label>
                          <Select
                            value={branch.stateId}
                            onValueChange={(val) => {
                              updateBranch(bIdx, { stateId: val, districtId: "" });
                              loadBranchDistricts(val);
                            }}
                          >
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder="Select State" />
                            </SelectTrigger>
                            <SelectContent>
                              {states.map((st) => (
                                <SelectItem key={`b-${bIdx}-st-${st.id}`} value={st.id}>
                                  {st.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Branch District */}
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs font-semibold">Branch District *</Label>
                          <Select
                            value={branch.districtId}
                            onValueChange={(val) => updateBranch(bIdx, { districtId: val })}
                            disabled={!branch.stateId}
                          >
                            <SelectTrigger className="rounded-xl">
                              <SelectValue placeholder={!branch.stateId ? "Select state first" : "Select District"} />
                            </SelectTrigger>
                            <SelectContent>
                              {bDistricts.map((d) => (
                                <SelectItem key={`b-${bIdx}-dist-${d.id}`} value={d.id}>
                                  {d.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Physical Address */}
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                          <Label className="text-xs font-semibold">Physical Address *</Label>
                          <Input
                            placeholder="e.g. 5th Main, Indiranagar, Bengaluru"
                            value={branch.address}
                            onChange={(e) => updateBranch(bIdx, { address: e.target.value })}
                            className="rounded-xl"
                          />
                        </div>

                        {/* Maps Link */}
                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                          <Label className="text-xs font-semibold">Google Maps Link</Label>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Input
                              placeholder="https://maps.app.goo.gl/..."
                              value={branch.mapsUrl || ""}
                              onChange={(e) => updateBranch(bIdx, { mapsUrl: e.target.value })}
                              className="rounded-xl flex-1"
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="rounded-xl shrink-0 gap-1.5"
                              onClick={() => handleResolveBranchMap(bIdx)}
                              disabled={!branch.mapsUrl?.trim()}
                            >
                              <Compass className="size-3.5" /> Resolve
                            </Button>
                          </div>
                        </div>

                        {/* Hours */}
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs font-semibold">Opening Time</Label>
                          <Select
                            value={branch.openingTime || values.openingTime}
                            onValueChange={(val) => updateBranch(bIdx, { openingTime: val })}
                          >
                            <SelectTrigger className="rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map((time) => (
                                <SelectItem key={`b-${bIdx}-open-${time}`} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs font-semibold">Closing Time</Label>
                          <Select
                            value={branch.closingTime || values.closingTime}
                            onValueChange={(val) => updateBranch(bIdx, { closingTime: val })}
                          >
                            <SelectTrigger className="rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TIME_OPTIONS.map((time) => (
                                <SelectItem key={`b-${bIdx}-close-${time}`} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Contacts */}
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs font-semibold">Contact Phone</Label>
                          <Input
                            placeholder="+91..."
                            value={branch.phone || ""}
                            onChange={(e) => updateBranch(bIdx, { phone: e.target.value })}
                            className="rounded-xl"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <Label className="text-xs font-semibold">Online Booking</Label>
                          <div className="flex items-center gap-2 pt-2">
                            <Switch
                              checked={branch.bookingEnabled}
                              onCheckedChange={(checked) => updateBranch(bIdx, { bookingEnabled: checked })}
                            />
                            <span className="text-xs text-muted-foreground">
                              {branch.bookingEnabled ? "Accepting reservations at this branch" : "Disabled"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* FORM ACTION FOOTER */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between rounded-3xl border border-border bg-card/90 p-4 shadow-xl backdrop-blur-md">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/services")}
          disabled={busy}
          className="rounded-2xl"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="action"
          size="lg"
          disabled={busy || uploadingCover || uploadingGallery}
          className="rounded-2xl px-8"
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" /> Saving…
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </form>
  );
}
