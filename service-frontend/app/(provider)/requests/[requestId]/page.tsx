import { CalendarDays, Mail, MapPin, Phone, Users } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppImage } from "@/components/shared/app-image";
import { BackLink } from "@/components/shared/screen-header";
import { ErrorState } from "@/components/shared/states";
import { GlassCard } from "@/components/shared/glass-card";
import { PageHeader } from "@/components/shared/page-header";
import { RequestStatusBadge } from "@/components/shared/status-badge";
import { RequestActions } from "@/features/provider/components/request-row";
import { PrintBookingButton } from "@/features/provider/components/print-booking-button";
import { loadRequests } from "@/features/provider/api/provider.actions";
import { requireProviderSession } from "@/features/provider/state/provider-session";
import { formatCurrency, formatDate, formatShortDate, pluralize } from "@/lib/utils";

export const metadata: Metadata = { title: "Request" };

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  await requireProviderSession(`/requests/${requestId}`);

  const requests = await loadRequests().catch(() => null);
  if (!requests) {
    return (
      <div className="app-container max-w-2xl">
        <BackLink href="/requests" />
        <ErrorState
          title="Request unavailable"
          description="This request could not be loaded. Please try again."
        />
      </div>
    );
  }

  const request = requests.find((item) => item.id === requestId);
  if (!request) {
    notFound();
  }

  const rows: { icon: typeof Users; label: string; value: string }[] = [
    {
      icon: CalendarDays,
      label: request.endDate ? "Stay" : "Date",
      value: request.endDate
        ? `${formatDate(request.date)} → ${formatDate(request.endDate)}`
        : formatDate(request.date),
    },
  ];

  if (request.time) {
    rows.push({ icon: CalendarDays, label: "Time", value: request.time });
  }
  if (request.guests) {
    rows.push({
      icon: Users,
      label: "Guests",
      value: request.rooms
        ? `${pluralize(request.guests, "guest")} · ${pluralize(request.rooms, "room")}`
        : pluralize(request.guests, "guest"),
    });
  }
  if (request.amount !== null) {
    rows.push({
      icon: CalendarDays,
      label: "Value",
      value: formatCurrency(request.amount),
    });
  }
  rows.push({
    icon: CalendarDays,
    label: "Requested",
    value: formatShortDate(request.createdAt),
  });

  return (
    <div className="app-container max-w-2xl">
      <BackLink href="/requests" />
      <PageHeader
        title={request.customer.name}
        description={request.listingName}
        actions={
          <div className="flex items-center gap-2">
            <RequestStatusBadge status={request.status} />
            <PrintBookingButton request={request} />
          </div>
        }
      />

      <GlassCard className="mb-4 flex-row items-center gap-3 p-4">
        <AppImage
          src={request.customer.photo}
          alt={request.customer.name}
          className="size-14 shrink-0 rounded-full"
          fallbackClassName="rounded-full"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{request.customer.name}</p>
          <a
            href={`mailto:${request.customer.email}`}
            className="flex items-center gap-1.5 truncate text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            <Mail className="size-3.5 shrink-0" />
            {request.customer.email}
          </a>
          {request.customer.phone ? (
            <a
              href={`tel:${request.customer.phone}`}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              <Phone className="size-3.5 shrink-0" />
              {request.customer.phone}
            </a>
          ) : null}
        </div>
        <AppImage
          src={request.listingImage}
          alt={request.listingName}
          className="size-14 shrink-0 rounded-xl"
          fallbackClassName="rounded-xl"
        />
      </GlassCard>

      <GlassCard className="mb-4 p-4">
        <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          {rows.map((row) => (
            <div key={row.label} className="rounded-xl bg-muted/60 p-3">
              <dt className="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                <row.icon className="size-3" />
                {row.label}
              </dt>
              <dd className="mt-1 text-sm font-medium">{row.value}</dd>
            </div>
          ))}
        </dl>

        {request.places.length > 0 ? (
          <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5" />
            {request.places.map((place) => place.name).join(", ")}
          </p>
        ) : null}
      </GlassCard>

      <GlassCard className="gap-3 p-4">
        <p className="text-sm font-semibold">What can I do next?</p>
        <RequestActions request={request} />
      </GlassCard>
    </div>
  );
}
