"use client";

import {
  BedDouble,
  Building2,
  CalendarClock,
  Flower2,
  Hotel,
  Layers,
  Map,
  MapPin,
  PackageOpen,
  UserCheck,
  Users,
  UtensilsCrossed,
} from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import type { Stats } from "@/lib/types";

export default function DashboardPage() {
  const { data, loading, error, refetch } = useAdminData<Stats>("/admin/api/stats");

  if (loading) return <LoadingState rows={6} />;
  if (error || !data) return <ErrorState message={error ?? undefined} onRetry={refetch} />;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Live overview of users, content and bookings across the application."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Users" value={data.users} icon={Users} href="/users" />
        <StatCard label="States" value={data.states} icon={Map} href="/states" />
        <StatCard label="Districts" value={data.districts} icon={MapPin} href="/districts" />
        <StatCard label="Places" value={data.places} icon={Flower2} href="/places" />
        <StatCard
          label="Place requests"
          value={data.pendingPlaceSubmissions}
          icon={CalendarClock}
          href="/submissions"
        />
        <StatCard label="Guides" value={data.guides} icon={UserCheck} href="/guides" />
        <StatCard label="Hotels" value={data.hotels} icon={Building2} href="/hotels" />
        <StatCard label="Restaurants" value={data.restaurants} icon={UtensilsCrossed} href="/restaurants" />
        <StatCard label="Hotel bookings" value={data.hotelBookings} icon={Hotel} href="/bookings" />
        <StatCard label="Reservations" value={data.restaurantReservations} icon={UtensilsCrossed} href="/bookings" />
        <StatCard label="Guide bookings" value={data.guideBookings} icon={BedDouble} href="/bookings" />
        <StatCard label="Total content" value={data.places + data.states + data.districts} icon={Layers} />
      </div>
    </div>
  );
}