"use client";

import {
  ArrowDown,
  ArrowUp,
  BedDouble,
  Building,
  Check,
  Clock,
  Compass,
  FileImage,
  Info,
  Loader2,
  MapPin,
  Plus,
  Sparkles,
  Star,
  Trash2,
  Upload,
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
  uploadHotelPhoto,
} from "@/features/provider/api/provider.actions";
import {
  emptyHotel,
  emptyRoomType,
  hotelFormSchema,
  type HotelFormValues,
  type HotelRoomTypeValues,
} from "@/features/provider/schemas";
import type {
  DistrictRef,
  HotelRecord,
  HotelRoomTypeRecord,
} from "@/features/provider/types";
import type { StateRef } from "@/features/locations/api/locations.api";
import { validateImageFile, ACCEPT_ATTRIBUTE } from "@/lib/upload/image";

const TIME_OPTIONS = [
  "06:00 AM", "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
  "06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM", "10:00 PM", "11:00 PM",
];

const STANDARD_SERVICES = [
  "Breakfast",
  "Lunch",
  "Dinner",
  "Drinking water",
  "Extra bed",
  "Laundry",
  "Airport or station pickup",
  "Other",
];

export function HotelForm({
  initialHotel,
  listingId,
  submitLabel,
  initialStates = [],
  initialDistricts = [],
}: {
  initialHotel?: HotelRecord;
  listingId?: string;
  submitLabel: string;
  initialStates?: StateRef[];
  initialDistricts?: DistrictRef[];
}) {
  const router = useRouter();
  const [states, setStates] = React.useState<StateRef[]>(initialStates);
  const [districts, setDistricts] = React.useState<DistrictRef[]>(initialDistricts);
  const [loadingDistricts, setLoadingDistricts] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [resolvingMaps, setResolvingMaps] = React.useState(false);
  const [resolvedCoords, setResolvedCoords] = React.useState<{
    lat: number;
    lng: number;
  } | null>(
    initialHotel?.latitude && initialHotel?.longitude
      ? { lat: initialHotel.latitude, lng: initialHotel.longitude }
      : null
  );

  // Initialize form state
  const [form, setForm] = React.useState<HotelFormValues>(() => {
    if (!initialHotel) return emptyHotel();

    const existingStateId =
      initialHotel.district?.stateId ||
      initialHotel.district?.state?.id ||
      "";

    const hasPolicies = Boolean(
      initialHotel.check_in_time_type ||
      initialHotel.check_in_time ||
      initialHotel.check_out_time_type ||
      initialHotel.check_out_time
    );

    const mappedRoomTypes: HotelRoomTypeValues[] =
      initialHotel.room_types && initialHotel.room_types.length > 0
        ? initialHotel.room_types.map((rt, idx) => ({
            id: rt.id,
            title: rt.title,
            description: rt.description,
            category: rt.category ?? "",
            roomType: rt.roomType,
            maxOccupancy: rt.maxOccupancy,
            availableRooms: rt.availableRooms,
            pricePerNight: rt.pricePerNight,
            roomOverviewPhoto: rt.roomOverviewPhoto,
            bathroomPhoto: rt.bathroomPhoto,
            images: rt.images ?? [],
            hasHotWater: rt.hasHotWater,
            hotWaterCharge: rt.hotWaterCharge ?? null,
            hasTv: rt.hasTv,
            hasAttachedBathroom: rt.hasAttachedBathroom,
            hasWifi: rt.hasWifi,
            facilities: rt.facilities ?? [],
            additionalServices: (rt.additionalServices as any) ?? [],
            conditions: rt.conditions ?? "",
            isActive: rt.isActive ?? true,
            displayOrder: rt.displayOrder ?? idx,
          }))
        : [emptyRoomType(0)];

    return {
      name: initialHotel.name,
      address: initialHotel.address,
      profileLogo: initialHotel.profile_logo,
      stateId: existingStateId,
      districtId: initialHotel.districtId,
      description: initialHotel.description ?? "",
      mapsUrl: initialHotel.maps_url ?? "",
      starRating: initialHotel.star_rating ?? null,
      phone: initialHotel.phone_number ?? "",
      whatsapp: initialHotel.whatsapp_number ?? "",
      email: initialHotel.email ?? "",
      website: initialHotel.website ?? "",
      specifyTimes: hasPolicies,
      checkInTimeType: initialHotel.check_in_time_type ?? "SPECIFIC",
      checkInTime: initialHotel.check_in_time ?? "12:00 PM",
      checkInStartTime: initialHotel.check_in_start_time ?? "12:00 PM",
      checkInEndTime: initialHotel.check_in_end_time ?? "08:00 PM",
      checkOutTimeType: initialHotel.check_out_time_type ?? "SPECIFIC",
      checkOutTime: initialHotel.check_out_time ?? "11:00 AM",
      checkOutStartTime: initialHotel.check_out_start_time ?? "06:00 AM",
      checkOutEndTime: initialHotel.check_out_end_time ?? "11:00 AM",
      roomTypes: mappedRoomTypes,
    };
  });

  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({});
  const [generalError, setGeneralError] = React.useState<string | null>(null);

  // Load enabled states on mount if not provided
  React.useEffect(() => {
    if (states.length === 0) {
      void fetchStates().then((res) => setStates(res));
    }
  }, [states.length]);

  // Load districts whenever stateId changes
  React.useEffect(() => {
    if (!form.stateId) {
      setDistricts([]);
      return;
    }
    setLoadingDistricts(true);
    void fetchDistrictsByState(form.stateId)
      .then((res) => {
        setDistricts(res);
      })
      .finally(() => setLoadingDistricts(false));
  }, [form.stateId]);

  function updateField<K extends keyof HotelFormValues>(key: K, value: HotelFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleStateChange(newStateId: string) {
    setForm((prev) => ({
      ...prev,
      stateId: newStateId,
      districtId: "", // Clear district on state change as required
    }));
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.stateId;
      delete next.districtId;
      return next;
    });
  }

  async function handleResolveMaps() {
    if (!form.mapsUrl?.trim()) {
      toast.error("Please enter a Google Maps sharing link first");
      return;
    }
    setResolvingMaps(true);
    setGeneralError(null);
    try {
      const res = await resolveLocationLink(form.mapsUrl.trim());
      if (res.ok) {
        setResolvedCoords({ lat: res.data.latitude, lng: res.data.longitude });
        toast.success("Coordinates successfully resolved from Google Maps!");
      } else {
        toast.error(res.message || "Failed to resolve coordinates from the map link.");
      }
    } catch {
      toast.error("Could not resolve location coordinates. Please verify your Google Maps link.");
    } finally {
      setResolvingMaps(false);
    }
  }

  // Room type handlers
  function addRoomType() {
    setForm((prev) => ({
      ...prev,
      roomTypes: [...prev.roomTypes, emptyRoomType(prev.roomTypes.length)],
    }));
  }

  function removeRoomType(index: number) {
    if (form.roomTypes.length <= 1) {
      toast.error("A hotel must have at least one room type");
      return;
    }
    setForm((prev) => ({
      ...prev,
      roomTypes: prev.roomTypes.filter((_, i) => i !== index),
    }));
  }

  function moveRoomType(from: number, to: number) {
    if (to < 0 || to >= form.roomTypes.length) return;
    setForm((prev) => {
      const list = [...prev.roomTypes];
      const [item] = list.splice(from, 1);
      if (item) list.splice(to, 0, item);
      return {
        ...prev,
        roomTypes: list.map((rt, idx) => ({ ...rt, displayOrder: idx })),
      };
    });
  }

  function updateRoomType<K extends keyof HotelRoomTypeValues>(
    index: number,
    field: K,
    val: HotelRoomTypeValues[K]
  ) {
    setForm((prev) => {
      const list = [...prev.roomTypes];
      const target = list[index];
      if (!target) return prev;
      list[index] = { ...target, [field]: val };
      return { ...prev, roomTypes: list };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGeneralError(null);

    // Validate using Zod schema
    const parsed = hotelFormSchema.safeParse(form);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".");
        errors[path] = issue.message;
      }
      setFormErrors(errors);
      const firstMsg = parsed.error.issues[0]?.message ?? "Please fix validation errors";
      toast.error(firstMsg);
      return;
    }

    // Verify room photo uploads (each room type must have overview & bathroom)
    for (let i = 0; i < form.roomTypes.length; i++) {
      const rt = form.roomTypes[i];
      if (!rt?.roomOverviewPhoto) {
        toast.error(`Room Type #${i + 1} is missing a Room Overview photo`);
        return;
      }
      if (!rt?.bathroomPhoto) {
        toast.error(`Room Type #${i + 1} is missing a Bathroom photo`);
        return;
      }
    }

    setBusy(true);

    const calculatedBasePrice =
      form.roomTypes.length > 0
        ? Math.min(...form.roomTypes.map((rt) => rt.pricePerNight))
        : 0;

    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      profileLogo: form.profileLogo.trim(),
      stateId: form.stateId,
      districtId: form.districtId,
      description: form.description.trim(),
      rating: initialHotel?.rating ?? 0,
      costPerNight: calculatedBasePrice,
      latitude: resolvedCoords?.lat ?? 0,
      longitude: resolvedCoords?.lng ?? 0,
      phone: form.phone.trim(),
      whatsapp: form.whatsapp.trim(),
      email: form.email.trim(),
      website: form.website.trim(),
      bookingEnabled: initialHotel?.booking_enabled ?? true,
      images: initialHotel?.images ?? [form.profileLogo],
      foodCategory: "PUREVEG" as const,
      menu: [],
      starRating: form.starRating ?? null,
      mapsUrl: form.mapsUrl?.trim() || null,
      checkInTimeType: form.specifyTimes ? form.checkInTimeType ?? "SPECIFIC" : null,
      checkInTime: form.specifyTimes && form.checkInTimeType === "SPECIFIC" ? form.checkInTime : null,
      checkInStartTime: form.specifyTimes && form.checkInTimeType === "RANGE" ? form.checkInStartTime : null,
      checkInEndTime: form.specifyTimes && form.checkInTimeType === "RANGE" ? form.checkInEndTime : null,
      checkOutTimeType: form.specifyTimes ? form.checkOutTimeType ?? "SPECIFIC" : null,
      checkOutTime: form.specifyTimes && form.checkOutTimeType === "SPECIFIC" ? form.checkOutTime : null,
      checkOutStartTime: form.specifyTimes && form.checkOutTimeType === "RANGE" ? form.checkOutStartTime : null,
      checkOutEndTime: form.specifyTimes && form.checkOutTimeType === "RANGE" ? form.checkOutEndTime : null,
      roomTypes: form.roomTypes as HotelRoomTypeRecord[],
    };

    const result = listingId
      ? await editService(listingId, payload)
      : await addService(payload);

    setBusy(false);

    if (!result.ok) {
      setGeneralError(result.message);
      toast.error(result.message);
      return;
    }

    toast.success(listingId ? "Hotel updated successfully" : "Hotel submitted for approval!");
    router.push("/services");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto w-full max-w-5xl space-y-8"
      noValidate
    >
      {generalError ? (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <p className="font-semibold">Unable to save hotel listing</p>
          <p className="mt-1">{generalError}</p>
        </div>
      ) : null}

      {/* SECTION 1: HOTEL DETAILS */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3 border-b border-border pb-4">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Hotel Details</h2>
            <p className="text-xs text-muted-foreground">
              Essential property information, location, and contact details
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Hotel Name */}
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="hotel-name" className="text-sm font-medium">
              Hotel Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="hotel-name"
              placeholder="e.g. Royal Orchid Heritage"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="rounded-xl"
            />
            {formErrors.name ? (
              <p className="text-xs text-destructive">{formErrors.name}</p>
            ) : null}
          </div>

          {/* Physical Address */}
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="hotel-address" className="text-sm font-medium">
              Manual Physical Address <span className="text-destructive">*</span>
            </Label>
            <Input
              id="hotel-address"
              placeholder="Door No, Street Name, Landmark, Area, Pincode"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
              className="rounded-xl"
            />
            {formErrors.address ? (
              <p className="text-xs text-destructive">{formErrors.address}</p>
            ) : null}
          </div>

          {/* State Cascading */}
          <div className="space-y-1.5">
            <Label htmlFor="hotel-state" className="text-sm font-medium">
              State <span className="text-destructive">*</span>
            </Label>
            <Select value={form.stateId} onValueChange={handleStateChange}>
              <SelectTrigger id="hotel-state" className="rounded-xl">
                <SelectValue placeholder="Select an enabled state" />
              </SelectTrigger>
              <SelectContent>
                {states.map((st) => (
                  <SelectItem key={st.id} value={st.id}>
                    {st.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formErrors.stateId ? (
              <p className="text-xs text-destructive">{formErrors.stateId}</p>
            ) : null}
          </div>

          {/* District Cascading */}
          <div className="space-y-1.5">
            <Label htmlFor="hotel-district" className="text-sm font-medium">
              District <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.districtId}
              onValueChange={(val) => updateField("districtId", val)}
              disabled={!form.stateId || loadingDistricts}
            >
              <SelectTrigger id="hotel-district" className="rounded-xl">
                <SelectValue
                  placeholder={
                    !form.stateId
                      ? "Select state first"
                      : loadingDistricts
                      ? "Loading districts…"
                      : "Select an enabled district"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {districts.map((dst) => (
                  <SelectItem key={dst.id} value={dst.id}>
                    {dst.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formErrors.districtId ? (
              <p className="text-xs text-destructive">{formErrors.districtId}</p>
            ) : null}
          </div>

          {/* Google Maps Sharing Link */}
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="hotel-maps-url" className="text-sm font-medium">
              Google Maps Sharing Link
            </Label>
            <div className="flex gap-2">
              <Input
                id="hotel-maps-url"
                placeholder="https://maps.app.goo.gl/... or https://www.google.com/maps/..."
                value={form.mapsUrl ?? ""}
                onChange={(e) => updateField("mapsUrl", e.target.value)}
                className="rounded-xl"
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0 rounded-xl"
                disabled={resolvingMaps || !form.mapsUrl?.trim()}
                onClick={handleResolveMaps}
              >
                {resolvingMaps ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Compass className="size-4" />
                )}
                Resolve
              </Button>
            </div>
            {resolvedCoords ? (
              <p className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                <Check className="size-3.5" />
                Coordinates derived: {resolvedCoords.lat.toFixed(5)}, {resolvedCoords.lng.toFixed(5)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Paste a Google Maps link and click Resolve to automatically derive coordinates.
              </p>
            )}
          </div>

          {/* Hotel Star Classification */}
          <div className="space-y-1.5">
            <Label htmlFor="hotel-star-rating" className="text-sm font-medium">
              Declared Star Classification (Optional)
            </Label>
            <Select
              value={form.starRating ? String(form.starRating) : "none"}
              onValueChange={(val) =>
                updateField("starRating", val === "none" ? null : Number(val))
              }
            >
              <SelectTrigger id="hotel-star-rating" className="rounded-xl">
                <SelectValue placeholder="Not specified" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not specified</SelectItem>
                <SelectItem value="1">1 Star ★</SelectItem>
                <SelectItem value="2">2 Stars ★★</SelectItem>
                <SelectItem value="3">3 Stars ★★★</SelectItem>
                <SelectItem value="4">4 Stars ★★★★</SelectItem>
                <SelectItem value="5">5 Stars ★★★★★</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Property’s official or declared classification, separate from traveller reviews.
            </p>
          </div>

          {/* Contact Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="hotel-phone" className="text-sm font-medium">
              Contact Phone
            </Label>
            <Input
              id="hotel-phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={form.phone ?? ""}
              onChange={(e) => updateField("phone", e.target.value)}
              className="rounded-xl"
            />
            {formErrors.phone ? (
              <p className="text-xs text-destructive">{formErrors.phone}</p>
            ) : null}
          </div>

          {/* WhatsApp */}
          <div className="space-y-1.5">
            <Label htmlFor="hotel-whatsapp" className="text-sm font-medium">
              WhatsApp Number
            </Label>
            <Input
              id="hotel-whatsapp"
              type="tel"
              placeholder="+91 98765 43210"
              value={form.whatsapp ?? ""}
              onChange={(e) => updateField("whatsapp", e.target.value)}
              className="rounded-xl"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="hotel-email" className="text-sm font-medium">
              Contact Email
            </Label>
            <Input
              id="hotel-email"
              type="email"
              placeholder="info@hotel.com"
              value={form.email ?? ""}
              onChange={(e) => updateField("email", e.target.value)}
              className="rounded-xl"
            />
          </div>

          {/* Website */}
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="hotel-website" className="text-sm font-medium">
              Website URL
            </Label>
            <Input
              id="hotel-website"
              type="url"
              placeholder="https://www.examplehotel.com"
              value={form.website ?? ""}
              onChange={(e) => updateField("website", e.target.value)}
              className="rounded-xl"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="hotel-description" className="text-sm font-medium">
              Hotel Description
            </Label>
            <Textarea
              id="hotel-description"
              rows={3}
              placeholder="Describe your hotel, ambiance, proximity to landmarks, etc."
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              className="rounded-xl"
            />
          </div>

          {/* Cover Photo Upload */}
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-sm font-medium">
              Hotel Cover Photo <span className="text-destructive">*</span>
            </Label>
            <CloudinarySingleUpload
              value={form.profileLogo}
              folder="hotel_profile"
              label="Hotel Cover Photo"
              onChange={(url) => updateField("profileLogo", url)}
            />
            {formErrors.profileLogo ? (
              <p className="text-xs text-destructive">{formErrors.profileLogo}</p>
            ) : null}
          </div>
        </div>
      </div>

      {/* SECTION 2: CHECK-IN & CHECK-OUT POLICY */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Clock className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Check-in & Check-out Policy</h2>
              <p className="text-xs text-muted-foreground">
                Set exact hours or time windows for guest arrivals and departures
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="specify-times-toggle" className="text-sm font-medium">
              Specify check-in and check-out times
            </Label>
            <Switch
              id="specify-times-toggle"
              checked={form.specifyTimes}
              onCheckedChange={(checked) => updateField("specifyTimes", checked)}
            />
          </div>
        </div>

        {!form.specifyTimes ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Info className="size-4 shrink-0 text-primary" />
              Times are currently flexible. Guests will see that check-in and check-out times are flexible.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Check-in policy */}
            <div className="space-y-4 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Check-in Time</span>
                <div className="flex items-center gap-2 text-xs">
                  <Button
                    type="button"
                    size="sm"
                    variant={form.checkInTimeType === "SPECIFIC" ? "secondary" : "ghost"}
                    className="h-7 rounded-lg text-xs"
                    onClick={() => updateField("checkInTimeType", "SPECIFIC")}
                  >
                    Specific Time
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={form.checkInTimeType === "RANGE" ? "secondary" : "ghost"}
                    className="h-7 rounded-lg text-xs"
                    onClick={() => updateField("checkInTimeType", "RANGE")}
                  >
                    Time Range
                  </Button>
                </div>
              </div>

              {form.checkInTimeType === "SPECIFIC" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Exact Check-in Time</Label>
                  <Select
                    value={form.checkInTime}
                    onValueChange={(val) => updateField("checkInTime", val)}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((t) => (
                        <SelectItem key={`cin-${t}`} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">From</Label>
                    <Select
                      value={form.checkInStartTime}
                      onValueChange={(val) => updateField("checkInStartTime", val)}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Start" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((t) => (
                          <SelectItem key={`cins-${t}`} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Until</Label>
                    <Select
                      value={form.checkInEndTime}
                      onValueChange={(val) => updateField("checkInEndTime", val)}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="End" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((t) => (
                          <SelectItem key={`cine-${t}`} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>

            {/* Check-out policy */}
            <div className="space-y-4 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Check-out Time</span>
                <div className="flex items-center gap-2 text-xs">
                  <Button
                    type="button"
                    size="sm"
                    variant={form.checkOutTimeType === "SPECIFIC" ? "secondary" : "ghost"}
                    className="h-7 rounded-lg text-xs"
                    onClick={() => updateField("checkOutTimeType", "SPECIFIC")}
                  >
                    Specific Time
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={form.checkOutTimeType === "RANGE" ? "secondary" : "ghost"}
                    className="h-7 rounded-lg text-xs"
                    onClick={() => updateField("checkOutTimeType", "RANGE")}
                  >
                    Time Range
                  </Button>
                </div>
              </div>

              {form.checkOutTimeType === "SPECIFIC" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Exact Check-out Time</Label>
                  <Select
                    value={form.checkOutTime}
                    onValueChange={(val) => updateField("checkOutTime", val)}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map((t) => (
                        <SelectItem key={`cout-${t}`} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">From</Label>
                    <Select
                      value={form.checkOutStartTime}
                      onValueChange={(val) => updateField("checkOutStartTime", val)}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Start" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((t) => (
                          <SelectItem key={`couts-${t}`} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Until</Label>
                    <Select
                      value={form.checkOutEndTime}
                      onValueChange={(val) => updateField("checkOutEndTime", val)}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="End" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_OPTIONS.map((t) => (
                          <SelectItem key={`coute-${t}`} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: ROOM TYPES & ACCOMMODATION */}
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BedDouble className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Room Types & Accommodation</h2>
              <p className="text-xs text-muted-foreground">
                Configure distinct room categories, AC status, capacity, pricing, and required photos
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={addRoomType}
            className="rounded-xl shadow-sm"
          >
            <Plus className="size-4" /> Add Room Type
          </Button>
        </div>

        {form.roomTypes.map((rt, idx) => (
          <RoomTypeCard
            key={rt.id ?? `room-idx-${idx}`}
            index={idx}
            totalRooms={form.roomTypes.length}
            room={rt}
            errors={formErrors}
            onUpdate={(field, val) => updateRoomType(idx, field, val)}
            onRemove={() => removeRoomType(idx)}
            onMoveUp={() => moveRoomType(idx, idx - 1)}
            onMoveDown={() => moveRoomType(idx, idx + 1)}
          />
        ))}
      </div>

      {/* SUBMIT ACTION BAR */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between rounded-2xl border border-border/80 bg-background/95 p-4 shadow-float backdrop-blur-md">
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={() => router.push("/services")}
        >
          Cancel
        </Button>
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={busy}
            className="rounded-xl px-6 font-semibold shadow-md"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}

function RoomTypeCard({
  index,
  totalRooms,
  room,
  errors,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  index: number;
  totalRooms: number;
  room: HotelRoomTypeValues;
  errors: Record<string, string>;
  onUpdate: <K extends keyof HotelRoomTypeValues>(
    field: K,
    val: HotelRoomTypeValues[K]
  ) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const errPrefix = `roomTypes.${index}`;

  return (
    <div className="relative rounded-2xl border border-border bg-card p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs font-semibold">
            Room Type #{index + 1}
          </Badge>
          <span className="font-semibold text-foreground">
            {room.title || "Untitled Room"}
          </span>
          <Badge
            variant={room.roomType === "AC" ? "default" : "secondary"}
            className="text-[0.65rem] uppercase"
          >
            {room.roomType}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={index === 0}
            onClick={onMoveUp}
            className="size-8 rounded-lg"
            title="Move Up"
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={index === totalRooms - 1}
            onClick={onMoveDown}
            className="size-8 rounded-lg"
            title="Move Down"
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onRemove}
            className="size-8 rounded-lg text-destructive hover:bg-destructive/10"
            title="Remove Room Type"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Room Title */}
        <div className="space-y-1.5 md:col-span-2">
          <Label className="text-sm font-medium">
            Room Type Title <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="e.g. Deluxe AC Double Room, Premium Suite, Standard Non-AC"
            value={room.title}
            onChange={(e) => onUpdate("title", e.target.value)}
            className="rounded-xl"
          />
          {errors[`${errPrefix}.title`] ? (
            <p className="text-xs text-destructive">{errors[`${errPrefix}.title`]}</p>
          ) : null}
        </div>

        {/* AC / Non-AC selection */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            AC Classification <span className="text-destructive">*</span>
          </Label>
          <Select
            value={room.roomType}
            onValueChange={(val: "AC" | "NON_AC") => onUpdate("roomType", val)}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AC">AC (Air Conditioned)</SelectItem>
              <SelectItem value="NON_AC">Non-AC</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Room Description */}
        <div className="space-y-1.5 md:col-span-3">
          <Label className="text-sm font-medium">
            Room Description <span className="text-destructive">*</span>
          </Label>
          <Textarea
            rows={2}
            placeholder="Describe the room layout, view, bed size, comfort features, etc."
            value={room.description}
            onChange={(e) => onUpdate("description", e.target.value)}
            className="rounded-xl"
          />
          {errors[`${errPrefix}.description`] ? (
            <p className="text-xs text-destructive">{errors[`${errPrefix}.description`]}</p>
          ) : null}
        </div>

        {/* Max Occupancy */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Max Guest Capacity <span className="text-destructive">*</span>
          </Label>
          <Input
            type="number"
            min={1}
            max={30}
            value={room.maxOccupancy}
            onChange={(e) => onUpdate("maxOccupancy", Number(e.target.value))}
            className="rounded-xl"
          />
          <p className="text-[0.7rem] text-muted-foreground">Maximum guests allowed per room</p>
        </div>

        {/* Physical Inventory */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Available Physical Rooms <span className="text-destructive">*</span>
          </Label>
          <Input
            type="number"
            min={0}
            max={500}
            value={room.availableRooms}
            onChange={(e) => onUpdate("availableRooms", Number(e.target.value))}
            className="rounded-xl"
          />
          <p className="text-[0.7rem] text-muted-foreground">Physical rooms available for booking</p>
        </div>

        {/* Nightly Price */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Price per Night (₹ INR) <span className="text-destructive">*</span>
          </Label>
          <Input
            type="number"
            min={0}
            value={room.pricePerNight}
            onChange={(e) => onUpdate("pricePerNight", Number(e.target.value))}
            className="rounded-xl"
          />
          <p className="text-[0.7rem] text-muted-foreground">Base room rate per night</p>
        </div>

        {/* Facilities Section */}
        <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4 md:col-span-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Room Facilities
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            {/* Hot water */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Hot Water</Label>
              <Select
                value={room.hasHotWater ? "AVAILABLE" : "UNAVAILABLE"}
                onValueChange={(val) => onUpdate("hasHotWater", val === "AVAILABLE")}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="UNAVAILABLE">Not Available</SelectItem>
                </SelectContent>
              </Select>
              {room.hasHotWater ? (
                <div className="pt-1">
                  <Input
                    type="number"
                    placeholder="Extra charge (₹, or leave blank if free)"
                    value={room.hotWaterCharge ?? ""}
                    onChange={(e) =>
                      onUpdate(
                        "hotWaterCharge",
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className="h-8 rounded-lg text-xs"
                  />
                </div>
              ) : null}
            </div>

            {/* Television */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Television</Label>
              <Select
                value={room.hasTv ? "AVAILABLE" : "UNAVAILABLE"}
                onValueChange={(val) => onUpdate("hasTv", val === "AVAILABLE")}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="UNAVAILABLE">Not Available</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Attached Bathroom */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Attached Bathroom</Label>
              <Select
                value={room.hasAttachedBathroom ? "YES" : "NO"}
                onValueChange={(val) => onUpdate("hasAttachedBathroom", val === "YES")}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YES">Yes</SelectItem>
                  <SelectItem value="NO">No</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Wi-Fi */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Wi-Fi</Label>
              <Select
                value={room.hasWifi ? "YES" : "NO"}
                onValueChange={(val) => onUpdate("hasWifi", val === "YES")}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="YES">Yes</SelectItem>
                  <SelectItem value="NO">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Required Room Photos */}
        <div className="space-y-3 rounded-xl border border-border p-4 md:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Required Room Photos
              </h4>
              <p className="text-xs text-muted-foreground">
                Both photos must be uploaded through Cloudinary before this room type can be saved.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Overview Photo */}
            <div>
              <Label className="mb-1.5 block text-xs font-medium">
                1. Room Overview Photo <span className="text-destructive">*</span>
              </Label>
              <CloudinarySingleUpload
                value={room.roomOverviewPhoto}
                folder="hotel_rooms"
                label="Room Overview"
                onChange={(url) => onUpdate("roomOverviewPhoto", url)}
              />
              {errors[`${errPrefix}.roomOverviewPhoto`] ? (
                <p className="mt-1 text-xs text-destructive">
                  {errors[`${errPrefix}.roomOverviewPhoto`]}
                </p>
              ) : null}
            </div>

            {/* Bathroom Photo */}
            <div>
              <Label className="mb-1.5 block text-xs font-medium">
                2. Bathroom Photo <span className="text-destructive">*</span>
              </Label>
              <CloudinarySingleUpload
                value={room.bathroomPhoto}
                folder="hotel_bathrooms"
                label="Bathroom Photo"
                onChange={(url) => onUpdate("bathroomPhoto", url)}
              />
              {errors[`${errPrefix}.bathroomPhoto`] ? (
                <p className="mt-1 text-xs text-destructive">
                  {errors[`${errPrefix}.bathroomPhoto`]}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {/* Additional Services & Inclusions */}
        <div className="space-y-3 rounded-xl border border-border p-4 md:col-span-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Additional Services & Inclusions
              </h4>
              <p className="text-xs text-muted-foreground">
                Configure meals, extra bedding, pickup, and optional paid add-ons
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 rounded-lg text-xs"
              onClick={() => {
                const current = room.additionalServices ?? [];
                onUpdate("additionalServices", [
                  ...current,
                  { name: "Extra bed", type: "EXTRA_CHARGE", price: 500, priceBasis: "per night" },
                ]);
              }}
            >
              <Plus className="size-3" /> Add Service
            </Button>
          </div>

          {room.additionalServices && room.additionalServices.length > 0 ? (
            <div className="space-y-2">
              {room.additionalServices.map((srv, sIdx) => (
                <div
                  key={`srv-${sIdx}`}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/30 p-2.5 text-xs"
                >
                  <Select
                    value={
                      STANDARD_SERVICES.includes(srv.name)
                        ? srv.name
                        : "Other"
                    }
                    onValueChange={(val) => {
                      const updated = [...room.additionalServices!];
                      if (val === "Other") {
                        updated[sIdx] = { ...srv, name: "" };
                      } else {
                        updated[sIdx] = { ...srv, name: val };
                      }
                      onUpdate("additionalServices", updated);
                    }}
                  >
                    <SelectTrigger className="h-8 w-44 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STANDARD_SERVICES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* If Other, custom name input */}
                  {!STANDARD_SERVICES.slice(0, -1).includes(srv.name) ? (
                    <Input
                      placeholder="Service name"
                      value={srv.name}
                      onChange={(e) => {
                        const updated = [...room.additionalServices!];
                        updated[sIdx] = { ...srv, name: e.target.value };
                        onUpdate("additionalServices", updated);
                      }}
                      className="h-8 w-36 rounded-lg text-xs"
                    />
                  ) : null}

                  <Select
                    value={srv.type}
                    onValueChange={(val: "INCLUDED" | "EXTRA_CHARGE" | "UNAVAILABLE") => {
                      const updated = [...room.additionalServices!];
                      updated[sIdx] = { ...srv, type: val };
                      onUpdate("additionalServices", updated);
                    }}
                  >
                    <SelectTrigger className="h-8 w-40 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INCLUDED">Included in price</SelectItem>
                      <SelectItem value="EXTRA_CHARGE">Extra Charge</SelectItem>
                      <SelectItem value="UNAVAILABLE">Unavailable</SelectItem>
                    </SelectContent>
                  </Select>

                  {srv.type === "EXTRA_CHARGE" ? (
                    <>
                      <Input
                        type="number"
                        placeholder="₹ Price"
                        value={srv.price ?? ""}
                        onChange={(e) => {
                          const updated = [...room.additionalServices!];
                          updated[sIdx] = {
                            ...srv,
                            price: e.target.value ? Number(e.target.value) : undefined,
                          };
                          onUpdate("additionalServices", updated);
                        }}
                        className="h-8 w-24 rounded-lg text-xs"
                      />
                      <Input
                        placeholder="Basis (e.g. per night)"
                        value={srv.priceBasis ?? ""}
                        onChange={(e) => {
                          const updated = [...room.additionalServices!];
                          updated[sIdx] = { ...srv, priceBasis: e.target.value };
                          onUpdate("additionalServices", updated);
                        }}
                        className="h-8 w-32 rounded-lg text-xs"
                      />
                    </>
                  ) : null}

                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      const updated = room.additionalServices!.filter((_, i) => i !== sIdx);
                      onUpdate("additionalServices", updated);
                    }}
                    className="ml-auto size-7 rounded-lg text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              No additional services added. Click “Add Service” to specify included meals, extra beds, etc.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Dedicated single Cloudinary upload component that does NOT accept typed URLs.
 * Providers select an actual file, which uploads to Cloudinary via server action.
 */
function CloudinarySingleUpload({
  value,
  folder,
  label,
  onChange,
}: {
  value: string | null;
  folder: "hotel_profile" | "hotel_rooms" | "hotel_bathrooms";
  label: string;
  onChange: (url: string) => void;
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const invalid = validateImageFile(file);
    if (invalid) {
      setError(invalid);
      toast.error(invalid);
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const res = await uploadHotelPhoto(file, folder);
      if (res.ok) {
        onChange(res.data);
        toast.success(`${label} uploaded`);
      } else {
        const msg = res.message || "Photo upload failed";
        setError(msg);
        toast.error(msg);
      }
    } catch {
      setError("Failed to upload photo. Please try again.");
      toast.error("Photo upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        onChange={handleFileSelected}
        className="hidden"
      />

      <div className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted">
          {value ? (
            <AppImage
              src={value}
              alt={label}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <FileImage className="size-6" />
            </div>
          )}
          {uploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="rounded-xl"
            >
              <Upload className="size-3.5" />
              {value ? "Replace Photo" : "Upload Photo"}
            </Button>
            {value ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={uploading}
                onClick={() => onChange("")}
                className="rounded-xl text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-3.5" /> Remove
              </Button>
            ) : null}
          </div>
          <p className="text-[0.7rem] text-muted-foreground">
            JPEG, PNG, or WebP. Max 5MB. Uploaded securely to Cloudinary.
          </p>
          {error ? <p className="text-[0.7rem] text-destructive">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
