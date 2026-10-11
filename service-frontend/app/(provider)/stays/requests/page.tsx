import { BedSingle, Hotel, Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState, ErrorState } from "@/components/shared/states";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestRow } from "@/features/provider/components/request-row";
import { loadRequests } from "@/features/provider/api/provider.actions";
import { requireProviderSession } from "@/features/provider/state/provider-session";
import type { RequestStatus } from "@/features/provider/types";

export const metadata: Metadata = { title: "Stays Reservations" };

type Filter = "ALL" | "PENDING" | "CONFIRMED" | "CLOSED";

const FILTERS: { value: Filter; label: string; statuses: RequestStatus[] }[] = [
  { value: "ALL", label: "All", statuses: [] },
  { value: "PENDING", label: "Waiting", statuses: ["PENDING"] },
  { value: "CONFIRMED", label: "Accepted", statuses: ["CONFIRMED", "COMPLETED"] },
  {
    value: "CLOSED",
    label: "Closed",
    statuses: ["CANCELLED", "REJECTED"],
  },
];

const EMPTY_COPY: Record<Filter, { title: string; description: string }> = {
  ALL: {
    title: "No stay bookings yet",
    description:
      "When a traveller books dorm beds or private rooms at your stay, reservations appear here.",
  },
  PENDING: {
    title: "Nothing waiting",
    description: "Every reservation has been answered. New traveller requests will show up here.",
  },
  CONFIRMED: {
    title: "No accepted bookings",
    description: "Confirmed stays reservations you accept are tracked here until guest checkout.",
  },
  CLOSED: {
    title: "Nothing closed",
    description: "Declined, cancelled or completed guest stays are kept here for your records.",
  },
};

export default async function StaysRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireProviderSession("/stays/requests");
  const { status } = await searchParams;

  const active = (
    FILTERS.some((filter) => filter.value === status) ? status : "ALL"
  ) as Filter;

  const requests = await loadRequests().catch((error: unknown) => {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Your stay requests could not be loaded.",
    };
  });

  if ("error" in requests) {
    return (
      <div className="app-container mx-auto max-w-5xl py-6">
        <PageHeader title="Stays Reservations" />
        <ErrorState
          title="Could not load requests"
          description={requests.error}
          action={
            <Button asChild variant="outline">
              <Link href="/stays/requests">Try again</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const counts = FILTERS.reduce<Record<Filter, number>>(
    (accumulator, filter) => {
      accumulator[filter.value] =
        filter.statuses.length === 0
          ? requests.length
          : requests.filter((request) =>
              filter.statuses.includes(request.status)
            ).length;
      return accumulator;
    },
    { ALL: 0, PENDING: 0, CONFIRMED: 0, CLOSED: 0 }
  );

  return (
    <div className="app-container mx-auto max-w-5xl py-6 space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5">
        <div>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-600 text-white font-bold uppercase text-[0.65rem] tracking-wide">
              Stays & Hostels
            </Badge>
            <span className="text-xs text-muted-foreground">
              Guest Reservations
            </span>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight">
            Guest Reservations
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Incoming dorm bed bookings and private room requests from travellers.
          </p>
        </div>

        <Button asChild variant="outline" size="sm" className="rounded-xl gap-1.5 self-start sm:self-auto">
          <Link href="/requests">
            <Hotel className="size-3.5" />
            Hotel Requests View
          </Link>
        </Button>
      </div>

      <Tabs defaultValue={active} className="w-full space-y-6">
        <TabsList className="h-11 w-full justify-start overflow-x-auto rounded-2xl border border-border/80 bg-muted/60 p-1 shadow-xs sm:w-auto">
          {FILTERS.map((filter) => (
            <TabsTrigger
              key={filter.value}
              value={filter.value}
              className="gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border data-[state=active]:border-border/80 data-[state=active]:bg-card data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-xs"
            >
              <span>{filter.label}</span>
              <span className="ml-1 rounded-full bg-muted-foreground/15 px-2 py-0.5 text-[0.68rem] font-bold text-foreground">
                {counts[filter.value]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {FILTERS.map((filter) => {
          const visible =
            filter.statuses.length === 0
              ? requests
              : requests.filter((request) =>
                  filter.statuses.includes(request.status)
                );

          return (
            <TabsContent key={filter.value} value={filter.value} className="focus-visible:outline-none">
              {visible.length === 0 ? (
                <EmptyState
                  icon={BedSingle}
                  title={EMPTY_COPY[filter.value].title}
                  description={EMPTY_COPY[filter.value].description}
                />
              ) : (
                <ul className="flex flex-col gap-4">
                  {visible.map((request) => (
                    <li key={request.id}>
                      <RequestRow request={request} />
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
