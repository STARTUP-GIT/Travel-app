"use client";

import * as React from "react";
import { CalendarDays, Compass, Hotel, RefreshCw, UtensilsCrossed } from "lucide-react";
import Link from "next/link";

import { AuthGate } from "@/components/shared/auth-gate";
import { ScreenHeader } from "@/components/shared/screen-header";
import { EmptyState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { AppImage } from "@/components/shared/app-image";
import { Button } from "@/components/ui/button";
import { useBookings } from "@/features/bookings/hooks/useBookings";
import { slugify } from "@/features/locations/utils/slug";
import type {
  BookingStatus,
  CommonGuideBooking,
  HotelBooking,
  RestaurantReservation,
  SpecificGuideBooking,
} from "@/features/bookings/types";
import type { AllBookings } from "@/features/bookings/api/bookings.api";

export default function BookingsScreen() {
  const { data, isLoading, refetch } = useBookings();

  return (
    <AuthGate title="Sign in to see your bookings" description="Your guide, hotel and restaurant bookings appear here.">
      <div className="pb-6">
        <ScreenHeader title="My Bookings" subtitle={isLoading ? "Loading…" : "Everything you've requested"} />

        <div className="app-container">
          {isLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : isEmpty(data) ? (
            <EmptyState
              icon={CalendarDays}
              title="No bookings yet"
              description="Book a guide for your next visit, or a hotel or table, and it will show up here."
            />
          ) : (
            <div className="space-y-8">
              {data?.hotelBookings.length ? (
                <Group title="Hotels" count={data.hotelBookings.length} icon={<Hotel className="size-4" />}>
                  {data.hotelBookings.map((b) => (
                    <HotelRow key={b.id} booking={b} />
                  ))}
                </Group>
              ) : null}
              {data?.restaurantReservations.length ? (
                <Group title="Restaurants" count={data.restaurantReservations.length} icon={<UtensilsCrossed className="size-4" />}>
                  {data.restaurantReservations.map((b) => (
                    <ReservationRow key={b.id} booking={b} />
                  ))}
                </Group>
              ) : null}
              {data?.specificGuideBookings.length ? (
                <Group title="Specific guides" count={data.specificGuideBookings.length} icon={<Compass className="size-4" />}>
                  {data.specificGuideBookings.map((b) => (
                    <SpecificRow key={b.id} booking={b} />
                  ))}
                </Group>
              ) : null}
              {data?.commonGuideBookings.length ? (
                <Group title="Common guides" count={data.commonGuideBookings.length} icon={<Compass className="size-4" />}>
                  {data.commonGuideBookings.map((b) => (
                    <CommonRow key={b.id} booking={b} />
                  ))}
                </Group>
              ) : null}
            </div>
          )}

          <Button variant="outline" className="mt-8 w-full rounded-xl" onClick={() => refetch()}>
            <RefreshCw className="size-4" /> Refresh bookings
          </Button>
        </div>
      </div>
    </AuthGate>
  );
}

function Group({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2 text-sm font-semibold">
        <span className="text-primary">{icon}</span>
        {title}
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{count}</span>
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function RowShell({
  image,
  title,
  subtitle,
  meta,
  status,
  href,
}: {
  image?: string | null;
  title: string;
  subtitle: string;
  meta?: string;
  status: BookingStatus;
  href: string | null;
}) {
  const img = image ? (
    <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-muted">
      <AppImage src={image} alt={title} />
    </div>
  ) : (
    <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <CalendarDays className="size-5" />
    </div>
  );

  const inner = (
    <div className="card-surface flex w-full items-center gap-3 rounded-2xl p-3">
      {img}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        {meta ? <p className="mt-0.5 line-clamp-1 text-[0.7rem] text-muted-foreground">{meta}</p> : null}
      </div>
      <StatusBadge status={status} className="shrink-0" />
    </div>
  );

  if (!href) return inner;
  return (
    <Link href={href} className="block">
      {inner}
    </Link>
  );
}

function HotelRow({ booking }: { booking: HotelBooking }) {
  return (
    <RowShell
      image={booking.hotel?.images?.[0] ?? booking.hotel?.profile_logo}
      title={booking.hotel?.name ?? "Hotel stay"}
      subtitle={`${booking.checkIn ? `Check-in ${booking.checkIn}` : ""}${booking.checkOut ? ` → ${booking.checkOut}` : ""}`}
      meta={`${booking.rooms || 1} room(s) · ${booking.guests || 1} guest(s)`}
      status={booking.status}
      href={booking.hotel ? `/explore` : null}
    />
  );
}

function ReservationRow({ booking }: { booking: RestaurantReservation }) {
  return (
    <RowShell
      image={booking.restaurent?.images?.[0] ?? booking.restaurent?.profile_logo}
      title={booking.restaurent?.name ?? "Restaurant reservation"}
      subtitle={`${booking.reservationDate ?? ""} · ${booking.guests ?? 1} guest(s)`}
      status={booking.status}
      href="/explore"
    />
  );
}

function SpecificRow({ booking }: { booking: SpecificGuideBooking }) {
  const slug = booking.place?.district ? slugify(booking.place.district.name) : null;
  return (
    <RowShell
      image={booking.specificGuide?.profile_pic}
      title={booking.specificGuide?.full_name ?? "Specific guide"}
      subtitle={`${booking.place?.name ?? "Place"}${booking.bookingDate ? ` · ${booking.bookingDate}` : ""}`}
      status={booking.status}
      href={slug ? `/${slug}/guides/${booking.specificGuideId}` : null}
    />
  );
}

function CommonRow({ booking }: { booking: CommonGuideBooking }) {
  const firstName = booking.selectedPlaces?.find((p) => p.place?.name)?.place?.name;
  return (
    <RowShell
      image={booking.commonGuide?.profile_pic}
      title={booking.commonGuide?.full_name ?? "Common guide"}
      subtitle={`${booking.selectedPlaces?.length ?? 0} place(s)${booking.bookingDate ? ` · ${booking.bookingDate}` : ""}`}
      meta={booking.selectedPlaces?.map((p) => p.place?.name).filter(Boolean).join(", ")}
      status={booking.status}
      href={firstName ? "/explore" : null}
    />
  );
}

function isEmpty(data: AllBookings | undefined): boolean {
  if (!data) return true;
  return (
    (data.hotelBookings?.length ?? 0) +
      (data.restaurantReservations?.length ?? 0) +
      (data.specificGuideBookings?.length ?? 0) +
      (data.commonGuideBookings?.length ?? 0) ===
    0
  );
}