"use client";

import * as React from "react";
import {
  Bath,
  BedDouble,
  BedSingle,
  Building2,
  CalendarDays,
  Check,
  Clock,
  Compass,
  ExternalLink,
  FileText,
  Flame,
  Globe,
  Info,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  Tv,
  Users,
  Wifi,
  Wind,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AppImage } from "@/components/shared/app-image";
import { ScreenHeader } from "@/components/shared/screen-header";
import { SectionHeader } from "@/components/shared/section-header";
import { Rating } from "@/components/shared/rating";
import { BookingSummary } from "@/components/shared/booking-summary";
import { EnquireButtons } from "@/features/guides/ui/enquire-buttons";
import { ReviewsSection } from "@/features/reviews/ui/reviews";
import { MapEmbed } from "@/features/maps/ui/map-embed";
import { MapActionButtons } from "@/features/maps/ui/map-action-buttons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Hotel, HotelRoomType } from "@/features/hotels/types";
import { createHotelBooking } from "@/features/hotels/api/hotels.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { formatCurrency } from "@/lib/utils";

const STAY_CATEGORY_LABELS: Record<string, string> = {
  HOSTEL: "Backpacker Hostel",
  HOMESTAY: "Homestay",
  GUESTHOUSE: "Guesthouse",
  RESORT: "Boutique Stay",
  OTHER: "Unique Stay",
};

