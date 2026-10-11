"use client";

import {
  BedDouble,
  BedSingle,
  Check,
  Clock,
  Compass,
  FileImage,
  Info,
  Loader2,
  MapPin,
  Plus,
  Sparkles,
  Trash2,
  Upload,
  Users,
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
  emptyStay,
  emptyStayRoomType,
  stayFormSchema,
  STAY_CATEGORIES,
  STAY_FACILITIES,
  STAY_ACTIVITIES,
  type StayFormValues,
  type StayRoomTypeValues,
} from "@/features/provider/schemas";
import type {
  DistrictRef,
  HotelRecord,
  HotelRoomTypeRecord,
  ProviderListingInput,
} from "@/features/provider/types";
import type { StateRef } from "@/features/locations/api/locations.api";
import { validateImageFile, ACCEPT_ATTRIBUTE } from "@/lib/upload/image";

const TIME_OPTIONS = [
  "06:00 AM", "07:00 AM", "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
  "06:00 PM", "07:00 PM", "08:00 PM", "09:00 PM", "10:00 PM", "11:00 PM",
];

export function StayForm({
  initialStay,
  listingId,
  submitLabel,
  initialStates = [],
  initialDistricts = [],
}: {
  initialStay?: HotelRecord;
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
    initialStay?.latitude && initialStay?.longitude
      ? { lat: initialStay.latitude, lng: initialStay.longitude }
      : null
  );

  const [form, setForm] = React.useState<StayFormValues>(() => {
    if (!initialStay) return emptyStay();

    const existingStateId =
      initialStay.district?.stateId ||
      initialStay.district?.state?.id ||
      "";

    const mappedRooms: StayRoomTypeValues[] =
      initialStay.room_types && initialStay.room_types.length > 0
        ? initialStay.room_types.map((rt: HotelRoomTypeRecord, idx: number) => ({
            id: rt.id,
            title: rt.title || `Room / Dorm #${idx + 1}`,
            description: rt.description || "",
            roomCategory: (rt.roomCategory === "DORMITORY" ? "DORMITORY" : "PRIVATE") as "DORMITORY" | "PRIVATE",
            bedType: rt.bedType || (rt.roomCategory === "DORMITORY" ? "Bunk bed" : "Double bed"),
            dormGender: (rt.dormGender === "FEMALE" || rt.dormGender === "MALE" ? rt.dormGender : "MIXED") as "MIXED" | "FEMALE" | "MALE",
            bedCapacity: rt.bedCapacity || (rt.roomCategory === "DORMITORY" ? 6 : 1),
            roomType: rt.roomType || "AC",
            maxOccupancy: rt.maxOccupancy || 1,
            availableRooms: rt.availableRooms || 1,
            pricePerNight: rt.pricePerNight || initialStay.cost_per_night || 549,
            pricingUnit: (rt.pricingUnit === "PER_BED" ? "PER_BED" : "PER_ROOM") as "PER_BED" | "PER_ROOM",
            roomOverviewPhoto: rt.roomOverviewPhoto || "",
            bathroomPhoto: rt.bathroomPhoto || "",
            images: rt.images || [],
            hasHotWater: rt.hasHotWater !== false,
            hasTv: Boolean(rt.hasTv),
            hasAttachedBathroom: rt.hasAttachedBathroom !== false,
            hasWifi: rt.hasWifi !== false,
            facilities: rt.facilities || [],
            additionalServices: (rt.additionalServices || []).map((as) => ({
              name: as.name,
              type: as.type as "INCLUDED" | "EXTRA_CHARGE" | "UNAVAILABLE",
              price: as.price,
              priceBasis: as.priceBasis,
              description: as.description,
            })),
            conditions: rt.conditions || "",
            isActive: rt.isActive !== false,
            displayOrder: rt.displayOrder || idx,
          }))
        : [emptyStayRoomType(0, true), emptyStayRoomType(1, false)];

    return {
      name: initialStay.name || "",
      address: initialStay.address || "",
      profileLogo: initialStay.profile_logo || "",
      stateId: existingStateId,
      districtId: initialStay.districtId || "",
      stayCategory: initialStay.stay_category || "backpacker_hostel",
      description: initialStay.description || "",
      mapsUrl: initialStay.maps_url || "",
      phone: initialStay.phone_number || "",
      whatsapp: initialStay.whatsapp_number || "",
      email: initialStay.email || "",
      website: initialStay.website || "",
      facilities: initialStay.facilities && initialStay.facilities.length > 0 ? initialStay.facilities : [
        "Common room / Lounge",
        "Free High-speed Wi-Fi",
        "Guest kitchen / Microwave",
        "Luggage storage",
        "Personal lockers",
        "Rooftop terrace",
      ],
      accommodationRules: initialStay.accommodation_rules || "• Check-in from 1:00 PM. Valid government photo ID required.\n• Quiet hours from 11:00 PM to 7:00 AM.\n• Outside visitors not permitted in dorm rooms.\n• Non-smoking in all indoor areas.",
      cancellationPolicy: initialStay.cancellation_policy || "Free cancellation up to 24 hours prior to check-in. Non-refundable thereafter.",
      activities: initialStay.activities && initialStay.activities.length > 0 ? initialStay.activities : [
        "Guided walking tours",
        "Evening bonfire sessions",
        "Social game & movie nights",
      ],
      specifyTimes: true,
      checkInTimeType: initialStay.check_in_time_type === "SPECIFIC" ? "SPECIFIC" : "RANGE",
      checkInTime: initialStay.check_in_time || "01:00 PM",
      checkInStartTime: initialStay.check_in_start_time || "01:00 PM",
      checkInEndTime: initialStay.check_in_end_time || "10:00 PM",
      checkOutTimeType: initialStay.check_out_time_type === "RANGE" ? "RANGE" : "SPECIFIC",
      checkOutTime: initialStay.check_out_time || "11:00 AM",
      checkOutStartTime: initialStay.check_out_start_time || "08:00 AM",
      checkOutEndTime: initialStay.check_out_end_time || "11:00 AM",
      roomTypes: mappedRooms,
    };
  });

  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (states.length === 0) {
      fetchStates().then(setStates).catch(() => {});
    }
  }, [states.length]);

  React.useEffect(() => {
    if (!form.stateId) {
      setDistricts([]);
      return;
    }
    setLoadingDistricts(true);
    fetchDistrictsByState(form.stateId)
      .then((items) => {
        setDistricts(items);
        if (!items.some((d) => d.id === form.districtId)) {
          setForm((prev) => ({ ...prev, districtId: "" }));
        }
      })
      .catch(() => {
        toast.error("Could not load districts for this state");
      })
      .finally(() => setLoadingDistricts(false));
  }, [form.stateId]);

  async function handleResolveMaps() {
    if (!form.mapsUrl?.trim()) {
      toast.error("Please enter a Google Maps link first");
      return;
    }
    setResolvingMaps(true);
    const result = await resolveLocationLink(form.mapsUrl.trim());
    setResolvingMaps(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setResolvedCoords({ lat: result.data.latitude, lng: result.data.longitude });
    toast.success("Coordinates successfully resolved from Google Maps!");
  }

  async function handleCoverUpload(file: File) {
    const error = validateImageFile(file);
    if (error) {
      toast.error(error);
      return;
    }
    const toastId = toast.loading("Uploading cover photo to Cloudinary...");
    const result = await uploadHotelPhoto(file, "hotel_profile");
    toast.dismiss(toastId);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    setForm((prev) => ({ ...prev, profileLogo: result.data }));
    toast.success("Cover photo uploaded!");
  }

  function toggleFacility(item: string) {
    setForm((prev) => {
      const exists = prev.facilities.includes(item);
      return {
        ...prev,
        facilities: exists
          ? prev.facilities.filter((f) => f !== item)
          : [...prev.facilities, item],
      };
    });
  }

  function toggleActivity(item: string) {
    setForm((prev) => {
      const exists = prev.activities.includes(item);
      return {
        ...prev,
        activities: exists
          ? prev.activities.filter((a) => a !== item)
          : [...prev.activities, item],
      };
    });
  }

  function addDorm() {
    setForm((prev) => ({
      ...prev,
      roomTypes: [...prev.roomTypes, emptyStayRoomType(prev.roomTypes.length, true)],
    }));
  }

  function addPrivateRoom() {
    setForm((prev) => ({
      ...prev,
      roomTypes: [...prev.roomTypes, emptyStayRoomType(prev.roomTypes.length, false)],
    }));
  }

  function updateRoom(index: number, patch: Partial<StayRoomTypeValues>) {
    setForm((prev) => {
      const updated = [...prev.roomTypes];
      updated[index] = { ...updated[index], ...patch };
      return { ...prev, roomTypes: updated };
    });
  }

  function removeRoom(index: number) {
    if (form.roomTypes.length <= 1) {
      toast.error("A stay property must have at least one room or dorm configuration.");
      return;
    }
    setForm((prev) => ({
      ...prev,
      roomTypes: prev.roomTypes.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    const parsed = stayFormSchema.safeParse(form);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const path = issue.path.join(".");
        errors[path] = issue.message;
      });
      setFieldErrors(errors);
      toast.error(parsed.error.issues[0]?.message || "Please check form errors");
      return;
    }

    setBusy(true);

    const lowestStartingPrice = form.roomTypes.reduce((min, room) => {
      return room.pricePerNight < min ? room.pricePerNight : min;
    }, form.roomTypes[0]?.pricePerNight || 549);

    const payload: ProviderListingInput = {
      name: form.name.trim(),
      property_type: "STAY",
      propertyType: "STAY",
      stay_category: form.stayCategory,
      stayCategory: form.stayCategory,
      address: form.address.trim(),
      stateId: form.stateId,
      districtId: form.districtId,
      mapsUrl: form.mapsUrl?.trim() || undefined,
      description: form.description.trim(),
      profileLogo: form.profileLogo,
      images: [form.profileLogo],
      costPerNight: lowestStartingPrice,
      latitude: resolvedCoords?.lat ?? 12.9716,
      longitude: resolvedCoords?.lng ?? 77.5946,
      phone: form.phone.trim() || "",
      whatsapp: form.whatsapp.trim() || "",
      email: form.email.trim() || "",
      website: form.website.trim() || "",
      checkInTimeType: form.checkInTimeType,
      checkInTime: form.checkInTime,
      checkInStartTime: form.checkInStartTime,
      checkInEndTime: form.checkInEndTime,
      checkOutTimeType: form.checkOutTimeType,
      checkOutTime: form.checkOutTime,
      checkOutStartTime: form.checkOutStartTime,
      checkOutEndTime: form.checkOutEndTime,
      bookingEnabled: true,
      accommodation_rules: form.accommodationRules,
      accommodationRules: form.accommodationRules,
      cancellation_policy: form.cancellationPolicy,
      cancellationPolicy: form.cancellationPolicy,
      facilities: form.facilities,
      activities: form.activities,
      roomTypes: form.roomTypes.map((rt, idx) => ({
        id: rt.id,
        title: rt.title,
        description: rt.description,
        roomType: rt.roomType,
        maxOccupancy: rt.maxOccupancy,
        availableRooms: rt.availableRooms,
        pricePerNight: rt.pricePerNight,
        roomOverviewPhoto: rt.roomOverviewPhoto,
        bathroomPhoto: rt.bathroomPhoto,
        images: rt.images,
        hasHotWater: rt.hasHotWater,
        hasTv: rt.hasTv,
        hasAttachedBathroom: rt.hasAttachedBathroom,
        hasWifi: rt.hasWifi,
        facilities: rt.facilities,
        additionalServices: rt.additionalServices,
        roomCategory: rt.roomCategory,
        bedType: rt.bedType,
        dormGender: rt.dormGender,
        bedCapacity: rt.bedCapacity,
        pricingUnit: rt.pricingUnit,
        displayOrder: idx,
      })),
    };

    try {
      if (listingId) {
        const res = await editService(listingId, payload);
        if (!res.ok) {
          toast.error(res.message);
          setBusy(false);
          return;
        }
        toast.success("Stay property updated successfully!");
        router.push("/services");
        router.refresh();
      } else {
        const res = await addService(payload);
        if (!res.ok) {
          toast.error(res.message);
          setBusy(false);
          return;
        }
        toast.success("Stay property submitted for approval!");
        router.push("/services");
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong saving the stay.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 pb-12">
      {/* 1. Stay Category & Basic Info */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <Sparkles className="size-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-lg font-bold">1. Stay Category & Identity</h2>
        </div>

        <div>
          <Label className="font-semibold text-sm">Accommodation Category</Label>
          <p className="text-xs text-muted-foreground mb-3">
            Select the category that best describes your accommodation style.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {STAY_CATEGORIES.map((cat) => {
              const active = form.stayCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, stayCategory: cat.value }))}
                  className={`flex flex-col text-left p-3.5 rounded-xl border transition-all ${
                    active
                      ? "border-emerald-600 bg-emerald-500/10 shadow-sm"
                      : "border-border bg-background hover:border-emerald-500/40"
                  }`}
                >
                  <span className="text-sm font-bold flex items-center justify-between">
                    {cat.label}
                    {active ? <Check className="size-4 text-emerald-600" /> : null}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    {cat.blurb}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="stay-name" className="font-semibold">
            Stay / Hostel Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="stay-name"
            placeholder="e.g. Zostel Mysuru, The Heritage Homestay Coorg"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            required
          />
          {fieldErrors.name ? (
            <p className="text-xs text-destructive">{fieldErrors.name}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="stay-description" className="font-semibold">
            About the Stay & Vibe
          </Label>
          <Textarea
            id="stay-description"
            rows={4}
            placeholder="Tell backpackers and travellers about the atmosphere, common rooftop cafe, community events, nearby attractions, and what makes your stay special..."
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          />
        </div>
      </div>

      {/* 2. Location & Coordinates */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <MapPin className="size-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-lg font-bold">2. Location & Address</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="font-semibold">
              State <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.stateId}
              onValueChange={(val) => setForm((prev) => ({ ...prev, stateId: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {states.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.stateId ? (
              <p className="text-xs text-destructive">{fieldErrors.stateId}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold">
              District <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.districtId}
              onValueChange={(val) => setForm((prev) => ({ ...prev, districtId: val }))}
              disabled={!form.stateId || loadingDistricts}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingDistricts
                      ? "Loading districts..."
                      : !form.stateId
                        ? "Select a state first"
                        : "Select district"
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
            {fieldErrors.districtId ? (
              <p className="text-xs text-destructive">{fieldErrors.districtId}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="stay-address" className="font-semibold">
            Full Street Address <span className="text-destructive">*</span>
          </Label>
          <Input
            id="stay-address"
            placeholder="e.g. 14/2 Gokulam 3rd Stage, Near Contour Road, Mysuru"
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            required
          />
          {fieldErrors.address ? (
            <p className="text-xs text-destructive">{fieldErrors.address}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="maps-url" className="font-semibold">
            Google Maps Share Link
          </Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="maps-url"
              placeholder="https://maps.app.goo.gl/... or https://google.com/maps/place/..."
              value={form.mapsUrl || ""}
              onChange={(e) => setForm((prev) => ({ ...prev, mapsUrl: e.target.value }))}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleResolveMaps}
              disabled={resolvingMaps || !form.mapsUrl?.trim()}
              className="shrink-0 gap-1.5"
            >
              {resolvingMaps ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Compass className="size-4" />
              )}
              Resolve Pin
            </Button>
          </div>
          {resolvedCoords ? (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
              <Check className="size-3.5" /> Coordinates set: {resolvedCoords.lat.toFixed(4)}, {resolvedCoords.lng.toFixed(4)}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Paste a Google Maps pin or location share link to let travellers find your stay on platform maps.
            </p>
          )}
        </div>
      </div>

      {/* 3. Photos (Cover & Gallery) */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <FileImage className="size-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-lg font-bold">3. Cloudinary Photos</h2>
        </div>

        {/* Cover Photo */}
        <div>
          <Label className="font-semibold text-sm">
            Primary Cover Photo <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground mb-3">
            The main visual shown on stay discovery cards and hero header.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {form.profileLogo ? (
              <div className="relative size-32 rounded-xl overflow-hidden border border-border shrink-0">
                <AppImage
                  src={form.profileLogo}
                  alt="Stay cover"
                  className="size-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, profileLogo: "" }))}
                  className="absolute top-1 right-1 bg-black/70 p-1 rounded-full text-white hover:bg-black"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center size-32 rounded-xl border-2 border-dashed border-border hover:border-emerald-500/50 cursor-pointer bg-muted/40 transition-colors shrink-0">
                <Upload className="size-6 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground mt-1">Upload</span>
                <input
                  type="file"
                  accept={ACCEPT_ATTRIBUTE}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleCoverUpload(file);
                  }}
                />
              </label>
            )}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>Supports JPG, PNG, WEBP up to 10MB.</p>
              <p>Optimized and served securely through Cloudinary CDN.</p>
            </div>
          </div>
          {fieldErrors.profileLogo ? (
            <p className="text-xs text-destructive mt-1">{fieldErrors.profileLogo}</p>
          ) : null}
        </div>
      </div>

      {/* 4. Dormitories & Room Inventory */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <BedDouble className="size-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="text-lg font-bold">4. Dormitories & Room Configurations</h2>
              <p className="text-xs text-muted-foreground">
                Set up shared dorm beds (priced per bed) and private rooms (priced per room).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addDorm}
              className="gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
            >
              <Plus className="size-3.5" /> + Dorm Bed Setup
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPrivateRoom}
              className="gap-1"
            >
              <Plus className="size-3.5" /> + Private Room
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {form.roomTypes.map((room, idx) => {
            const isDorm = room.roomCategory === "DORMITORY";
            return (
              <div
                key={idx}
                className="rounded-xl border border-border/80 bg-background/60 p-5 space-y-4 transition-all"
              >
                <div className="flex items-center justify-between gap-3 border-b border-border/40 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-sm">{room.title}</span>
                    <Badge variant={isDorm ? "info" : "outline"} className="text-[0.65rem]">
                      {isDorm ? "Dormitory (Per Bed)" : "Private Room"}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeRoom(idx)}
                    className="size-8 text-destructive hover:bg-destructive/10"
                    title="Remove configuration"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Config Title</Label>
                    <Input
                      value={room.title}
                      onChange={(e) => updateRoom(idx, { title: e.target.value })}
                      placeholder="e.g. 6-Bed Mixed Dorm or Deluxe Room"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Room Type</Label>
                    <Select
                      value={room.roomCategory}
                      onValueChange={(val: "PRIVATE" | "DORMITORY") =>
                        updateRoom(idx, {
                          roomCategory: val,
                          pricingUnit: val === "DORMITORY" ? "PER_BED" : "PER_ROOM",
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DORMITORY">Dormitory (Shared)</SelectItem>
                        <SelectItem value="PRIVATE">Private Room</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">
                      {isDorm ? "Price per Bed (₹ / night)" : "Price per Room (₹ / night)"}
                    </Label>
                    <Input
                      type="number"
                      min={0}
                      value={room.pricePerNight}
                      onChange={(e) => updateRoom(idx, { pricePerNight: Number(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                {isDorm ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/30 p-3 rounded-lg border border-border/50">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Dorm Gender</Label>
                      <Select
                        value={room.dormGender}
                        onValueChange={(val: "MIXED" | "FEMALE" | "MALE") =>
                          updateRoom(idx, { dormGender: val })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MIXED">Mixed Dorm</SelectItem>
                          <SelectItem value="FEMALE">Female Only Dorm</SelectItem>
                          <SelectItem value="MALE">Male Only Dorm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Beds in this Dorm</Label>
                      <Input
                        type="number"
                        min={1}
                        value={room.bedCapacity || 6}
                        onChange={(e) =>
                          updateRoom(idx, {
                            bedCapacity: Number(e.target.value) || 1,
                            maxOccupancy: Number(e.target.value) || 1,
                          })
                        }
                        placeholder="e.g. 4, 6, 8, 10 beds"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Number of Identical Dorms</Label>
                      <Input
                        type="number"
                        min={1}
                        value={room.availableRooms}
                        onChange={(e) =>
                          updateRoom(idx, { availableRooms: Number(e.target.value) || 1 })
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-muted/30 p-3 rounded-lg border border-border/50">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Bed Type</Label>
                      <Input
                        value={room.bedType || "Queen Bed"}
                        onChange={(e) => updateRoom(idx, { bedType: e.target.value })}
                        placeholder="e.g. Queen Bed, Twin Beds"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Max Guest Capacity</Label>
                      <Input
                        type="number"
                        min={1}
                        value={room.maxOccupancy}
                        onChange={(e) =>
                          updateRoom(idx, { maxOccupancy: Number(e.target.value) || 1 })
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Total Private Rooms</Label>
                      <Input
                        type="number"
                        min={1}
                        value={room.availableRooms}
                        onChange={(e) =>
                          updateRoom(idx, { availableRooms: Number(e.target.value) || 1 })
                        }
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4 text-xs font-medium pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={room.hasAttachedBathroom}
                      onChange={(e) => updateRoom(idx, { hasAttachedBathroom: e.target.checked })}
                      className="rounded border-border text-emerald-600 focus:ring-emerald-500"
                    />
                    Attached Bathroom
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={room.hasHotWater}
                      onChange={(e) => updateRoom(idx, { hasHotWater: e.target.checked })}
                      className="rounded border-border text-emerald-600 focus:ring-emerald-500"
                    />
                    Hot Water
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={room.hasWifi}
                      onChange={(e) => updateRoom(idx, { hasWifi: e.target.checked })}
                      className="rounded border-border text-emerald-600 focus:ring-emerald-500"
                    />
                    Free Wi-Fi
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Stay Facilities & Activities */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <Users className="size-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-lg font-bold">5. Hostel Amenities & Community Experiences</h2>
        </div>

        <div>
          <Label className="font-semibold text-sm">Hostel Facilities & Services</Label>
          <p className="text-xs text-muted-foreground mb-3">
            Select amenities available for backpackers and staying guests.
          </p>
          <div className="flex flex-wrap gap-2">
            {STAY_FACILITIES.map((facility) => {
              const active = form.facilities.includes(facility);
              return (
                <button
                  key={facility}
                  type="button"
                  onClick={() => toggleFacility(facility)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:border-emerald-500/40"
                  }`}
                >
                  {facility}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label className="font-semibold text-sm">Community Activities & Experiences</Label>
          <p className="text-xs text-muted-foreground mb-3">
            Social events organized by your hostel (Zostel style social culture).
          </p>
          <div className="flex flex-wrap gap-2">
            {STAY_ACTIVITIES.map((activity) => {
              const active = form.activities.includes(activity);
              return (
                <button
                  key={activity}
                  type="button"
                  onClick={() => toggleActivity(activity)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:border-primary/40"
                  }`}
                >
                  {activity}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 6. House Rules & Check-in Settings */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <Clock className="size-5 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-lg font-bold">6. Check-in Times & House Rules</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="font-semibold">Check-in Window</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={form.checkInStartTime}
                onValueChange={(val) => setForm((prev) => ({ ...prev, checkInStartTime: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="From" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={form.checkInEndTime}
                onValueChange={(val) => setForm((prev) => ({ ...prev, checkInEndTime: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Until" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold">Check-out Time</Label>
            <Select
              value={form.checkOutTime}
              onValueChange={(val) => setForm((prev) => ({ ...prev, checkOutTime: val }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Check-out by" />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="house-rules" className="font-semibold">
            Accommodation Rules & Community Guidelines
          </Label>
          <Textarea
            id="house-rules"
            rows={3}
            placeholder="e.g. Quiet hours from 10:30 PM. Outside visitors prohibited in dorms. Valid government ID mandatory."
            value={form.accommodationRules}
            onChange={(e) => setForm((prev) => ({ ...prev, accommodationRules: e.target.value }))}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cancellation-policy" className="font-semibold">
            Cancellation Policy
          </Label>
          <Input
            id="cancellation-policy"
            placeholder="e.g. Free cancellation up to 48 hours prior to check-in."
            value={form.cancellationPolicy}
            onChange={(e) => setForm((prev) => ({ ...prev, cancellationPolicy: e.target.value }))}
          />
        </div>
      </div>

      {/* 7. Contact Details */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-bold border-b border-border/60 pb-3">7. Host Contact Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Phone Number</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="+91 98765 43210"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">WhatsApp Number</Label>
            <Input
              value={form.whatsapp}
              onChange={(e) => setForm((prev) => ({ ...prev, whatsapp: e.target.value }))}
              placeholder="+91 98765 43210"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-semibold">Host Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="host@hostel.com"
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={busy}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="action"
          size="lg"
          disabled={busy}
          className="min-w-40 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
        >
          {busy ? <Loader2 className="size-5 animate-spin mr-2" /> : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
