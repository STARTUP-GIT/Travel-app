"use client";

import * as React from "react";
import { Building2, CalendarDays, Globe, MapPin, Users, BedDouble } from "lucide-react";
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
import type { Hotel } from "@/features/hotels/types";
import { createHotelBooking } from "@/features/hotels/api/hotels.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { formatCurrency } from "@/lib/utils";

export function HotelView({ hotel, districtSlug, stateSlug }: { hotel: Hotel; districtSlug: string; stateSlug?: string }) {
  const [bookingOpen, setBookingOpen] = React.useState(false);
  const districtBase = stateSlug ? `/${stateSlug}/${districtSlug}` : `/${districtSlug}`;

  return (
    <div className="pb-8">
      <ScreenHeader title="Hotel" subtitle={hotel.name} backHref={districtBase} />

      {/* Hero */}
      <div className="relative -mx-4 overflow-hidden bg-blue-900 sm:rounded-b-[2rem]">
        <div className="relative aspect-[16/10] max-h-[22rem] w-full">
          <AppImage src={hotel.images?.[0] ?? hotel.profile_logo} alt={hotel.name} className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/10" />
          <div className="absolute bottom-0 inset-x-0 flex items-end justify-between gap-3 px-5 pb-4">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
                <Building2 className="size-3" /> Hotel
              </span>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white drop-shadow-sm">
                {hotel.name}
              </h1>
              <Rating value={hotel.rating} count={hotel.review?.length} className="mt-1 text-white [&_svg]:fill-amber-300 [&_svg]:text-amber-300" />
            </div>
            <span className="inline-flex shrink-0 flex-col items-end rounded-xl bg-white/15 px-3 py-2 text-white backdrop-blur-md">
              <span className="text-sm font-bold">{formatCurrency(hotel.cost_per_night)}</span>
              <span className="text-[0.65rem] uppercase tracking-wide text-white/80">per night</span>
            </span>
          </div>
        </div>
      </div>

      {/* Primary action */}
      <div className="app-container -mt-5 relative z-10 sm:mt-4 sm:px-0 sm:pt-2">
        <Button
          variant="action"
          size="lg"
          className="w-full rounded-2xl shadow-float"
          disabled={!hotel.booking_enabled}
          onClick={() => {
            if (!hotel.booking_enabled) toast.error("Booking is not enabled for this hotel yet.");
            else setBookingOpen(true);
          }}
        >
          <CalendarDays className="size-5" /> Book a stay
        </Button>
        {!hotel.booking_enabled ? (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Bookings for this hotel are currently disabled.
          </p>
        ) : null}
      </div>

      <div className="app-container mt-6 space-y-8">
        <section>
          <SectionHeader title="About" subtitle={hotel.district?.name ?? "Karnataka"} />
          <p className="text-[0.95rem] leading-relaxed text-foreground/90">
            {hotel.description || "A comfortable stay in Karnataka. Check the gallery and reviews below."}
          </p>
        </section>

        <section>
          <SectionHeader title="Location" />
          <div className="card-surface flex items-center gap-3 rounded-2xl p-4">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPin className="size-5" />
            </span>
            <p className="text-sm">{hotel.address}</p>
          </div>
          <div className="mt-3">
            <MapEmbed point={hotel} label={hotel.name} height={240} />
          </div>
          <div className="mt-3">
            <MapActionButtons point={hotel} label={hotel.name} />
          </div>
        </section>

        <section>
          <SectionHeader title="Contact & enquire" />
          <EnquireButtons
            contact={{
              email: hotel.email,
              phone: hotel.phone_number,
              whatsapp: hotel.whatsapp_number,
              name: hotel.name,
            }}
          />
          {hotel.website ? (
            <Button asChild variant="outline" className="mt-2 w-full rounded-xl">
              <Link href={hotel.website} target="_blank" rel="noreferrer">
                <Globe className="size-4" /> Visit website
              </Link>
            </Button>
          ) : null}
        </section>

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
      />
    </div>
  );
}

export function HotelBookingSheet({
  open,
  onOpenChange,
  hotel,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  hotel: Hotel;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const [checkIn, setCheckIn] = React.useState("");
  const [checkOut, setCheckOut] = React.useState("");
  const [guests, setGuests] = React.useState(2);
  const [rooms, setRooms] = React.useState(1);
  const [submitting, setSubmitting] = React.useState(false);

  const nights = React.useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const diff =
      (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000;
    return Math.max(0, Math.round(diff));
  }, [checkIn, checkOut]);

  const total = hotel.cost_per_night * Math.max(nights, 0) * Math.max(rooms, 1);

  async function submit() {
    if (!isAuthenticated) {
      onOpenChange(false);
      router.push("/login");
      return;
    }
    if (!checkIn || !checkOut) {
      toast.error("Pick check-in and check-out dates");
      return;
    }
    if (nights < 1) {
      toast.error("Check-out must be after check-in");
      return;
    }
    setSubmitting(true);
    try {
      await createHotelBooking({
        hotelId: hotel.id,
        checkIn,
        checkOut,
        guests: Math.max(1, guests),
        rooms: Math.max(1, rooms),
      });
      toast.success("Booking request sent", {
        description: "The hotel will confirm your stay.",
      });
      onOpenChange(false);
      setCheckIn("");
      setCheckOut("");
    } catch (err) {
      toast.error("Couldn't create booking", {
        description: err instanceof Error ? err.message : "Please try again later.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal>
      <SheetContent side="bottom" className="mx-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border-border">
        <SheetHeader className="text-left">
          <SheetTitle>Book {hotel.name}</SheetTitle>
          <SheetDescription>
            {isAuthenticated ? "Request a stay — the hotel confirms before it's final." : "You'll be asked to sign in to book."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="check-in" className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" /> Check-in
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
              <Label htmlFor="check-out" className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-3.5" /> Check-out
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="guests" className="inline-flex items-center gap-1.5">
                <Users className="size-3.5" /> Guests
              </Label>
              <SelectRange id="guests" value={guests} onChange={setGuests} min={1} max={10} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rooms" className="inline-flex items-center gap-1.5">
                <BedDouble className="size-3.5" /> Rooms
              </Label>
              <SelectRange id="rooms" value={rooms} onChange={setRooms} min={1} max={5} />
            </div>
          </div>

          <BookingSummary
            title="Stay summary"
            rows={[
              { label: "Room", value: formatCurrency(hotel.cost_per_night), strong: true },
              { label: "Nights", value: nights > 0 ? `${nights}` : "—" },
              { label: "Rooms", value: `${Math.max(rooms, 1)}` },
            ]}
            total={formatCurrency(total)}
            totalLabel="Estimated total"
          />
        </div>

        <SheetFooter className="pt-2 sm:justify-center">
          <Button
            variant="action"
            size="lg"
            className="w-full rounded-2xl"
            disabled={submitting || isLoading}
            onClick={submit}
          >
            {submitting ? "Sending request…" : isAuthenticated ? "Request booking" : "Sign in to book"}
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
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {Array.from({ length: max - min + 1 }).map((_, i) => {
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