"use client";

import * as React from "react";
import { CalendarCheck, Globe, MapPin, UtensilsCrossed, Users } from "lucide-react";
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
import type { FoodCategory, Restaurent } from "@/features/restaurants/types";
import { createReservation } from "@/features/reservations/api/reservations.api";
import { useAuth } from "@/features/auth/hooks/useAuth";

const FOOD_LABEL: Record<FoodCategory, string> = {
  PUREVEG: "Pure Veg",
  NONVEG: "Non Veg",
  VEG_AND_NONVEG: "Veg & Non-Veg",
};

export function RestaurantView({
  restaurant,
  districtSlug,
}: {
  restaurant: Restaurent;
  districtSlug: string;
}) {
  const [resOpen, setResOpen] = React.useState(false);

  return (
    <div className="pb-8">
      <ScreenHeader title="Restaurant" subtitle={restaurant.name} backHref={`/${districtSlug}`} />

      {/* Hero */}
      <div className="relative -mx-4 overflow-hidden bg-blue-900 sm:rounded-b-[2rem]">
        <div className="relative aspect-[16/10] max-h-[22rem] w-full">
          <AppImage src={restaurant.images?.[0] ?? restaurant.profile_logo} alt={restaurant.name} className="size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/10" />
          <div className="absolute bottom-0 inset-x-0 flex items-end justify-between gap-3 px-5 pb-4">
            <div>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-white backdrop-blur-md">
                <UtensilsCrossed className="size-3" /> Restaurant
              </span>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white drop-shadow-sm">
                {restaurant.name}
              </h1>
              <div className="mt-1 flex items-center gap-2">
                <Rating value={restaurant.rating} count={restaurant.review?.length} className="text-white [&_svg]:fill-amber-300 [&_svg]:text-amber-300" />
                <Badge className="bg-white/20 text-white backdrop-blur-md">
                  {FOOD_LABEL[restaurant.food_category] ?? "Multi-cuisine"}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Primary action */}
      <div className="app-container -mt-5 relative z-10 sm:mt-4 sm:px-0 sm:pt-2">
        <Button
          variant="action"
          size="lg"
          className="w-full rounded-2xl shadow-float"
          disabled={!restaurant.booking_enabled}
          onClick={() => {
            if (!restaurant.booking_enabled) toast.error("Reservations are not enabled for this restaurant yet.");
            else setResOpen(true);
          }}
        >
          <CalendarCheck className="size-5" /> Reserve a table
        </Button>
        {!restaurant.booking_enabled ? (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Reservations for this restaurant are currently disabled.
          </p>
        ) : null}
      </div>

      <div className="app-container mt-6 space-y-8">
        <section>
          <SectionHeader title="About" subtitle={restaurant.district?.name ?? "Karnataka"} />
          <p className="text-[0.95rem] leading-relaxed text-foreground/90">
            {restaurant.description || "A great place to eat in Karnataka. Check the menu and reviews below."}
          </p>
        </section>

        {restaurant.menu?.length > 0 ? (
          <section>
            <SectionHeader title="Menu highlights" subtitle="Popular dishes people ask about" />
            <div className="flex flex-wrap gap-1.5">
              {restaurant.menu.map((item) => (
                <Badge key={item} variant="secondary" className="gap-1 capitalize">
                  <UtensilsCrossed className="size-3" />
                  {item}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <SectionHeader title="Location" />
          <div className="card-surface flex items-center gap-3 rounded-2xl p-4">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPin className="size-5" />
            </span>
            <p className="text-sm">{restaurant.address}</p>
          </div>
          <div className="mt-3">
            <MapEmbed point={restaurant} label={restaurant.name} height={240} />
          </div>
          <div className="mt-3">
            <MapActionButtons point={restaurant} label={restaurant.name} />
          </div>
        </section>

        <section>
          <SectionHeader title="Contact" />
          <EnquireButtons
            contact={{
              email: restaurant.email,
              phone: restaurant.phone_number,
              whatsapp: restaurant.whatsapp_number,
              name: restaurant.name,
            }}
          />
          {restaurant.website ? (
            <Button asChild variant="outline" className="mt-2 w-full rounded-xl">
              <Link href={restaurant.website} target="_blank" rel="noreferrer">
                <Globe className="size-4" /> Visit website
              </Link>
            </Button>
          ) : null}
        </section>

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

      <RestaurantReservationSheet
        open={resOpen}
        onOpenChange={setResOpen}
        restaurant={restaurant}
      />
    </div>
  );
}

export function RestaurantReservationSheet({
  open,
  onOpenChange,
  restaurant,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  restaurant: Restaurent;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const todayIso = new Date().toISOString().slice(0, 10);
  const [date, setDate] = React.useState("");
  const [guests, setGuests] = React.useState(2);
  const [submitting, setSubmitting] = React.useState(false);

  async function submit() {
    if (!isAuthenticated) {
      onOpenChange(false);
      router.push("/login");
      return;
    }
    if (!date) {
      toast.error("Pick a date for your reservation");
      return;
    }
    setSubmitting(true);
    try {
      await createReservation({
        restaurantId: restaurant.id,
        reservationDate: date,
        guests: Math.max(1, guests),
      });
      toast.success("Reservation request sent", {
        description: "The restaurant will confirm your table.",
      });
      onOpenChange(false);
      setDate("");
    } catch (err) {
      toast.error("Couldn't create reservation", {
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
          <SheetTitle>Reserve at {restaurant.name}</SheetTitle>
          <SheetDescription>
            {isAuthenticated ? "The restaurant confirms the table before it's final." : "You'll be asked to sign in to reserve."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-6">
          <div className="space-y-1.5">
            <Label htmlFor="res-date" className="inline-flex items-center gap-1.5">
              <CalendarCheck className="size-3.5" /> Date
            </Label>
            <Input
              id="res-date"
              type="date"
              min={todayIso}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="inline-flex items-center gap-1.5">
              <Users className="size-3.5" /> Guests
            </Label>
            <select
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full rounded-xl border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                <option key={n} value={n}>
                  {n} guest{n > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>

          <BookingSummary
            title="Reservation summary"
            rows={[
              { label: "Restaurant", value: restaurant.name },
              { label: "Date", value: date || "—" },
              { label: "Guests", value: `${guests}` },
            ]}
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
            {submitting ? "Sending request…" : isAuthenticated ? "Request reservation" : "Sign in to reserve"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}