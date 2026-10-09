"use client";

import * as React from "react";
import { CalendarDays, Compass, Hotel, Printer, RefreshCw, UtensilsCrossed } from "lucide-react";
import Link from "next/link";

import { AuthGate } from "@/components/shared/auth-gate";
import { ScreenHeader } from "@/components/shared/screen-header";
import { EmptyState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { AppImage } from "@/components/shared/app-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MapEmbed } from "@/features/maps/ui/map-embed";
import { PrintableBookingModal } from "@/components/shared/printable-booking";
import { useBookings } from "@/features/bookings/hooks/useBookings";
import { slugify } from "@/features/locations/utils/slug";
import type {
  BookingStatus,
  CommonGuideBooking,
  HotelBooking,
  RestaurantReservation,
  SpecificGuideBooking,
} from "@/features/bookings/types";
import { getSpecificGuideLocation, type AllBookings } from "@/features/bookings/api/bookings.api";

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
                <Group title="Tour guides" count={data.commonGuideBookings.length} icon={<Compass className="size-4" />}>
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
  const district = booking.place?.district;
  const districtSlug = district ? slugify(district.name) : null;
  const stateSlug = district?.state?.name ? slugify(district.state.name) : null;
  const href =
    districtSlug && stateSlug
      ? `/${stateSlug}/${districtSlug}/guides/${booking.specificGuideId}`
      : null;

  const [openTrack, setOpenTrack] = React.useState(false);
  const [openPrint, setOpenPrint] = React.useState(false);
  const [locData, setLocData] = React.useState<{
    loading: boolean;
    data: {
      isSharingLocation: boolean;
      sharedLatitude: number | null;
      sharedLongitude: number | null;
      locationUpdatedAt: string | null;
    } | null;
    error: string | null;
  }>({ loading: false, data: null, error: null });

  const fetchLocation = async () => {
    setOpenTrack(true);
    setLocData({ loading: true, data: null, error: null });
    try {
      const res = await getSpecificGuideLocation(booking.id);
      setLocData({ loading: false, data: res, error: null });
    } catch {
      setLocData({ loading: false, data: null, error: "Guide location is not available." });
    }
  };

  return (
    <div className="space-y-2">
      <RowShell
        image={booking.specificGuide?.profile_pic}
        title={booking.specificGuide?.full_name ?? "Specific guide"}
        subtitle={`${booking.place?.name ?? "Place"}${booking.bookingDate ? ` · ${booking.bookingDate}` : ""}`}
        status={booking.status}
        href={href}
      />
      <div className="flex justify-end gap-2 px-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 rounded-xl text-xs gap-1.5"
          onClick={() => setOpenPrint(true)}
        >
          <Printer className="size-3.5 text-primary" /> Print Confirmation
        </Button>
        {booking.status === "CONFIRMED" ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-xl text-xs gap-1.5"
            onClick={fetchLocation}
          >
            <Compass className="size-3.5 text-primary" /> Track Guide Location
          </Button>
        ) : null}
      </div>

      <PrintableBookingModal
        open={openPrint}
        onOpenChange={setOpenPrint}
        booking={{
          id: booking.id,
          type: "specific",
          status: booking.status,
          createdAt: booking.createdAt,
          guideOrAgencyName: booking.specificGuide?.full_name ?? "Specific Guide",
          guideName: booking.specificGuide?.full_name,
          guidePhone: booking.specificGuide?.phone,
          guideEmail: booking.specificGuide?.email,
          places: booking.place ? [{ id: booking.place.id, name: booking.place.name, districtName: booking.place.district?.name }] : [],
          numberOfPeople: booking.numberOfPeople || 1,
          bookingDate: booking.bookingDate,
          bookingTime: booking.tripStartTime,
          pickupName: booking.pickupName,
          pickupAddress: booking.pickupAddress,
          pickupMapsUrl: booking.pickupMapsUrl,
          requestedPickupName: booking.requestedPickupName,
          requestedPickupAddress: booking.requestedPickupAddress,
          requestedPickupMapsUrl: booking.requestedPickupMapsUrl,
          pricingMode: "WHOLE_TOUR",
          totalPrice: booking.totalPrice || 0,
          cancellationPolicy: booking.cancellationPolicy,
          foodStatus: booking.foodStatus,
          foodDetails: booking.foodDetails,
          transportStatus: booking.transportStatus,
          transportDetails: booking.transportDetails,
          entryFeeStatus: booking.entryFeeStatus,
          entryFeeDetails: booking.entryFeeDetails,
          additionalCostsDetails: booking.additionalCostsDetails,
          paymentStatus: booking.paymentStatus,
        }}
      />

      <Dialog open={openTrack} onOpenChange={setOpenTrack}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Guide Location - {booking.specificGuide?.full_name}</DialogTitle>
          </DialogHeader>
          {locData.loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">
              Fetching guide location…
            </div>
          ) : locData.error ? (
            <div className="p-6 text-center text-sm text-destructive">{locData.error}</div>
          ) : locData.data?.isSharingLocation &&
            locData.data.sharedLatitude &&
            locData.data.sharedLongitude ? (
            <div className="space-y-3">
              <MapEmbed
                point={{
                  latitude: locData.data.sharedLatitude,
                  longitude: locData.data.sharedLongitude,
                }}
                label={booking.specificGuide?.full_name ?? "Guide Location"}
                height={260}
              />
              {locData.data.locationUpdatedAt ? (
                <p className="text-xs text-muted-foreground text-right">
                  Updated: {new Date(locData.data.locationUpdatedAt).toLocaleTimeString()}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Guide is not currently sharing live location.
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CommonRow({ booking }: { booking: CommonGuideBooking }) {
  const firstName = booking.selectedPlaces?.find((p) => p.place?.name)?.place?.name;
  const [openPrint, setOpenPrint] = React.useState(false);

  return (
    <div className="space-y-2">
      <RowShell
        image={booking.commonGuide?.profile_pic}
        title={booking.commonGuide?.agencyName || booking.commonGuide?.full_name || "Tour guide"}
        subtitle={`${booking.selectedPlaces?.length ?? 0} place(s)${booking.bookingDate ? ` · ${booking.bookingDate}` : ""}`}
        meta={booking.selectedPlaces?.map((p) => p.place?.name).filter(Boolean).join(", ")}
        status={booking.status}
        href={firstName ? "/explore" : null}
      />
      <div className="flex justify-end px-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 rounded-xl text-xs gap-1.5"
          onClick={() => setOpenPrint(true)}
        >
          <Printer className="size-3.5 text-primary" /> Print Confirmation
        </Button>
      </div>

      <PrintableBookingModal
        open={openPrint}
        onOpenChange={setOpenPrint}
        booking={{
          id: booking.id,
          type: "common",
          status: booking.status,
          createdAt: booking.createdAt,
          guideOrAgencyName: booking.commonGuide?.agencyName || booking.commonGuide?.full_name || "Tour Guide",
          agencyName: booking.commonGuide?.agencyName,
          agencyAddress: booking.commonGuide?.agencyAddress,
          agencyBanner: booking.commonGuide?.agencyBanner,
          guideName: booking.commonGuide?.full_name,
          guidePhone: booking.commonGuide?.phone,
          guideEmail: booking.commonGuide?.email,
          places: booking.selectedPlaces?.map((p) => ({
            id: p.place?.id || p.id,
            name: p.place?.name || "Place",
            districtName: p.place?.district?.name,
          })) || [],
          numberOfPeople: booking.numberOfPeople || 1,
          bookingDate: booking.bookingDate,
          bookingTime: booking.tripStartTime,
          pickupName: booking.pickupName,
          pickupAddress: booking.pickupAddress,
          pickupMapsUrl: booking.pickupMapsUrl,
          requestedPickupName: booking.requestedPickupName,
          requestedPickupAddress: booking.requestedPickupAddress,
          requestedPickupMapsUrl: booking.requestedPickupMapsUrl,
          pricingMode: booking.pricingMode,
          pricingUnit: booking.pricingUnit,
          totalPrice: booking.totalPrice || 0,
          cancellationPolicy: booking.cancellationPolicy,
          foodStatus: booking.foodStatus,
          foodDetails: booking.foodDetails,
          transportStatus: booking.transportStatus,
          transportDetails: booking.transportDetails,
          entryFeeStatus: booking.entryFeeStatus,
          entryFeeDetails: booking.entryFeeDetails,
          additionalCostsDetails: booking.additionalCostsDetails,
          paymentStatus: booking.paymentStatus,
        }}
      />
    </div>
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