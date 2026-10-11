import {
  BedDouble,
  BedSingle,
  CalendarClock,
  CheckCircle2,
  Hotel,
  Inbox,
  IndianRupee,
  Plus,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import type { Metadata } from "next";

import { AppImage } from "@/components/shared/app-image";
import { ErrorState, EmptyState } from "@/components/shared/states";
import { PageHeader } from "@/components/shared/page-header";
import { RequestStatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/shared/glass-card";
import { SectionHeader } from "@/components/shared/section-header";
import { loadDashboard, loadProfile } from "@/features/provider/api/provider.actions";
import { requireProviderSession } from "@/features/provider/state/provider-session";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { hotelOf } from "@/features/provider/utils";

export const metadata: Metadata = { title: "Stays Host Dashboard" };

type Tile = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: "primary" | "success" | "warning" | "danger" | "muted" | "emerald";
};

const TONES: Record<Tile["tone"], string> = {
  primary: "bg-primary/10 text-primary",
  emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  success: "bg-success/12 text-emerald-700",
  warning: "bg-warning/16 text-amber-800",
  danger: "bg-destructive/12 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

function StatTile({ tile }: { tile: Tile }) {
  const Icon = tile.icon;
  return (
    <GlassCard className="flex-row items-center gap-3 p-4">
      <span
        className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${TONES[tile.tone]}`}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-none tracking-tight">
          {tile.value}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground">{tile.label}</p>
      </div>
    </GlassCard>
  );
}

async function readUsername(): Promise<string> {
  try {
    const profile = await loadProfile();
    return profile.username.trim();
  } catch {
    return "";
  }
}

export default async function StaysDashboardPage() {
  const session = await requireProviderSession("/stays/dashboard");
  const username = (await readUsername()) || session.name || "Host";

  const data = await loadDashboard().catch((error: unknown) => {
    return {
      error:
        error instanceof Error
          ? error.message
          : "The Stays dashboard could not be loaded.",
    };
  });

  if ("error" in data) {
    return (
      <div className="app-container">
        <PageHeader
          title={`Stays Portal — Welcome, ${username}`}
          description="Hostels, dorms, and community stays management."
        />
        <ErrorState
          title="Dashboard unavailable"
          description={data.error}
          action={
            <Button asChild variant="outline">
              <Link href="/login?next=/stays/dashboard&reauth=1">Sign in again</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { stats, recentRequests, needsAction } = data;

  // Derive stays listings
  const staysListings = data.listingsError
    ? []
    : []; // populated through loadListings if needed

  const tiles: Tile[] = [
    {
      label: "Stay Reservations",
      value: String(stats.totalRequests),
      icon: Inbox,
      tone: "emerald",
    },
    {
      label: "Needs Reply",
      value: String(stats.pending),
      icon: CalendarClock,
      tone: stats.pending > 0 ? "warning" : "muted",
    },
    {
      label: "Confirmed Guests",
      value: String(stats.confirmed),
      icon: CheckCircle2,
      tone: "success",
    },
    {
      label: "Listed Stays",
      value: String(stats.listingCount),
      icon: BedDouble,
      tone: "primary",
    },
  ];

  if (stats.earnings !== null) {
    tiles.push({
      label: "Stays Host Earnings",
      value: formatCurrency(stats.earnings),
      icon: IndianRupee,
      tone: "emerald",
    });
  }

  return (
    <div className="app-container">
      {/* Portal Hero / Switcher Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-600 text-white font-bold uppercase text-[0.65rem] tracking-wide">
              Stays & Hostels Portal
            </Badge>
            <span className="text-xs text-muted-foreground">
              Inspired by Zostel & Backpacker Hubs
            </span>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight">
            Welcome, {username}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your backpacker hostels, dorm beds, homestays, and social travel bookings.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5">
            <Link href="/dashboard">
              <Hotel className="size-3.5" />
              Switch to Hotel Portal
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm"
          >
            <Link href="/stays/services/new">
              <Plus className="size-3.5" />
              Add a Stay / Hostel
            </Link>
          </Button>
        </div>
      </div>

      {/* Metrics Tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <StatTile key={tile.label} tile={tile} />
        ))}
      </div>

      {/* Needs Your Reply Section */}
      <section className="mt-8">
        <SectionHeader
          title="Reservations awaiting your reply"
          subtitle={needsAction.length ? undefined : "All caught up"}
          href="/stays/requests?status=PENDING"
          actionLabel="All requests"
        />
        {needsAction.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All caught up"
            description="New dorm and room bookings from backpackers will appear here as soon as they arrive."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {needsAction.map((request) => (
              <li key={request.id}>
                <Link
                  href={`/requests/${request.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-emerald-500/50"
                >
                  <AppImage
                    src={request.listingImage}
                    alt={request.listingName}
                    className="size-14 shrink-0 rounded-xl"
                    fallbackClassName="rounded-xl"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {request.customer.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {request.listingName} · {formatShortDate(request.date)}
                      {request.guests ? ` · ${request.guests} guests / beds` : ""}
                    </p>
                  </div>
                  <RequestStatusBadge status={request.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Recent Guest Bookings */}
      <section className="mt-8">
        <SectionHeader
          title="Recent stays bookings"
          href="/stays/requests"
          actionLabel="See all"
        />
        {recentRequests.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No bookings yet"
            description="Once your stay or hostel is live and approved, guest reservations will show up here."
            action={
              <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                <Link href="/stays/services/new">Add your first Stay / Hostel</Link>
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {recentRequests.map((request) => (
              <li key={request.id}>
                <Link
                  href={`/requests/${request.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-emerald-500/50"
                >
                  <AppImage
                    src={request.listingImage}
                    alt={request.listingName}
                    fallbackClassName="rounded-xl"
                    className="size-12 shrink-0 rounded-xl"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {request.customer.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {request.listingName} · {formatShortDate(request.date)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <RequestStatusBadge status={request.status} />
                    {request.amount !== null ? (
                      <Badge variant="outline" className="text-[0.6rem]">
                        {formatCurrency(request.amount)}
                      </Badge>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
