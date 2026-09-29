import { CalendarClock, CheckCircle2, Inbox, IndianRupee, Store, XCircle } from "lucide-react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

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
import { providerMeta } from "@/features/provider/config";
import { formatCurrency, formatShortDate } from "@/lib/utils";

type Tile = {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: "primary" | "success" | "warning" | "danger" | "muted";
};

const TONES: Record<Tile["tone"], string> = {
  primary: "bg-primary/10 text-primary",
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

/** Username for sessions created before it was carried on the session itself. */
async function readUsernameFromProfile(): Promise<string> {
  try {
    const profile = await loadProfile();
    return profile.username.trim();
  } catch {
    return "";
  }
}

export default async function DashboardPage() {
  const session = await requireProviderSession("/dashboard");
  const meta = providerMeta(session.kind);

  // The account's own username, never the part of the email before the `@`. A
  // session issued before the username was carried on the session has none, so
  // the profile is read once as a fallback instead of greeting with the email.
  const greeting = session.username || (await readUsernameFromProfile()) || "there";

  const data = await loadDashboard().catch((error: unknown) => {
    return {
      error:
        error instanceof Error
          ? error.message
          : "The dashboard could not be loaded.",
    };
  });

  if ("error" in data) {
    return (
      <div className="app-container">
        <PageHeader
          title={`Welcome, ${greeting}`}
          description="Your listings and incoming requests at a glance."
        />
        <ErrorState
          title="Dashboard unavailable"
          description={data.error}
          action={
            <Button asChild variant="outline">
              <Link href="/login?next=/dashboard">Sign in again</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { stats, recentRequests, needsAction, listingsPartial, listingsError } =
    data;

  const requestWord =
    session.kind === "hotel"
      ? "booking"
      : session.kind === "restaurant"
        ? "reservation"
        : "booking";

  const tiles: Tile[] = [
    {
      label: `Total ${requestWord}s`,
      value: String(stats.totalRequests),
      icon: Inbox,
      tone: "primary",
    },
    {
      label: "Waiting for a reply",
      value: String(stats.pending),
      icon: CalendarClock,
      tone: stats.pending > 0 ? "warning" : "muted",
    },
    {
      label: "Confirmed",
      value: String(stats.confirmed),
      icon: CheckCircle2,
      tone: "success",
    },
    {
      label: meta.managesVenues ? "Your listings" : "Listing",
      value: String(stats.listingCount),
      icon: Store,
      tone: "muted",
    },
  ];

  if (stats.earnings !== null) {
    tiles.push({
      label: "Confirmed + completed value",
      value: formatCurrency(stats.earnings),
      icon: IndianRupee,
      tone: "primary",
    });
  }

  if (stats.cancelled + stats.rejected > 0) {
    tiles.push({
      label: "Declined or cancelled",
      value: String(stats.cancelled + stats.rejected),
      icon: XCircle,
      tone: "danger",
    });
  }

  return (
    <div className="app-container">
      <PageHeader
        title={`Welcome, ${greeting}`}
        description={
          stats.pending > 0
            ? `${stats.pending} ${requestWord}${stats.pending === 1 ? "" : "s"} need${stats.pending === 1 ? "s" : ""} your reply.`
            : "Everything is answered. Here is the latest activity."
        }
      />

      {listingsPartial ? (
        <div
          role="status"
          className="mb-4 rounded-2xl border border-warning/40 bg-warning/8 p-4"
        >
          <p className="text-sm font-semibold">
            Approved listings only, for now
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            The service cannot currently return your own hotel list, so this
            dashboard falls back to the public approved listings that belong to
            you. Anything still waiting for approval is not included.
          </p>
        </div>
      ) : null}

      {listingsError ? (
        <div
          role="alert"
          className="mb-4 rounded-2xl border border-destructive/40 bg-destructive/6 p-4 text-sm"
        >
          <p className="font-semibold">Your listings could not be loaded</p>
          <p className="mt-1 text-muted-foreground">{listingsError}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((tile) => (
          <StatTile key={tile.label} tile={tile} />
        ))}
      </div>

      <section className="mt-8">
        <SectionHeader
          title="Needs your reply"
          subtitle={needsAction.length ? undefined : "Nothing is waiting"}
          href="/requests?status=PENDING"
          actionLabel="All requests"
        />
        {needsAction.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="All caught up"
            description={`New ${requestWord}s from travellers will appear here as soon as they arrive.`}
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {needsAction.map((request) => (
              <li key={request.id}>
                <Link
                  href={`/requests/${request.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/40"
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
                      {request.guests ? ` · ${request.guests} guests` : ""}
                    </p>
                  </div>
                  <RequestStatusBadge status={request.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <SectionHeader
          title="Latest requests"
          href="/requests"
          actionLabel="See all"
        />
        {recentRequests.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No requests yet"
            description={
              meta.managesVenues
                ? "Once your listing is live and bookable, traveller requests will show up here."
                : "Traveller requests for your guide profile will show up here."
            }
            action={
              meta.managesVenues ? (
                <Button asChild>
                  <Link href="/services/new">Add your first listing</Link>
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link href="/profile">Check your profile</Link>
                </Button>
              )
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {recentRequests.map((request) => (
              <li key={request.id}>
                <Link
                  href={`/requests/${request.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/40"
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
