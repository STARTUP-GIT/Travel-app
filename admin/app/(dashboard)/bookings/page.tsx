"use client";

import * as React from "react";
import { toast } from "sonner";

import { BookingStatusSelect } from "@/components/admin/booking-status-select";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState, EmptyState } from "@/components/admin/state";
import { StatusBadge } from "@/components/admin/status-badge";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { patchJSON } from "@/lib/api/mutate";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { formatDate } from "@/lib/utils";
import type {
  CommonGuideBooking,
  HotelBooking,
  Reservation,
  SpecificGuideBooking,
} from "@/lib/types";

type Tab = "guides" | "hotels" | "reservations";

type GuideBookings = { specificBookings: SpecificGuideBooking[]; commonBookings: CommonGuideBooking[] };

export default function BookingsPage() {
  const [tab, setTab] = React.useState<Tab>("guides");
  const guide = useAdminData<GuideBookings>("/admin/api/bookings/guides");
  const hotel = useAdminData<{ bookings: HotelBooking[] }>("/admin/api/bookings/hotels");
  const reservation = useAdminData<{ reservations: Reservation[] }>(
    "/admin/api/bookings/reservations"
  );

  const refresh = () => {
    guide.refetch();
    hotel.refetch();
    reservation.refetch();
  };

  const updateGuide = async (kind: "specific" | "common", id: string, status: string) => {
    await patchJSON(`/admin/api/bookings/guides/${kind}/${id}/status`, { status });
    toast.success(`Booking marked ${status.toLowerCase()}`);
    refresh();
  };

  const updateHotel = async (id: string, status: string) => {
    await patchJSON(`/admin/api/bookings/hotels/${id}/status`, { status });
    toast.success(`Booking marked ${status.toLowerCase()}`);
    refresh();
  };

  const updateReservation = async (id: string, status: string) => {
    await patchJSON(`/admin/api/bookings/reservations/${id}/status`, { status });
    toast.success(`Reservation marked ${status.toLowerCase()}`);
    refresh();
  };

  return (
    <div>
      <PageHeader title="Bookings" subtitle="Guide bookings, hotel bookings and restaurant reservations." />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="mb-4">
        <TabsList>
          <TabsTrigger value="guides">Guides</TabsTrigger>
          <TabsTrigger value="hotels">Hotels</TabsTrigger>
          <TabsTrigger value="reservations">Reservations</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "guides" ? (
        <div className="space-y-8">
          <BookingSection title="Specific guide bookings">
            {renderGuideRows(
              guide,
              guide.data?.specificBookings,
              "specific",
              guide.refetch,
              updateGuide
            )}
          </BookingSection>
          <BookingSection title="Common guide bookings">
            {renderGuideRows(
              guide,
              guide.data?.commonBookings,
              "common",
              guide.refetch,
              updateGuide
            )}
          </BookingSection>
        </div>
      ) : tab === "hotels" ? (
        <BookingSection title="Hotel bookings">
          {renderGeneric(
            hotel,
            hotel.data?.bookings,
            hotel.refetch,
            (b: HotelBooking) => (
              <div>
                <p className="font-medium">{b.hotel?.name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {b.user?.name ?? "—"} · {formatDate(b.checkIn)} → {formatDate(b.checkOut)} ·{" "}
                  {b.guests} guests · {b.rooms} room(s)
                </p>
              </div>
            ),
            (b: HotelBooking) => (
              <BookingStatusSelect value={b.status} onUpdate={(s) => updateHotel(b.id, s)} />
            )
          )}
        </BookingSection>
      ) : (
        <BookingSection title="Restaurant reservations">
          {renderGeneric(
            reservation,
            reservation.data?.reservations,
            reservation.refetch,
            (b: Reservation) => (
              <div>
                <p className="font-medium">{b.restaurent?.name ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {b.user?.name ?? "—"} · {formatDate(b.reservationDate)} · {b.guests} guests
                </p>
              </div>
            ),
            (b: Reservation) => (
              <BookingStatusSelect value={b.status} onUpdate={(s) => updateReservation(b.id, s)} />
            )
          )}
        </BookingSection>
      )}
    </div>
  );
}

function BookingSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function renderGuideRows(
  state: ReturnType<typeof useAdminData<GuideBookings>>,
  rows: SpecificGuideBooking[] | CommonGuideBooking[] | undefined,
  kind: "specific" | "common",
  refetch: () => void,
  update: (kind: "specific" | "common", id: string, status: string) => Promise<void>
) {
  if (state.loading) return <LoadingState rows={4} />;
  if (state.error || !rows) return <ErrorState message={state.error} onRetry={refetch} />;
  if (rows.length === 0) return <EmptyState title="No bookings" />;

  if (kind === "specific") {
    const list = rows as SpecificGuideBooking[];
    return (
      <ul className="space-y-2">
        {list.map((b) => (
          <li key={b.id} className="mono-card flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="font-medium">{b.specificGuide?.full_name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">
                {b.user?.name ?? "—"} · {formatDate(b.bookingDate)} {b.bookingTime ? `· ${b.bookingTime}` : ""} ·{" "}
                {b.place?.name ?? "—"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={b.status} />
              <BookingStatusSelect value={b.status} onUpdate={(s) => update(kind, b.id, s)} />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  const list = rows as CommonGuideBooking[];
  return (
    <ul className="space-y-2">
      {list.map((b) => (
        <li key={b.id} className="mono-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="font-medium">{b.commonGuide?.full_name ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {b.user?.name ?? "—"} · {formatDate(b.bookingDate)} {b.bookingTime ? `· ${b.bookingTime}` : ""} ·{" "}
              {b.selectedPlaces?.length ?? 0} places
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={b.status} />
            <BookingStatusSelect value={b.status} onUpdate={(s) => update(kind, b.id, s)} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function renderGeneric<T extends { id: string; status: string }>(
  state: { loading: boolean; error: string | null; refetch: () => void },
  rows: T[] | undefined,
  refetch: () => void,
  cell: (row: T) => React.ReactNode,
  actions: (row: T) => React.ReactNode
) {
  if (state.loading) return <LoadingState rows={4} />;
  if (state.error || !rows) return <ErrorState message={state.error} onRetry={refetch} />;
  if (rows.length === 0) return <EmptyState title="No bookings" />;
  return (
    <ul className="space-y-2">
      {rows.map((b) => (
        <li key={b.id} className="mono-card flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="min-w-0">{cell(b)}</div>
          <div className="flex items-center gap-2">
            <StatusBadge status={b.status} />
            {actions(b)}
          </div>
        </li>
      ))}
    </ul>
  );
}