import { Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState, ErrorState } from "@/components/shared/states";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestRow } from "@/features/provider/components/request-row";
import { loadRequests } from "@/features/provider/api/provider.actions";
import { requireProviderSession } from "@/features/provider/state/provider-session";
import type { RequestStatus } from "@/features/provider/types";

export const metadata: Metadata = { title: "Requests" };

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
    title: "No requests yet",
    description:
      "When a traveller asks to book, the request appears here for you to accept or decline.",
  },
  PENDING: {
    title: "Nothing waiting",
    description: "Every request has been answered. New ones will show up here.",
  },
  CONFIRMED: {
    title: "No accepted requests",
    description: "Requests you accept are tracked here until they are completed.",
  },
  CLOSED: {
    title: "Nothing closed",
    description: "Declined and cancelled requests are kept here for your records.",
  },
};

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireProviderSession("/requests");
  const { status } = await searchParams;

  const active = (
    FILTERS.some((filter) => filter.value === status) ? status : "ALL"
  ) as Filter;

  const requests = await loadRequests().catch((error: unknown) => {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Your requests could not be loaded.",
    };
  });

  if ("error" in requests) {
    return (
      <div className="app-container mx-auto max-w-5xl py-6">
        <PageHeader title="Requests" />
        <ErrorState
          title="Could not load requests"
          description={requests.error}
          action={
            <Button asChild variant="outline">
              <Link href="/requests">Try again</Link>
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
      <PageHeader
        title="Requests"
        description={
          session.kind === "hotel" || session.kind === "restaurant"
            ? "Booking requests for the properties you publish."
            : "Booking requests travellers have sent to you."
        }
      />

      <Tabs defaultValue={active} className="w-full space-y-6">
        <TabsList className="h-11 w-full justify-start overflow-x-auto rounded-2xl border border-border/80 bg-muted/60 p-1 shadow-xs sm:w-auto">
          {FILTERS.map((filter) => (
            <TabsTrigger
              key={filter.value}
              value={filter.value}
              className="gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground data-[state=active]:border data-[state=active]:border-border/80 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs"
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
                  icon={Inbox}
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
