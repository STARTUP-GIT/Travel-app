"use client";

import * as React from "react";
import {
  CalendarCheck,
  Clock,
  ExternalLink,
  GitBranch,
  Globe,
  ImageIcon,
  MapPin,
  Sparkles,
  UtensilsCrossed,
  Users,
  CheckCircle2,
  XCircle,
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { FoodCategory, Restaurent, RestaurantDish } from "@/features/restaurants/types";
import { createReservation } from "@/features/reservations/api/reservations.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { cn } from "@/lib/utils";

const FOOD_LABEL: Record<FoodCategory, string> = {
  PUREVEG: "Pure Veg",
  NONVEG: "Non Veg",
  VEG_AND_NONVEG: "Veg & Non-Veg",
};

const FOOD_TONE: Record<FoodCategory, "success" | "warning" | "info"> = {
  PUREVEG: "success",
  NONVEG: "warning",
  VEG_AND_NONVEG: "info",
};

function formatTime12(time?: string | null): string | null {
  if (!time) return null;
  const match = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return time;
  const h = parseInt(match[1], 10);
  const m = match[2];
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${ampm}`;
}

function getOpenStatus(openTime?: string | null, closeTime?: string | null): { isOpen: boolean; label: string } | null {
  if (!openTime || !closeTime) return null;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = openTime.split(":").map(Number);
  const [ch, cm] = closeTime.split(":").map(Number);
  if (isNaN(oh) || isNaN(om) || isNaN(ch) || isNaN(cm)) return null;
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;
  let isOpen = false;
  if (openMin <= closeMin) {
    isOpen = currentMinutes >= openMin && currentMinutes < closeMin;
  } else {
    // Overnight hours (e.g. 18:00 to 02:00)
    isOpen = currentMinutes >= openMin || currentMinutes < closeMin;
  }
  return {
    isOpen,
    label: isOpen ? "Open now" : "Closed",
  };
}

function generateTimeSlots(openingTime?: string | null, closingTime?: string | null): string[] {
  if (!openingTime || !closingTime) {
    return [
      "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
      "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"
    ];
  }
  const [oh, om] = openingTime.split(":").map(Number);
  const [ch, cm] = closingTime.split(":").map(Number);
  if (isNaN(oh) || isNaN(om) || isNaN(ch) || isNaN(cm)) {
    return ["12:00", "13:00", "19:00", "20:00", "21:00"];
  }

  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;
  const slots: string[] = [];

  if (openMin <= closeMin) {
    for (let m = openMin; m <= closeMin - 30; m += 30) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
    }
  } else {
    // Overnight: openMin to 1440, then 0 to closeMin
    for (let m = openMin; m < 1440; m += 30) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
    }
    for (let m = 0; m <= closeMin - 30; m += 30) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`);
    }
  }
  return slots.length > 0 ? slots : [openingTime];
}