export function HotelView({
  hotel,
  districtSlug,
  stateSlug,
}: {
  hotel: Hotel;
  districtSlug: string;
  stateSlug?: string;
}) {
  const [bookingOpen, setBookingOpen] = React.useState(false);
  const [selectedRoomId, setSelectedRoomId] = React.useState<string | undefined>(
    undefined
  );

  const districtBase = stateSlug ? `/${stateSlug}/${districtSlug}` : "/explore";

  const isStay = hotel.property_type === "STAY" || Boolean(hotel.stay_category);
  const stayCategoryLabel = hotel.stay_category
    ? (STAY_CATEGORY_LABELS[hotel.stay_category] ?? hotel.stay_category)
    : "Stay & Hostel";

  const publishedRooms = React.useMemo(() => {
    return (hotel.room_types ?? []).filter((rt) => rt.isActive !== false);
  }, [hotel.room_types]);

  const minRoom = React.useMemo(() => {
    if (publishedRooms.length === 0) return null;
    return [...publishedRooms].sort((a, b) => a.pricePerNight - b.pricePerNight)[0];
  }, [publishedRooms]);

  const minPrice = React.useMemo(() => {
    if (minRoom) return minRoom.pricePerNight;
    return hotel.cost_per_night;
  }, [minRoom, hotel.cost_per_night]);

  const priceUnitLabel = minRoom?.pricingUnit === "PER_BED" || minRoom?.roomCategory === "DORMITORY"
    ? "starts per bed"
    : "starts per night";

  function handleOpenBooking(roomTypeId?: string) {
    if (!hotel.booking_enabled) {
      toast.error(`Bookings for this ${isStay ? "stay" : "hotel"} are currently not enabled.`);
      return;
    }
    setSelectedRoomId(roomTypeId);
    setBookingOpen(true);
  }

  // Format check-in / check-out policy strings
  const checkInPolicyText = React.useMemo(() => {
    if (!hotel.check_in_time_type) return "Flexible arrival";
    if (hotel.check_in_time_type === "SPECIFIC") {
      return hotel.check_in_time ? `From ${hotel.check_in_time}` : "Flexible";
    }
    if (hotel.check_in_start_time && hotel.check_in_end_time) {
      return `${hotel.check_in_start_time} – ${hotel.check_in_end_time}`;
    }
    return "Flexible";
  }, [hotel]);

  const checkOutPolicyText = React.useMemo(() => {
    if (!hotel.check_out_time_type) return "Flexible departure";
    if (hotel.check_out_time_type === "SPECIFIC") {
      return hotel.check_out_time ? `Until ${hotel.check_out_time}` : "Flexible";
    }
    if (hotel.check_out_start_time && hotel.check_out_end_time) {
      return `${hotel.check_out_start_time} – ${hotel.check_out_end_time}`;
    }
    return "Flexible";
  }, [hotel]);

  return (
    <div className="pb-12">
      <ScreenHeader
        title={isStay ? stayCategoryLabel : "Hotel"}
        subtitle={hotel.name}
        backHref={districtBase}
      />

      {/* Hero Banner */}
      <div className="relative -mx-4 overflow-hidden bg-zinc-900 sm:rounded-b-[2.5rem]">
        <div className="relative aspect-[16/10] max-h-[26rem] w-full">
          <AppImage
            src={hotel.images?.[0] ?? hotel.profile_logo}
            alt={hotel.name}
            className="size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 px-5 pb-5 sm:px-8">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                {isStay ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/80 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
                    <BedSingle className="size-3" /> {stayCategoryLabel}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
                    <Building2 className="size-3" /> Hotel
                  </span>
                )}
                {hotel.star_rating ? (
                  <Badge className="border-amber-400/40 bg-amber-500/90 text-white shadow-sm backdrop-blur-md">
                    {"★".repeat(hotel.star_rating)} {hotel.star_rating}-Star Classification
                  </Badge>
                ) : null}
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-md sm:text-3xl">
                {hotel.name}
              </h1>

              <Rating
                value={hotel.rating}
                count={hotel.review?.length}
                className="text-white [&_svg]:fill-amber-300 [&_svg]:text-amber-300"
              />
            </div>

            <div className="inline-flex shrink-0 flex-col items-end rounded-2xl bg-white/15 px-4 py-2.5 text-white shadow-lg backdrop-blur-md dark:bg-black/40">
              <span className="text-base font-bold sm:text-lg">
                {formatCurrency(minPrice)}
              </span>
              <span className="text-[0.65rem] uppercase tracking-wider text-white/80">
                {priceUnitLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary CTA */}
      <div className="app-container relative z-10 -mt-5 sm:mt-5 sm:px-0 sm:pt-2">
        <Button
          variant="action"
          size="lg"
          className="w-full rounded-2xl py-6 shadow-float text-base font-semibold"
          disabled={!hotel.booking_enabled}
          onClick={() => handleOpenBooking(publishedRooms[0]?.id)}
        >
          <CalendarDays className="size-5" /> Book a Stay
        </Button>
        {!hotel.booking_enabled ? (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Bookings for this hotel are currently disabled by the provider.
          </p>
        ) : null}
      </div>

      <div className="app-container mt-8 space-y-10">
        {/* Check-in & Check-out Policy Card */}
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2.5 text-sm font-semibold">
            <Clock className="size-4 text-primary" />
            Check-in & Check-out Policy
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Check-in
              </span>
              <p className="mt-1 text-sm font-semibold">{checkInPolicyText}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/30 p-3.5">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Check-out
              </span>
              <p className="mt-1 text-sm font-semibold">{checkOutPolicyText}</p>
            </div>
          </div>
        </section>

        {/* ROOM TYPES & ACCOMMODATION SECTION */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <SectionHeader
                title="Room Types & Options"
                subtitle={`${publishedRooms.length} ${
                  publishedRooms.length === 1 ? "room type available" : "room types available"
                }`}
              />
              <p className="text-xs text-muted-foreground">
                Explore distinct accommodation types, amenities, guest capacities, and room rates.
              </p>
            </div>
          </div>

          {publishedRooms.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              <p>Standard stay details apply. Use Book a Stay to enquire.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {publishedRooms.map((room) => (
                <CustomerRoomCard
                  key={room.id}
                  room={room}
                  bookingEnabled={hotel.booking_enabled}
                  onBook={() => handleOpenBooking(room.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ABOUT SECTION */}
        <section>
          <SectionHeader title="About" subtitle={hotel.district?.name ?? "Karnataka"} />
          <p className="text-[0.95rem] leading-relaxed text-foreground/90">
            {hotel.description ||
              "A comfortable stay in Karnataka. Check the gallery, amenities, and traveller reviews."}
          </p>
        </section>

        {/* SOCIAL & COMMUNITY EXPERIENCES (Hostels & Stays) */}
        {hotel.activities && hotel.activities.length > 0 ? (
          <section className="space-y-3">
            <SectionHeader
              title="Social & Community Experiences"
              subtitle="Events, walking tours and activities hosted at this stay"
            />
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-50/40 p-5 dark:bg-emerald-950/10">
              <div className="flex flex-wrap items-center gap-2">
                {hotel.activities.map((act) => (
                  <span
                    key={act}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-background/80 px-3 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300 shadow-sm"
                  >
                    <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    {act}
                  </span>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* PROPERTY & COMMUNITY FACILITIES */}
        {hotel.facilities && hotel.facilities.length > 0 ? (
          <section className="space-y-3">
            <SectionHeader
              title="Facilities & Amenities"
              subtitle="Common spaces and facilities available to guests"
            />
            <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                {hotel.facilities.map((fac) => (
                  <span
                    key={fac}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm"
                  >
                    <Check className="size-3.5 text-primary" />
                    {fac}
                  </span>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* HOUSE RULES & POLICIES */}
        {hotel.accommodation_rules || hotel.cancellation_policy ? (
          <section className="space-y-4">
            <SectionHeader title="House Rules & Policies" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {hotel.accommodation_rules ? (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <ShieldCheck className="size-4 text-primary" />
                    Accommodation & House Rules
                  </div>
                  <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                    {hotel.accommodation_rules}
                  </p>
                </div>
              ) : null}
              {hotel.cancellation_policy ? (
                <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <FileText className="size-4 text-primary" />
                    Cancellation & Refund Policy
                  </div>
                  <p className="whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                    {hotel.cancellation_policy}
                  </p>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* LOCATION SECTION */}
        <section className="space-y-3">
          <SectionHeader title="Location & Address" />
          <div className="card-surface flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <MapPin className="size-5" />
              </span>
              <div>
                <p className="text-sm font-medium">{hotel.address}</p>
                <p className="text-xs text-muted-foreground">
                  {hotel.district?.name ?? "Karnataka"}
                </p>
              </div>
            </div>

            {hotel.maps_url ? (
              <Button asChild variant="outline" size="sm" className="rounded-xl">
                <Link
                  href={hotel.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold"
                >
                  <ExternalLink className="size-3.5" /> Open in Google Maps
                </Link>
              </Button>
            ) : null}
          </div>

          <div className="mt-3">
            <MapEmbed point={hotel} label={hotel.name} height={240} />
          </div>
          <div className="mt-3">
            <MapActionButtons point={hotel} label={hotel.name} />
          </div>
        </section>

        {/* CONTACT & ENQUIRE */}
        <section>
          <SectionHeader title="Contact & Enquire" />
          <EnquireButtons
            contact={{
              email: hotel.email,
              phone: hotel.phone_number,
              whatsapp: hotel.whatsapp_number,
              name: hotel.name,
            }}
          />
          {hotel.website ? (
            <Button asChild variant="outline" className="mt-2.5 w-full rounded-xl">
              <Link href={hotel.website} target="_blank" rel="noreferrer">
                <Globe className="size-4" /> Visit official website
              </Link>
            </Button>
          ) : null}
        </section>

        {/* REVIEWS SECTION */}
        <section>
          <ReviewsSection
            target={{
              rating: hotel.rating,
              ratingCount: hotel.review?.length || (hotel.rating ? 1 : 0),
              distribution: null,
              published: hotel.review ?? [],
            }}
            targetId={hotel.id}
            targetType="hotel"
          />
        </section>
      </div>

      <HotelBookingSheet
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        hotel={hotel}
        initialRoomTypeId={selectedRoomId}
      />
    </div>
  );
}

function CustomerRoomCard({
  room,
  bookingEnabled,
  onBook,
}: {
  room: HotelRoomType;
  bookingEnabled: boolean;
  onBook: () => void;
}) {
  const [photoView, setPhotoView] = React.useState<"OVERVIEW" | "BATHROOM">("OVERVIEW");
  const isAvailable = room.availableRooms > 0;

  const includedServices = (room.additionalServices ?? []).filter(
    (s) => s.type === "INCLUDED"
  );
  const addOnServices = (room.additionalServices ?? []).filter(
    (s) => s.type === "EXTRA_CHARGE"
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-12">
        {/* Photo Gallery Column */}
        <div className="relative md:col-span-5 bg-muted">
          <div className="relative aspect-[4/3] w-full overflow-hidden md:h-full">
            <AppImage
              src={
                photoView === "OVERVIEW"
                  ? room.roomOverviewPhoto
                  : room.bathroomPhoto
              }
              alt={room.title}
              className="size-full object-cover transition-transform duration-300 hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <div className="flex items-center justify-between text-white text-xs">
                <span className="font-medium">
                  {photoView === "OVERVIEW" ? "Room Overview" : "Attached Bathroom"}
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPhotoView("OVERVIEW")}
                    className={`rounded-md px-2 py-0.5 text-[0.65rem] backdrop-blur-md transition-colors ${
                      photoView === "OVERVIEW"
                        ? "bg-white text-black font-semibold"
                        : "bg-black/50 text-white"
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoView("BATHROOM")}
                    className={`rounded-md px-2 py-0.5 text-[0.65rem] backdrop-blur-md transition-colors ${
                      photoView === "BATHROOM"
                        ? "bg-white text-black font-semibold"
                        : "bg-black/50 text-white"
                    }`}
                  >
                    Bathroom
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Room Info & Details Column */}
        <div className="flex flex-col justify-between p-5 md:col-span-7">
          <div className="space-y-3">
            {/* Badges & Title */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                {room.roomCategory === "DORMITORY" || room.pricingUnit === "PER_BED" ? (
                  <Badge variant="outline" className="border-emerald-500/40 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300 text-xs font-semibold">
                    <BedSingle className="mr-1 size-3" /> Dormitory Bed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    Private Room
                  </Badge>
                )}
                <Badge
                  variant={room.roomType === "AC" ? "default" : "secondary"}
                  className="text-xs font-semibold"
                >
                  <Wind className="mr-1 size-3" /> {room.roomType === "AC" ? "AC" : "Non-AC"}
                </Badge>
                {room.dormGender ? (
                  <Badge variant="secondary" className="text-xs">
                    {room.dormGender === "MIXED" ? "Mixed Dorm" : room.dormGender === "FEMALE" ? "Female Dorm" : "Male Dorm"}
                  </Badge>
                ) : null}
                {room.category ? (
                  <Badge variant="outline" className="text-xs">
                    {room.category}
                  </Badge>
                ) : null}
                <Badge
                  variant={isAvailable ? "outline" : "destructive"}
                  className="text-xs"
                >
                  {isAvailable
                    ? `${room.availableRooms} ${
                        room.roomCategory === "DORMITORY" || room.pricingUnit === "PER_BED"
                          ? "beds"
                          : "rooms"
                      } available`
                    : "Sold Out"}
                </Badge>
              </div>

              <h3 className="mt-2 text-lg font-bold text-foreground">
                {room.title}
              </h3>
            </div>

            <p className="text-xs leading-relaxed text-muted-foreground line-clamp-3">
              {room.description}
            </p>

            {/* Occupancy & Key Amenities */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-foreground/90">
              {room.roomCategory === "DORMITORY" || room.pricingUnit === "PER_BED" ? (
                <span className="flex items-center gap-1.5 font-medium text-emerald-800 dark:text-emerald-300">
                  <BedSingle className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                  {room.bedCapacity ? `${room.bedCapacity}-Bed Dorm` : "Dormitory"} {room.bedType ? `• ${room.bedType}` : ""}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5 text-primary" />
                  Up to {room.maxOccupancy} Guests
                </span>
              )}
              {room.hasHotWater ? (
                <span className="flex items-center gap-1.5">
                  <Flame className="size-3.5 text-amber-500" />
                  Hot Water {room.hotWaterCharge ? `(+₹${room.hotWaterCharge})` : "Available"}
                </span>
              ) : null}
              {room.hasTv ? (
                <span className="flex items-center gap-1.5">
                  <Tv className="size-3.5 text-primary" />
                  Television
                </span>
              ) : null}
              {room.hasWifi ? (
                <span className="flex items-center gap-1.5">
                  <Wifi className="size-3.5 text-primary" />
                  Free Wi-Fi
                </span>
              ) : null}
              {room.hasAttachedBathroom ? (
                <span className="flex items-center gap-1.5">
                  <Bath className="size-3.5 text-primary" />
                  Attached Bath
                </span>
              ) : null}
            </div>

            {/* Inclusions & Add-ons Preview */}
            {includedServices.length > 0 || addOnServices.length > 0 ? (
              <div className="space-y-1.5 rounded-xl bg-muted/40 p-2.5 text-xs">
                {includedServices.length > 0 ? (
                  <p className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                    <Check className="size-3 shrink-0" />
                    <strong>Included:</strong>{" "}
                    {includedServices.map((s) => s.name).join(", ")}
                  </p>
                ) : null}
                {addOnServices.length > 0 ? (
                  <p className="text-muted-foreground">
                    <strong>Optional add-ons:</strong>{" "}
                    {addOnServices
                      .map((s) => `${s.name} (₹${s.price ?? 0}${s.priceBasis ? ` ${s.priceBasis}` : ""})`)
                      .join(", ")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Pricing & Booking CTA footer */}
          <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
            <div>
              <div className="text-xl font-bold text-foreground">
                {formatCurrency(room.pricePerNight)}
              </div>
              <p className="text-[0.7rem] text-muted-foreground">
                {room.pricingUnit === "PER_BED" || room.roomCategory === "DORMITORY"
                  ? "per bed / night (taxes included)"
                  : "per room / night (taxes included)"}
              </p>
            </div>

            <Button
              variant="action"
              size="sm"
              disabled={!bookingEnabled || !isAvailable}
              onClick={onBook}
              className="rounded-xl px-5 shadow-sm"
            >
              {isAvailable ? "Select & Book" : "Sold Out"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function HotelBookingSheet({
  open,
  onOpenChange,
  hotel,
  initialRoomTypeId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  hotel: Hotel;
  initialRoomTypeId?: string;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const publishedRooms = React.useMemo(() => {
    return (hotel.room_types ?? []).filter((rt) => rt.isActive !== false);
  }, [hotel.room_types]);

  const [selectedRoomId, setSelectedRoomId] = React.useState<string>(() => {
    return initialRoomTypeId ?? publishedRooms[0]?.id ?? "";
  });

  React.useEffect(() => {
    if (initialRoomTypeId) {
      setSelectedRoomId(initialRoomTypeId);
    } else if (publishedRooms[0]?.id && !selectedRoomId) {
      setSelectedRoomId(publishedRooms[0].id);
    }
  }, [initialRoomTypeId, publishedRooms, selectedRoomId]);

  const activeRoom = React.useMemo(() => {
    return (
      publishedRooms.find((r) => r.id === selectedRoomId) ??
      publishedRooms[0] ??
      null
    );
  }, [publishedRooms, selectedRoomId]);

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const [checkIn, setCheckIn] = React.useState("");
  const [checkOut, setCheckOut] = React.useState("");
  const [guests, setGuests] = React.useState(2);
  const [rooms, setRooms] = React.useState(1);
  const [selectedAddOns, setSelectedAddOns] = React.useState<
    { name: string; price: number; priceBasis?: string }[]
  >([]);
  const [submitting, setSubmitting] = React.useState(false);

  // Nights calculation
  const nights = React.useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const diff =
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000;
    return Math.max(0, Math.round(diff));
  }, [checkIn, checkOut]);

  const isDorm =
    activeRoom?.roomCategory === "DORMITORY" || activeRoom?.pricingUnit === "PER_BED";
  const unitLabelSingular = isDorm ? "bed" : "room";
  const unitLabelPlural = isDorm ? "beds" : "rooms";

  // Max capacity and available rooms validation
  const maxAllowedGuests = isDorm ? rooms : (activeRoom?.maxOccupancy ?? 2) * rooms;
  const maxAvailableRooms = Math.max(1, activeRoom?.availableRooms ?? 5);

  // Auto-clamp guests if capacity reduced
  React.useEffect(() => {
    if (guests > maxAllowedGuests) {
      setGuests(maxAllowedGuests);
    }
  }, [maxAllowedGuests, guests]);

  // Auto-clamp rooms if inventory lower
  React.useEffect(() => {
    if (rooms > maxAvailableRooms) {
      setRooms(maxAvailableRooms);
    }
  }, [maxAvailableRooms, rooms]);

  // Add-ons list for current room
  const availableAddOns = React.useMemo(() => {
    return (activeRoom?.additionalServices ?? []).filter(
      (s) => s.type === "EXTRA_CHARGE" && s.price && s.price > 0
    );
  }, [activeRoom]);

  // Reset selected add-ons when switching rooms
  React.useEffect(() => {
    setSelectedAddOns([]);
  }, [selectedRoomId]);

  function toggleAddOn(name: string, price: number, priceBasis?: string) {
    setSelectedAddOns((prev) => {
      const exists = prev.some((a) => a.name === name);
      if (exists) return prev.filter((a) => a.name !== name);
      return [...prev, { name, price, priceBasis }];
    });
  }

  // Cost calculation
  const roomPricePerNight = activeRoom?.pricePerNight ?? hotel.cost_per_night;
  const roomTotal = roomPricePerNight * Math.max(nights, 0) * Math.max(rooms, 1);
  const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0);
  const grandTotal = roomTotal + addOnsTotal;

  async function submit() {
    if (!isAuthenticated) {
      onOpenChange(false);
      router.push("/login");
      return;
    }
    if (!checkIn || !checkOut) {
      toast.error("Please pick check-in and check-out dates");
      return;
    }
    if (nights < 1) {
      toast.error("Check-out date must be after check-in date");
      return;
    }
    if (guests > maxAllowedGuests) {
      toast.error(
        `Guest count (${guests}) exceeds capacity (${maxAllowedGuests}) for ${rooms} ${
          rooms > 1 ? unitLabelPlural : unitLabelSingular
        }.`
      );
      return;
    }
    if (activeRoom && rooms > activeRoom.availableRooms) {
      toast.error(
        `Only ${activeRoom.availableRooms} ${unitLabelPlural} available for this option.`
      );
      return;
    }

    setSubmitting(true);
    try {
      await createHotelBooking({
        hotelId: hotel.id,
        roomTypeId: activeRoom?.id,
        checkIn,
        checkOut,
        guests: Math.max(1, guests),
        rooms: Math.max(1, rooms),
        selectedAddOns: selectedAddOns.length > 0 ? selectedAddOns : undefined,
      });

      toast.success("Booking request sent successfully!", {
        description: "The accommodation host will confirm your reservation.",
      });
      onOpenChange(false);
      setCheckIn("");
      setCheckOut("");
      setSelectedAddOns([]);
    } catch (err) {
      toast.error("Couldn't create booking", {
        description:
          err instanceof Error ? err.message : "Please try again later.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl border-border p-6 shadow-2xl"
      >
        <SheetHeader className="text-left border-b border-border pb-4">
          <SheetTitle className="text-xl font-bold">Book {hotel.name}</SheetTitle>
          <SheetDescription>
            {isAuthenticated
              ? "Request a reservation — verified against real inventory."
              : "Sign in to reserve accommodation."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-6">
          {/* Room Type Picker */}
          {publishedRooms.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Select Option / Room
              </Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {publishedRooms.map((rt) => {
                  const isSelected = rt.id === activeRoom?.id;
                  const rtIsDorm =
                    rt.roomCategory === "DORMITORY" || rt.pricingUnit === "PER_BED";
                  return (
                    <button
                      key={rt.id}
                      type="button"
                      onClick={() => setSelectedRoomId(rt.id)}
                      className={`flex flex-col rounded-xl border p-3 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-card hover:border-muted-foreground/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs leading-tight line-clamp-1">
                          {rt.title}
                        </span>
                        <Badge
                          variant={rt.roomType === "AC" ? "default" : "secondary"}
                          className="text-[0.6rem]"
                        >
                          {rt.roomType}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="font-bold text-foreground">
                          {formatCurrency(rt.pricePerNight)}/{rtIsDorm ? "bed" : "nt"}
                        </span>
                        <span className="text-[0.65rem] text-muted-foreground">
                          {rt.availableRooms} {rtIsDorm ? "beds" : "avail"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="check-in" className="inline-flex items-center gap-1.5 text-xs font-medium">
                <CalendarDays className="size-3.5 text-primary" /> Check-in Date
              </Label>
              <Input
                id="check-in"
                type="date"
                min={todayIso}
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="check-out" className="inline-flex items-center gap-1.5 text-xs font-medium">
                <CalendarDays className="size-3.5 text-primary" /> Check-out Date
              </Label>
              <Input
                id="check-out"
                type="date"
                min={checkIn || todayIso}
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          {/* Rooms and Guests */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rooms" className="inline-flex items-center gap-1.5 text-xs font-medium">
                {isDorm ? <BedSingle className="size-3.5 text-primary" /> : <BedDouble className="size-3.5 text-primary" />}
                {isDorm ? "Beds to Book" : "Rooms"}
              </Label>
              <SelectRange
                id="rooms"
                value={rooms}
                onChange={setRooms}
                min={1}
                max={Math.min(10, maxAvailableRooms)}
              />
              <p className="text-[0.65rem] text-muted-foreground">
                Max {maxAvailableRooms} {unitLabelPlural} available
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="guests" className="inline-flex items-center gap-1.5 text-xs font-medium">
                <Users className="size-3.5 text-primary" /> Guests
              </Label>
              <SelectRange
                id="guests"
                value={guests}
                onChange={setGuests}
                min={1}
                max={maxAllowedGuests}
              />
              <p className="text-[0.65rem] text-muted-foreground">
                {isDorm
                  ? `Capacity: ${rooms} guest${rooms > 1 ? "s" : ""} (1 bed / guest)`
                  : `Capacity: ${maxAllowedGuests} guests (${activeRoom?.maxOccupancy ?? 2}/room)`}
              </p>
            </div>
          </div>

          {/* Optional Add-on Services */}
          {availableAddOns.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-border p-3.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Optional Room Add-ons
              </Label>
              <div className="space-y-2 pt-1">
                {availableAddOns.map((addon) => {
                  const isChecked = selectedAddOns.some((a) => a.name === addon.name);
                  return (
                    <label
                      key={addon.name}
                      className="flex cursor-pointer items-center justify-between rounded-lg p-1.5 hover:bg-muted/50 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() =>
                            toggleAddOn(addon.name, addon.price!, addon.priceBasis)
                          }
                        />
                        <span className="font-medium">{addon.name}</span>
                      </div>
                      <span className="font-semibold text-foreground">
                        +{formatCurrency(addon.price!)}
                        {addon.priceBasis ? ` (${addon.priceBasis})` : ""}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* Stay Cost Breakdown */}
          <BookingSummary
            title="Price Breakdown"
            rows={[
              {
                label: `${isDorm ? "Dorm Bed" : "Room"}: ${activeRoom?.title ?? hotel.name}`,
                value: `${formatCurrency(roomPricePerNight)} × ${rooms} ${
                  isDorm ? (rooms > 1 ? "beds" : "bed") : (rooms > 1 ? "rooms" : "room")
                } × ${nights} night${nights === 1 ? "" : "s"}`,
                strong: true,
              },
              ...selectedAddOns.map((a) => ({
                label: `Add-on: ${a.name}`,
                value: formatCurrency(a.price),
              })),
            ]}
            total={formatCurrency(grandTotal)}
            totalLabel="Total Payable"
          />
        </div>

        <SheetFooter className="mt-6 pt-2 sm:justify-center">
          <Button
            variant="action"
            size="lg"
            className="w-full rounded-2xl py-6 text-base font-semibold"
            disabled={submitting || isLoading}
            onClick={submit}
          >
            {submitting
              ? "Confirming reservation…"
              : isAuthenticated
              ? "Request Booking"
              : "Sign in to book"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function SelectRange({
  id,
  value,
  onChange,
  min,
  max,
}: {
  id: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  const safeMax = Math.max(min, max);
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {Array.from({ length: safeMax - min + 1 }).map((_, i) => {
        const v = min + i;
        return (
          <option key={v} value={v}>
            {v}
          </option>
        );
      })}
    </select>
  );
}