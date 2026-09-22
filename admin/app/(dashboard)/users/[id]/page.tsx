"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { ImageThumb } from "@/components/admin/image-thumb";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { Button } from "@/components/ui/button";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { formatDate } from "@/lib/utils";
import type { UserAdminDetail } from "@/lib/types";

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { data, loading, error, refetch } = useAdminData<{ user: UserAdminDetail }>(
    `/admin/api/users/${id}`
  );

  const user = data?.user;
  const c = user?._count;

  return (
    <div>
      <PageHeader title={user?.name ?? "User"} subtitle={user?.email ?? "Loading…"}>
        <Button asChild variant="outline" size="sm">
          <Link href="/users">
            <ArrowLeft className="size-4" /> All users
          </Link>
        </Button>
      </PageHeader>

      {loading ? (
        <LoadingState />
      ) : error || !user ? (
        <ErrorState message={error} onRetry={refetch} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5">
            <div className="mono-card flex flex-col items-center gap-3 p-5 text-center">
              <ImageThumb src={user.profilepic} alt={user.name} className="size-16 rounded-xl" />
              <div>
                <h2 className="text-lg font-bold">{user.name}</h2>
                <p className="text-xs text-muted-foreground">@{user.username}</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 text-xs">
                <span className="rounded-full bg-muted px-2.5 py-1">{user.authprovider}</span>
                <span className="rounded-full bg-muted px-2.5 py-1">Joined {formatDate(user.createdAt)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <MiniStat label="Saved places" value={c?.user_fav_place ?? 0} />
              <MiniStat label="Testimonials" value={c?.testimonials ?? 0} />
              <MiniStat label="Hotel bookings" value={c?.hotel_booking ?? 0} />
              <MiniStat label="Reservations" value={c?.restaurant_reservation ?? 0} />
              <MiniStat label="Guide bookings" value={(c?.specificGuideBookings ?? 0) + (c?.commonGuideBookings ?? 0)} />
            </div>
          </div>

          <div className="space-y-5 lg:col-span-2">
            <Section title={`Saved places (${user.user_fav_place?.length ?? 0})`}>
              {user.user_fav_place?.length ? (
                <ul className="space-y-1">
                  {user.user_fav_place.map(({ place }) => (
                    <li key={place.id} className="flex items-center justify-between gap-3 rounded-lg p-2 text-sm">
                      <span className="font-medium">{place.name}</span>
                      <span className="text-xs text-muted-foreground">{place.district?.name ?? "—"}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No saved places.</p>
              )}
            </Section>

            <Section title={`Hotel bookings (${user.hotel_booking?.length ?? 0})`}>
              {user.hotel_booking?.length ? (
                <ul className="space-y-2">
                  {user.hotel_booking.map((b) => (
                    <li key={b.id} className="rounded-lg bg-muted/40 p-3 text-sm">
                      <span className="font-medium">{b.hotel?.name ?? "—"}</span>
                      <span className="text-muted-foreground">
                        {" "}· {formatDate(b.checkIn)} → {formatDate(b.checkOut)} · ₹{b.totalAmount} · {b.status}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No hotel bookings.</p>
              )}
            </Section>

            <Section title={`Reservations (${user.restaurant_reservation?.length ?? 0})`}>
              {user.restaurant_reservation?.length ? (
                <ul className="space-y-2">
                  {user.restaurant_reservation.map((b) => (
                    <li key={b.id} className="rounded-lg bg-muted/40 p-3 text-sm">
                      <span className="font-medium">{b.restaurent?.name ?? "—"}</span>
                      <span className="text-muted-foreground">
                        {" "}· {formatDate(b.reservationDate)} · {b.guests} guests · {b.status}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No reservations.</p>
              )}
            </Section>

            <Section title={`Guide bookings (${(user.specificGuideBookings?.length ?? 0) + (user.commonGuideBookings?.length ?? 0)})`}>
              {user.specificGuideBookings?.length || user.commonGuideBookings?.length ? (
                <ul className="space-y-2">
                  {(user.specificGuideBookings ?? []).map((b) => (
                    <li key={b.id} className="rounded-lg bg-muted/40 p-3 text-sm">
                      <span className="font-medium">{b.specificGuide?.full_name ?? "—"}</span>
                      <span className="text-muted-foreground"> · {formatDate(b.bookingDate)} · {b.status}</span>
                    </li>
                  ))}
                  {(user.commonGuideBookings ?? []).map((b) => (
                    <li key={b.id} className="rounded-lg bg-muted/40 p-3 text-sm">
                      <span className="font-medium">{b.commonGuide?.full_name ?? "—"}</span>
                      <span className="text-muted-foreground"> · {formatDate(b.bookingDate)} · {b.status}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No guide bookings.</p>
              )}
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="mono-card p-3 text-center">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[0.65rem] text-muted-foreground">{label}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mono-card p-5">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}