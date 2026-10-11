import {
  CalendarDays,
  Clock,
  Compass,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  Phone,
  Ticket,
  Users,
  Utensils,
  Car,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppImage } from "@/components/shared/app-image";
import { ErrorState } from "@/components/shared/states";
import { GlassCard } from "@/components/shared/glass-card";
import { RequestStatusBadge } from "@/components/shared/status-badge";
import { RequestActions } from "@/features/provider/components/request-row";
import { PrintBookingButton } from "@/features/provider/components/print-booking-button";
import { loadRequests } from "@/features/provider/api/provider.actions";
import { requireProviderSession } from "@/features/provider/state/provider-session";
import {
  formatCurrency,
  formatBookingDate,
  formatBookingTime,
  formatBookingRef,
  pluralize,
} from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Request Details" };

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
      <div className="app-container mx-auto max-w-6xl py-6">
        <Link
          href="/requests"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="size-4" /> Back to Requests
        </Link>
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

  const refCode = formatBookingRef(request.id);
  const tourDateFormatted = formatBookingDate(request.date);
  const tourEndDateFormatted = request.endDate ? formatBookingDate(request.endDate) : null;
  const createdDateFormatted = formatBookingDate(request.createdAt);
  const tourTimeFormatted = formatBookingTime(request.tripStartTime || request.time);

  const adults = request.adults ?? request.bookingSnapshot?.numberOfAdults;
  const children = request.children ?? request.bookingSnapshot?.numberOfChildren;
  const totalGuests =
    request.guests ??
    request.bookingSnapshot?.totalGuests ??
    (adults ? adults + (children ?? 0) : 1);

  const pickupName =
    request.pickupName ||
    request.requestedPickupName ||
    request.packageDetails?.pickupLocation;
  const pickupAddress = request.pickupAddress || request.requestedPickupAddress;
  const pickupMapsUrl = request.pickupMapsUrl || request.requestedPickupMapsUrl;

  const places =
    request.places && request.places.length > 0
      ? request.places
      : request.packageDetails?.places ?? [];

  const foodText =
    request.foodDetails ||
    request.foodStatus ||
    request.bookingSnapshot?.foodArrangement;

  const transportText =
    request.transportDetails ||
    request.transportStatus ||
    request.bookingSnapshot?.transportArrangement;

  const notes = request.notes || request.bookingSnapshot?.notes;

  const inclusions: string[] =
    request.packageDetails?.inclusions && request.packageDetails.inclusions.length > 0
      ? request.packageDetails.inclusions
      : (request.bookingSnapshot?.inclusions ?? []);

  const exclusions: string[] =
    request.packageDetails?.exclusions && request.packageDetails.exclusions.length > 0
      ? request.packageDetails.exclusions
      : (request.bookingSnapshot?.exclusions ?? []);

  const cancellationPolicy =
    request.cancellationPolicy ||
    request.bookingSnapshot?.cancellationPolicy ||
    "Standard tour policy: Full refund up to 48 hours prior to start. Non-refundable thereafter.";

  const pricingModeDisplay =
    request.pricingMode ||
    request.bookingSnapshot?.pricingMode ||
    (request.pricingUnit ? `Per ${request.pricingUnit}` : "Agreed Tour Rate");

  return (
    <div className="app-container mx-auto max-w-6xl py-6 space-y-6">
      {/* Top Header & Breadcrumb Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <Link
            href="/requests"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-1.5 transition-colors"
          >
            <ChevronLeft className="size-4" /> Back to Requests
          </Link>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Booking Request Workspace
            </h1>
            <Badge variant="outline" className="font-mono text-xs font-bold px-2 py-0.5">
              {refCode}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Requested on {createdDateFormatted} · Full booking snapshot & workspace
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <RequestStatusBadge status={request.status} />
          <PrintBookingButton request={request} />
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Comprehensive Details (Customer + Package + Itinerary) */}
        <div className="lg:col-span-8 space-y-6">
          {/* 1. Customer Information Card */}
          <GlassCard className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Users className="size-4" />
                </span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Customer & Traveller Information
                </h2>
              </div>
              <Badge variant="secondary" className="text-xs font-semibold">
                {totalGuests} {pluralize(totalGuests, "Traveller")}
              </Badge>
            </div>

            {/* Customer Identity Row */}
            <div className="flex items-start gap-4">
              <AppImage
                src={request.customer.photo}
                alt={request.customer.name}
                className="size-14 sm:size-16 shrink-0 rounded-2xl border"
                fallbackClassName="rounded-2xl"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-base font-bold text-foreground">{request.customer.name}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  <a
                    href={`mailto:${request.customer.email}`}
                    className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium"
                  >
                    <Mail className="size-3.5" />
                    {request.customer.email}
                  </a>
                  {request.customer.phone ? (
                    <a
                      href={`tel:${request.customer.phone}`}
                      className="inline-flex items-center gap-1.5 text-primary hover:underline font-medium"
                    >
                      <Phone className="size-3.5" />
                      {request.customer.phone}
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="size-3.5" /> Phone not provided
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Key Schedule & Traveller Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl bg-muted/50 p-3 border">
                <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground block font-bold">
                  Tour Date
                </span>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {tourEndDateFormatted
                    ? `${tourDateFormatted} → ${tourEndDateFormatted}`
                    : tourDateFormatted}
                </p>
              </div>

              <div className="rounded-xl bg-muted/50 p-3 border">
                <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground block font-bold">
                  Start Time (IST)
                </span>
                <p className="mt-1 text-sm font-semibold text-foreground">{tourTimeFormatted}</p>
              </div>

              <div className="rounded-xl bg-muted/50 p-3 border">
                <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground block font-bold">
                  Traveller Breakdown
                </span>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {adults !== undefined || children !== undefined
                    ? `${adults ?? 0} Adults · ${children ?? 0} Children`
                    : `${totalGuests} Guests`}
                </p>
              </div>

              <div className="rounded-xl bg-muted/50 p-3 border">
                <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground block font-bold">
                  Booking Reference
                </span>
                <p className="mt-1 text-xs font-mono font-bold text-foreground truncate">{refCode}</p>
              </div>
            </div>

            {/* Meeting & Pickup Location */}
            <div className="rounded-2xl border bg-muted/30 p-4 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-primary" /> Meeting / Pickup Location
                </span>
                {pickupMapsUrl && (
                  <a
                    href={pickupMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                  >
                    Open in Maps <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
              <p className="text-sm font-bold text-foreground">
                {pickupName || "Designated Tour Pickup Point"}
              </p>
              {pickupAddress && (
                <p className="text-xs text-muted-foreground leading-relaxed">{pickupAddress}</p>
              )}
            </div>

            {/* Customer Special Notes / Requests */}
            {notes && (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-1">
                <span className="text-[0.65rem] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1.5">
                  <AlertCircle className="size-3.5" /> Customer Notes & Special Requests
                </span>
                <p className="text-xs text-foreground italic">&ldquo;{notes}&rdquo;</p>
              </div>
            )}
          </GlassCard>

          {/* 2. Selected Package / Service Details Card (Prominent) */}
          <GlassCard className="p-5 sm:p-6 space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Compass className="size-4" />
                </span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Selected Package / Service Details
                </h2>
              </div>
              <Badge variant="outline" className="text-xs font-semibold">
                {pricingModeDisplay}
              </Badge>
            </div>

            {/* Package Overview */}
            <div className="flex items-start gap-4">
              {request.listingImage ? (
                <AppImage
                  src={request.listingImage}
                  alt={request.listingName}
                  className="size-16 sm:size-20 shrink-0 rounded-2xl border"
                  fallbackClassName="rounded-2xl"
                />
              ) : null}
              <div className="space-y-1">
                <p className="text-base sm:text-lg font-bold text-foreground">{request.listingName}</p>
                {request.packageDetails?.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {request.packageDetails.description}
                  </p>
                )}
                {request.tourGuideName && (
                  <p className="text-xs text-primary font-medium flex items-center gap-1 pt-0.5">
                    <ShieldCheck className="size-3.5" /> Dedicated Guide: {request.tourGuideName}
                  </p>
                )}
              </div>
            </div>

            {/* Service Configuration Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl border p-3 bg-card space-y-1">
                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                  <Utensils className="size-3 text-primary" /> Meals / Food
                </span>
                <p className="text-xs font-semibold text-foreground">
                  {foodText || "Not included"}
                </p>
              </div>

              <div className="rounded-xl border p-3 bg-card space-y-1">
                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                  <Car className="size-3 text-primary" /> Transport Arrangement
                </span>
                <p className="text-xs font-semibold text-foreground">
                  {transportText || "Self / Not included"}
                </p>
              </div>

              <div className="rounded-xl border p-3 bg-card space-y-1">
                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                  <Ticket className="size-3 text-primary" /> Ticket Assistance
                </span>
                <p className="text-xs font-semibold text-foreground">
                  {request.requestTicketAssistance ? "Assistance Requested" : "Standard Policy"}
                </p>
              </div>
            </div>

            {/* Ordered Itinerary Stops */}
            {places.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-primary" /> Itinerary Stops ({places.length} Locations)
                  </span>
                  <span className="text-[0.7rem] text-muted-foreground">Sequential Visit Order</span>
                </div>

                <div className="rounded-2xl border divide-y overflow-hidden bg-card">
                  {places.map((place, idx) => (
                    <div
                      key={place.id || idx}
                      className="p-3 sm:px-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="size-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-bold text-foreground truncate">
                            {place.name}
                          </p>
                          {(place.district || place.category) && (
                            <p className="text-[0.7rem] text-muted-foreground truncate">
                              {[place.district, place.category].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {place.visitArrangement && (
                          <Badge variant="outline" className="text-[0.65rem] font-medium block sm:inline-block">
                            {place.visitArrangement}
                          </Badge>
                        )}
                        {place.duration && (
                          <p className="text-[0.7rem] text-muted-foreground mt-0.5 sm:inline-block sm:ml-2">
                            {place.duration}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inclusions and Exclusions */}
            {(inclusions.length > 0 || exclusions.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                {inclusions.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="size-3.5 text-emerald-600" /> Inclusions
                    </span>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {inclusions.map((inc, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="size-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                          <span>{inc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {exclusions.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <AlertCircle className="size-3.5 text-rose-500" /> Exclusions
                    </span>
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {exclusions.map((exc, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="size-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                          <span>{exc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Cancellation Policy */}
            <div className="rounded-xl bg-muted/40 p-3.5 border text-xs space-y-1">
              <span className="font-bold text-foreground block">Cancellation Policy & Terms</span>
              <p className="text-muted-foreground leading-relaxed">{cancellationPolicy}</p>
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Actions, Financials & Confirmation Workspace */}
        <div className="lg:col-span-4 space-y-6">
          {/* Quick Financial Summary */}
          <GlassCard className="p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Agreed Financials
              </span>
              <Badge variant="outline" className="text-[0.65rem] font-semibold text-primary">
                {request.paymentStatus || "Direct Settlement"}
              </Badge>
            </div>

            <div>
              <span className="text-xs text-muted-foreground block">Total Quoted Amount</span>
              <p className="text-2xl font-black text-primary">
                {request.amount !== null ? formatCurrency(request.amount) : "On confirmation"}
              </p>
              <p className="text-[0.7rem] text-muted-foreground mt-0.5">
                Basis: {pricingModeDisplay}
              </p>
            </div>

            <div className="rounded-xl bg-muted/50 p-3 border text-xs text-muted-foreground leading-relaxed">
              <p className="font-semibold text-foreground mb-0.5">Payment Method: Direct to Guide</p>
              Payment is settled directly with the traveller unless explicitly escrowed. Platform holds official terms snapshot.
            </div>
          </GlassCard>

          {/* Booking Confirmation & Printing Workspace */}
          <GlassCard className="p-5 space-y-3 border-primary/20 bg-primary/[0.02]">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">Confirmation Document</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Review saved snapshot terms and print an authoritative A4 document or save as PDF without navigating away.
            </p>
            <div className="pt-2">
              <PrintBookingButton request={request} />
            </div>
          </GlassCard>

          {/* Status Actions */}
          <GlassCard className="p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground">Booking Actions</h3>
            <p className="text-xs text-muted-foreground">
              Update request status according to official guide workflow rules.
            </p>
            <div className="pt-1">
              <RequestActions request={request} />
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