export function RestaurantView({
  restaurant,
  districtSlug,
  stateSlug,
}: {
  restaurant: Restaurent;
  districtSlug: string;
  stateSlug?: string;
}) {
  const [resOpen, setResOpen] = React.useState(false);
  const [selectedBranchIndex, setSelectedBranchIndex] = React.useState<number>(-1);
  const districtBase = stateSlug ? `/${stateSlug}/${districtSlug}` : "/explore";

  const branches = React.useMemo(() => {
    if (!restaurant.has_branches || !restaurant.branches) return [];
    return restaurant.branches;
  }, [restaurant]);

  const activeLocation = React.useMemo(() => {
    if (selectedBranchIndex >= 0 && branches[selectedBranchIndex]) {
      const b = branches[selectedBranchIndex];
      return {
        id: b.id,
        name: restaurant.name,
        address: b.address,
        district: b.district ?? restaurant.district,
        latitude: b.latitude,
        longitude: b.longitude,
        maps_url: b.maps_url ?? restaurant.maps_url,
        phone_number: b.phone_number ?? restaurant.phone_number,
        whatsapp_number: b.whatsapp_number ?? restaurant.whatsapp_number,
        email: b.email ?? restaurant.email,
        website: b.website ?? restaurant.website,
        opening_time: b.opening_time ?? restaurant.opening_time,
        closing_time: b.closing_time ?? restaurant.closing_time,
        booking_enabled: b.booking_enabled,
        isBranch: true,
        branchIndex: selectedBranchIndex,
      };
    }
    return {
      id: restaurant.id,
      name: restaurant.name,
      address: restaurant.address,
      district: restaurant.district,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      maps_url: restaurant.maps_url,
      phone_number: restaurant.phone_number,
      whatsapp_number: restaurant.whatsapp_number,
      email: restaurant.email,
      website: restaurant.website,
      opening_time: restaurant.opening_time,
      closing_time: restaurant.closing_time,
      booking_enabled: restaurant.booking_enabled,
      isBranch: false,
      branchIndex: -1,
    };
  }, [restaurant, branches, selectedBranchIndex]);

  const openStatus = getOpenStatus(activeLocation.opening_time, activeLocation.closing_time);
  const formattedHours =
    activeLocation.opening_time && activeLocation.closing_time
      ? `${formatTime12(activeLocation.opening_time)} - ${formatTime12(activeLocation.closing_time)}`
      : null;

  return (
    <div className="pb-12">
      <ScreenHeader title="Restaurant" subtitle={restaurant.name} backHref={districtBase} />

      {/* Hero */}
      <div className="relative -mx-4 overflow-hidden bg-slate-900 sm:rounded-b-[2.5rem]">
        <div className="relative aspect-[16/10] max-h-[26rem] w-full">
          <AppImage
            src={restaurant.images?.[0] ?? restaurant.profile_logo}
            alt={restaurant.name}
            className="size-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/20" />
          <div className="absolute bottom-0 inset-x-0 flex items-end justify-between gap-3 px-5 pb-5 sm:px-8">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
                  <UtensilsCrossed className="size-3" /> Restaurant
                </span>
                {activeLocation.isBranch ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/80 px-2.5 py-0.5 text-[0.68rem] font-semibold text-white backdrop-blur-md">
                    <GitBranch className="size-3" /> Branch #{selectedBranchIndex + 1}
                  </span>
                ) : null}
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-md sm:text-3xl">
                {restaurant.name}
              </h1>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <Rating
                  value={restaurant.rating}
                  count={restaurant.review?.length}
                  className="text-white [&_svg]:fill-amber-300 [&_svg]:text-amber-300"
                />
                <Badge
                  variant={FOOD_TONE[restaurant.food_category] ?? "info"}
                  className="bg-white/25 text-white backdrop-blur-md"
                >
                  {FOOD_LABEL[restaurant.food_category] ?? "Multi-cuisine"}
                </Badge>
                {openStatus ? (
                  <Badge
                    variant={openStatus.isOpen ? "success" : "secondary"}
                    className={cn(
                      "gap-1 backdrop-blur-md",
                      openStatus.isOpen ? "bg-emerald-600/90 text-white" : "bg-black/50 text-slate-300"
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        openStatus.isOpen ? "animate-pulse bg-white" : "bg-slate-400"
                      )}
                    />
                    {openStatus.label}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="app-container -mt-5 relative z-10 sm:mt-4 sm:px-0 sm:pt-2">
        <Button
          variant="action"
          size="lg"
          className="w-full rounded-2xl shadow-float text-base font-semibold py-6"
          disabled={!activeLocation.booking_enabled}
          onClick={() => {
            if (!activeLocation.booking_enabled) {
              toast.error(
                activeLocation.isBranch
                  ? "Table reservations are not enabled for this branch."
                  : "Table reservations are not enabled for this restaurant."
              );
            } else {
              setResOpen(true);
            }
          }}
        >
          <CalendarCheck className="size-5" /> Book a Table
        </Button>
        {!activeLocation.booking_enabled ? (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Online table booking is not enabled for {activeLocation.isBranch ? "this branch" : "this restaurant"}.
          </p>
        ) : null}
      </div>

      <div className="app-container mt-8 space-y-8">
        {/* Branch Selector */}
        {branches.length > 0 ? (
          <section className="rounded-2xl border border-border/80 bg-card/60 p-4 shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <GitBranch className="size-4 text-primary" />
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  Select Location ({branches.length + 1} Available)
                </h2>
              </div>
              <Badge variant="outline" className="text-xs">
                Same parent menu & standards
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              This restaurant has multiple branches. Choose a location to check address, hours, and table availability.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedBranchIndex(-1)}
                className={cn(
                  "flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all",
                  selectedBranchIndex === -1
                    ? "border-primary bg-primary/10 shadow-sm"
                    : "border-border/70 bg-card hover:bg-muted/50"
                )}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-semibold text-sm text-foreground">Main Location</span>
                  {selectedBranchIndex === -1 ? (
                    <Badge variant="info" className="text-[0.65rem] py-0">Active</Badge>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1">{restaurant.address}</p>
                <span className="text-[0.7rem] text-primary/80">
                  {restaurant.district?.name ?? "Karnataka"} · {restaurant.booking_enabled ? "Booking open" : "Walk-in only"}
                </span>
              </button>

              {branches.map((b, idx) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBranchIndex(idx)}
                  className={cn(
                    "flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all",
                    selectedBranchIndex === idx
                      ? "border-primary bg-primary/10 shadow-sm"
                      : "border-border/70 bg-card hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-sm text-foreground">Branch #{idx + 1}</span>
                    {selectedBranchIndex === idx ? (
                      <Badge variant="info" className="text-[0.65rem] py-0">Active</Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1">{b.address}</p>
                  <span className="text-[0.7rem] text-primary/80">
                    {b.district?.name ?? restaurant.district?.name ?? "Karnataka"} ·{" "}
                    {b.booking_enabled ? "Booking open" : "Walk-in only"}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {/* Operating Hours Card */}
        {formattedHours ? (
          <section className="rounded-2xl border border-border/80 bg-card/60 p-4 shadow-sm backdrop-blur-md">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                <h2 className="text-sm font-semibold tracking-tight text-foreground">Operating Hours</h2>
              </div>
              {openStatus ? (
                <Badge
                  variant={openStatus.isOpen ? "success" : "secondary"}
                  className="text-xs"
                >
                  {openStatus.label}
                </Badge>
              ) : null}
            </div>
            <div className="mt-2.5 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Everyday dining hours</span>
              <span className="text-sm font-semibold text-foreground">{formattedHours}</span>
            </div>
          </section>
        ) : null}

        {/* About */}
        <section>
          <SectionHeader title="About" subtitle={activeLocation.district?.name ?? "Karnataka"} />
          <p className="text-[0.95rem] leading-relaxed text-foreground/90">
            {restaurant.description || "A wonderful dining experience in Karnataka. Explore dishes and book a table below."}
          </p>
        </section>

        {/* Menu Highlights / Structured Dishes */}
        {(restaurant.dishes && restaurant.dishes.length > 0) || (restaurant.menu && restaurant.menu.length > 0) ? (
          <section className="space-y-4">
            <SectionHeader
              title="Menu Highlights"
              subtitle="Popular dishes and chef specials prepared with authentic flavors"
            />

            {restaurant.dishes && restaurant.dishes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {restaurant.dishes.map((dish) => (
                  <div
                    key={dish.id}
                    className="flex flex-col sm:flex-row gap-3 p-3.5 rounded-2xl border border-border/70 bg-card shadow-sm hover:border-primary/40 transition-colors"
                  >
                    {dish.image ? (
                      <div className="relative aspect-video sm:aspect-square w-full sm:w-24 shrink-0 overflow-hidden rounded-xl bg-muted">
                        <AppImage src={dish.image} alt={dish.name} className="size-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex aspect-video sm:aspect-square w-full sm:w-24 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
                        <UtensilsCrossed className="size-6 opacity-40" />
                      </div>
                    )}

                    <div className="flex flex-1 flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-start justify-between gap-1.5">
                          <h3 className="font-semibold text-sm line-clamp-1 text-foreground">{dish.name}</h3>
                          {dish.foodCategory === "PUREVEG" ? (
                            <span
                              title="Vegetarian"
                              className="size-4 shrink-0 rounded-sm border border-emerald-600 flex items-center justify-center p-0.5"
                            >
                              <span className="size-2 rounded-full bg-emerald-600" />
                            </span>
                          ) : (
                            <span
                              title="Non-Vegetarian"
                              className="size-4 shrink-0 rounded-sm border border-rose-600 flex items-center justify-center p-0.5"
                            >
                              <span className="size-2 rounded-full bg-rose-600" />
                            </span>
                          )}
                        </div>

                        {dish.description ? (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {dish.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="mt-2.5 flex items-center justify-between pt-1 border-t border-border/40">
                        <span className="font-semibold text-sm text-foreground">
                          {dish.price != null ? `₹${dish.price}` : "Market price"}
                        </span>
                        {!dish.isAvailable ? (
                          <span className="text-[0.68rem] text-rose-500 font-medium">Currently unavailable</span>
                        ) : (
                          <span className="text-[0.68rem] text-emerald-600 font-medium">Available</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : restaurant.menu && restaurant.menu.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {restaurant.menu.map((item) => (
                  <Badge key={item} variant="secondary" className="gap-1 capitalize py-1 px-3">
                    <UtensilsCrossed className="size-3" />
                    {item}
                  </Badge>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        {/* Restaurant Photo Gallery */}
        {restaurant.images && restaurant.images.length > 0 ? (
          <section className="space-y-3">
            <SectionHeader
              title="Restaurant Gallery"
              subtitle={`Ambiance and dining photos (${restaurant.images.length})`}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {restaurant.images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border/60 bg-muted/40 group cursor-pointer"
                  onClick={() => window.open(img, "_blank")}
                >
                  <AppImage
                    src={img}
                    alt={`${restaurant.name} gallery ${idx + 1}`}
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ExternalLink className="size-5 text-white drop-shadow" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {/* Location & Map */}
        <section>
          <SectionHeader
            title="Location"
            subtitle={activeLocation.isBranch ? `Branch #${selectedBranchIndex + 1}` : "Main Location"}
          />
          <div className="card-surface flex items-start gap-3 rounded-2xl p-4">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
              <MapPin className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{activeLocation.address}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeLocation.district?.name ?? "Karnataka"}, India
              </p>
              {activeLocation.maps_url ? (
                <a
                  href={activeLocation.maps_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline mt-1.5"
                >
                  <ExternalLink className="size-3" /> Open in Google Maps
                </a>
              ) : null}
            </div>
          </div>
          <div className="mt-3">
            <MapEmbed
              point={{
                latitude: activeLocation.latitude,
                longitude: activeLocation.longitude,
              }}
              label={activeLocation.name}
              height={240}
            />
          </div>
          <div className="mt-3">
            <MapActionButtons
              point={{
                latitude: activeLocation.latitude,
                longitude: activeLocation.longitude,
              }}
              label={activeLocation.name}
            />
          </div>
        </section>

        {/* Contact */}
        <section>
          <SectionHeader title="Contact" />
          <EnquireButtons
            contact={{
              email: activeLocation.email,
              phone: activeLocation.phone_number,
              whatsapp: activeLocation.whatsapp_number,
              name: activeLocation.name,
            }}
          />
          {activeLocation.website ? (
            <Button asChild variant="outline" className="mt-2 w-full rounded-xl">
              <Link href={activeLocation.website} target="_blank" rel="noreferrer">
                <Globe className="size-4" /> Visit website
              </Link>
            </Button>
          ) : null}
        </section>

        {/* Genuine Reviews Section */}
        <section>
          <ReviewsSection
            target={{
              rating: restaurant.rating,
              ratingCount: restaurant.review?.length || (restaurant.rating ? 1 : 0),
              distribution: null,
              published: restaurant.review ?? [],
            }}
            targetId={restaurant.id}
            targetType="restaurant"
          />
        </section>
      </div>

      {/* Online Table Reservation Sheet */}
      <RestaurantReservationSheet
        open={resOpen}
        onOpenChange={setResOpen}
        restaurant={restaurant}
        activeLocation={activeLocation}
      />
    </div>
  );
}

export function RestaurantReservationSheet({
  open,
  onOpenChange,
  restaurant,
  activeLocation,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  restaurant: Restaurent;
  activeLocation: {
    id: string;
    name: string;
    address: string;
    opening_time?: string | null;
    closing_time?: string | null;
    booking_enabled: boolean;
    isBranch: boolean;
    branchIndex: number;
  };
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const todayIso = React.useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = React.useState(todayIso);
  const timeSlots = React.useMemo(
    () => generateTimeSlots(activeLocation.opening_time, activeLocation.closing_time),
    [activeLocation.opening_time, activeLocation.closing_time]
  );
  const [time, setTime] = React.useState(timeSlots[0] || "19:00");
  const [guests, setGuests] = React.useState(2);
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (timeSlots.length > 0 && !timeSlots.includes(time)) {
      setTime(timeSlots[0]);
    }
  }, [timeSlots, time]);

  async function submit() {
    if (!isAuthenticated) {
      onOpenChange(false);
      router.push("/login");
      return;
    }
    if (!activeLocation.booking_enabled) {
      toast.error("Online table reservations are currently disabled for this location.");
      return;
    }
    if (!date) {
      toast.error("Please pick a reservation date");
      return;
    }
    if (!time) {
      toast.error("Please select a reservation time");
      return;
    }
    if (guests < 1 || guests > 50) {
      toast.error("Party size must be between 1 and 50 guests");
      return;
    }

    setSubmitting(true);
    try {
      const res = await createReservation({
        restaurantId: activeLocation.id,
        reservationDate: date,
        reservationTime: time,
        guests: Math.max(1, guests),
        notes: notes.trim() || undefined,
      });

      toast.success("Table reservation submitted!", {
        description: `Booking reference for ${res?.guests ?? guests} guest(s) on ${date} at ${formatTime12(time) || time}. The restaurant has received your booking.`,
        action: res?.id
          ? {
              label: "View Booking",
              onClick: () => router.push(`/bookings/${res.id}`),
            }
          : undefined,
      });
      onOpenChange(false);
      setNotes("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Please try again later.";
      toast.error("Could not complete reservation", {
        description: msg,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const formattedHours =
    activeLocation.opening_time && activeLocation.closing_time
      ? `${formatTime12(activeLocation.opening_time)} - ${formatTime12(activeLocation.closing_time)}`
      : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal>
      <SheetContent
        side="bottom"
        className="mx-auto max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-border p-6 shadow-2xl"
      >
        <SheetHeader className="text-left space-y-1">
          <SheetTitle className="text-xl font-bold flex items-center gap-2">
            <CalendarCheck className="size-5 text-primary" /> Book a Table at {activeLocation.name}
          </SheetTitle>
          <SheetDescription className="text-xs">
            {activeLocation.isBranch ? `Branch: ${activeLocation.address}` : `Address: ${activeLocation.address}`}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          {formattedHours ? (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-primary/10 text-primary text-xs">
              <Clock className="size-4 shrink-0" />
              <span>Dining hours: <strong>{formattedHours}</strong></span>
            </div>
          ) : null}

          {/* Date */}
          <div className="space-y-1.5">
            <Label htmlFor="res-date" className="inline-flex items-center gap-1.5 text-sm font-medium">
              <CalendarCheck className="size-3.5 text-primary" /> Reservation Date
            </Label>
            <Input
              id="res-date"
              type="date"
              min={todayIso}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl bg-card border-border"
            />
          </div>

          {/* Time */}
          <div className="space-y-1.5">
            <Label htmlFor="res-time" className="inline-flex items-center gap-1.5 text-sm font-medium">
              <Clock className="size-3.5 text-primary" /> Reservation Time
            </Label>
            <select
              id="res-time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {timeSlots.map((slot) => (
                <option key={slot} value={slot}>
                  {formatTime12(slot)} ({slot})
                </option>
              ))}
            </select>
            {formattedHours ? (
              <p className="text-[0.7rem] text-muted-foreground">
                Time must be within operating hours ({formattedHours})
              </p>
            ) : null}
          </div>

          {/* Guests */}
          <div className="space-y-1.5">
            <Label htmlFor="res-guests" className="inline-flex items-center gap-1.5 text-sm font-medium">
              <Users className="size-3.5 text-primary" /> Number of People (Party Size)
            </Label>
            <select
              id="res-guests"
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 20].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "Person" : "People"}
                </option>
              ))}
            </select>
          </div>

          {/* Special notes */}
          <div className="space-y-1.5">
            <Label htmlFor="res-notes" className="text-sm font-medium">
              Special Requests or Dietary Notes (Optional)
            </Label>
            <Input
              id="res-notes"
              type="text"
              placeholder="e.g., Outdoor seating, high chair needed, anniversary dinner"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-xl bg-card border-border text-sm"
              maxLength={200}
            />
          </div>

          {/* Booking Summary */}
          <BookingSummary
            title="Reservation Summary"
            rows={[
              { label: "Restaurant", value: activeLocation.name },
              {
                label: "Location",
                value: activeLocation.isBranch ? `Branch #${activeLocation.branchIndex + 1}` : "Main Location",
              },
              { label: "Date", value: date || "—" },
              { label: "Time", value: formatTime12(time) || time },
              { label: "Party Size", value: `${guests} ${guests === 1 ? "person" : "people"}` },
            ]}
          />
        </div>

        <SheetFooter className="mt-6 pt-2 sm:justify-center">
          <Button
            variant="action"
            size="lg"
            className="w-full rounded-2xl text-base font-semibold py-6 shadow-md"
            disabled={submitting || isLoading}
            onClick={submit}
          >
            {submitting ? "Booking Table…" : isAuthenticated ? "Confirm Table Reservation" : "Sign in to Reserve"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}