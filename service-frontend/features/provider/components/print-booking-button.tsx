"use client";

import * as React from "react";
import {
  Printer,
  Compass,
  Eye,
  MapPin,
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  Ticket,
  Utensils,
  Car,
  ExternalLink,
  FileText,
  AlertCircle,
  X,
  Building2,
} from "lucide-react";
import { useBranding } from "@/features/app-config/state/app-config-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  formatCurrency,
  formatBookingDate,
  formatBookingTime,
  formatBookingRef,
} from "@/lib/utils";
import type { ProviderRequest } from "@/features/provider/types";

export function PrintBookingButton({
  request,
  withPrintDocument = true,
}: {
  request: ProviderRequest;
  withPrintDocument?: boolean;
}) {
  const [viewOpen, setViewOpen] = React.useState(false);

  const handlePrint = () => {
    window.print();
  };

  const { appName, brandName, tagline, symbolLogoUrl } = useBranding();
  const platformName = appName || brandName || "ATLASWANDERS";
  const platformTagline = tagline || "Official Booking Confirmation & Workspace Snapshot";

  const refCode = formatBookingRef(request.id, platformName);
  const tourDateFormatted = formatBookingDate(request.date);
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
  const cancellationPolicy =
    request.cancellationPolicy ||
    request.bookingSnapshot?.cancellationPolicy ||
    "Standard tour policy: Full refund up to 48 hours prior to start. Non-refundable thereafter.";

  const pricingModeDisplay =
    request.pricingMode ||
    request.bookingSnapshot?.pricingMode ||
    (request.pricingUnit ? `Per ${request.pricingUnit}` : "Agreed Tour Rate");

  const providerAgencyName =
    request.agencyName ||
    request.bookingSnapshot?.agencyName ||
    (request.kind === "hotel_booking" ? request.listingName : null) ||
    (request.kind === "restaurant_reservation" ? request.listingName : null) ||
    "Official Registered Provider";

  const assignedGuideName =
    request.tourGuideName ||
    request.specificGuide?.name ||
    request.bookingSnapshot?.specificGuide?.name ||
    "Licensed Tour Guide";

  const guideKindLabel =
    request.kind === "common_guide_booking"
      ? "Common Tour Guide Agency"
      : request.kind === "specific_guide_booking"
      ? "Dedicated Place Guide"
      : request.kind === "hotel_booking"
      ? "Accommodation Provider"
      : "Dining & Reservation Provider";

  return (
    <>
      <div className="flex items-center gap-2 print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setViewOpen(true)}
          className="rounded-xl gap-1.5 text-xs font-semibold hover:bg-primary/5 hover:text-primary transition-colors"
        >
          <Eye className="size-3.5 text-primary" /> View Confirmation
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={handlePrint}
          className="rounded-xl gap-1.5 text-xs font-semibold shadow-sm"
        >
          <Printer className="size-3.5" /> Print Confirmation
        </Button>
      </div>

      {/* On-screen Readable Confirmation Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100vw-2rem)] sm:max-w-2xl md:max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl sm:rounded-3xl print:hidden pointer-events-auto"
        >
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-primary font-bold text-lg min-w-0">
                {symbolLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={symbolLogoUrl}
                    alt={platformName}
                    className="size-5 object-contain shrink-0"
                  />
                ) : (
                  <Compass className="size-5 shrink-0" />
                )}
                <span className="truncate">{platformName}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="font-mono text-xs px-2.5 py-0.5 font-bold">
                  {refCode}
                </Badge>
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setViewOpen(false)}
                    aria-label="Close booking confirmation"
                    className="size-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <X className="size-4" />
                    <span className="sr-only">Close booking confirmation</span>
                  </Button>
                </DialogClose>
              </div>
            </div>
            <DialogTitle className="text-base font-bold text-foreground mt-2">
              Official Booking Confirmation & Workspace Snapshot
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Review all persisted customer, package, and itinerary details before printing or saving to PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Status and Key Tour Schedule Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl bg-muted/40 p-3.5 border">
              <div>
                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground block font-bold">
                  Status
                </span>
                <span className="font-bold text-sm text-foreground">{request.status}</span>
              </div>
              <div>
                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground block font-bold">
                  Tour Date
                </span>
                <span className="font-semibold text-foreground">{tourDateFormatted}</span>
              </div>
              <div>
                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground block font-bold">
                  Start Time
                </span>
                <span className="font-semibold text-foreground">{tourTimeFormatted}</span>
              </div>
              <div>
                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground block font-bold">
                  Requested On
                </span>
                <span className="font-semibold text-foreground">{createdDateFormatted}</span>
              </div>
            </div>

            {/* Customer & Travellers Info */}
            <div className="rounded-2xl border p-4 bg-card space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
                <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5 min-w-0">
                  <Users className="size-3.5 text-primary shrink-0" /> Customer & Traveller Details
                </span>
                <span className="font-medium text-xs text-primary shrink-0">
                  {totalGuests} Total {totalGuests === 1 ? "Traveller" : "Travellers"}
                  {adults !== undefined && children !== undefined && (
                    <span className="text-muted-foreground text-[0.7rem] ml-1.5">
                      ({adults} {adults === 1 ? "Adult" : "Adults"}, {children} {children === 1 ? "Child" : "Children"})
                    </span>
                  )}
                </span>
              </div>

              {/* Responsive 3-column customer fields grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                <div className="min-w-0 space-y-1">
                  <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground block font-bold">
                    Full Name
                  </span>
                  <p className="font-bold text-sm text-foreground break-words [overflow-wrap:anywhere]">
                    {request.customer.name}
                  </p>
                </div>
                <div className="min-w-0 space-y-1">
                  <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground block font-bold">
                    Email Address
                  </span>
                  <a
                    href={`mailto:${request.customer.email}`}
                    className="text-primary hover:underline font-medium block text-xs break-all [overflow-wrap:anywhere]"
                  >
                    {request.customer.email}
                  </a>
                </div>
                <div className="min-w-0 space-y-1">
                  <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground block font-bold">
                    Phone Number
                  </span>
                  {request.customer.phone ? (
                    <a
                      href={`tel:${request.customer.phone}`}
                      className="text-primary hover:underline font-medium block text-xs break-words [overflow-wrap:anywhere]"
                    >
                      {request.customer.phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground block text-xs">Not provided</span>
                  )}
                </div>
              </div>

              {/* Meeting / Pickup Location on a separate full-width row */}
              {(pickupName || pickupAddress) && (
                <div className="pt-3 border-t mt-1 space-y-1 w-full min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground block font-bold">
                      Meeting / Pickup Location
                    </span>
                    {pickupMapsUrl && (
                      <a
                        href={pickupMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-primary text-[0.7rem] hover:underline font-medium shrink-0"
                      >
                        <MapPin className="size-3" /> View on Google Maps <ExternalLink className="size-2.5" />
                      </a>
                    )}
                  </div>
                  <p className="font-semibold text-foreground text-xs break-words [overflow-wrap:anywhere]">
                    {pickupName || "Designated Location"}
                  </p>
                  {pickupAddress && (
                    <p className="text-muted-foreground text-[0.7rem] leading-relaxed break-words [overflow-wrap:anywhere]">
                      {pickupAddress}
                    </p>
                  )}
                </div>
              )}

              {/* Special Notes */}
              {notes && (
                <div className="pt-2.5 border-t mt-1 space-y-1 w-full min-w-0">
                  <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground block font-bold">
                    Traveller Notes / Requests
                  </span>
                  <p className="text-muted-foreground italic bg-muted/30 p-2.5 rounded-xl text-[0.7rem] break-words [overflow-wrap:anywhere] leading-relaxed">
                    &ldquo;{notes}&rdquo;
                  </p>
                </div>
              )}
            </div>

            {/* Service Provider & Assigned Guide Details */}
            <div className="rounded-2xl border p-4 bg-card space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                  <Building2 className="size-3.5 text-primary" /> Service Provider &amp; Guide Information
                </span>
                {guideKindLabel && (
                  <Badge variant="outline" className="text-[0.65rem] border-primary/20 text-primary font-medium">
                    {guideKindLabel}
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="min-w-0 space-y-1">
                  <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground block font-bold">
                    Provider / Business Entity
                  </span>
                  <p className="font-bold text-sm text-foreground break-words [overflow-wrap:anywhere]">
                    {providerAgencyName}
                  </p>
                </div>
                <div className="min-w-0 space-y-1">
                  <span className="text-[0.65rem] uppercase tracking-wide text-muted-foreground block font-bold">
                    Assigned Tour Guide
                  </span>
                  <p className="font-semibold text-sm text-foreground break-words [overflow-wrap:anywhere]">
                    {assignedGuideName}
                  </p>
                </div>
              </div>
            </div>

            {/* Selected Package Details */}
            <div className="rounded-2xl border p-4 bg-card space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                  <Compass className="size-3.5 text-primary" /> Selected Package / Service
                </span>
                <Badge variant="secondary" className="text-[0.7rem]">
                  {pricingModeDisplay}
                </Badge>
              </div>
              <div>
                <p className="font-bold text-base text-foreground">{request.listingName}</p>
                {request.packageDetails?.description && (
                  <p className="text-muted-foreground text-[0.7rem] mt-1 line-clamp-2">
                    {request.packageDetails.description}
                  </p>
                )}
              </div>

              {/* Food, Transport, and Ticket Assistance */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t text-[0.7rem]">
                <div className="flex items-start gap-1.5">
                  <Utensils className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-foreground">Meals:</span>
                    <span className="text-muted-foreground">{foodText || "Not included"}</span>
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <Car className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-foreground">Transport:</span>
                    <span className="text-muted-foreground">{transportText || "Self / Not included"}</span>
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <Ticket className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block text-foreground">Ticket Assistance:</span>
                    <span className="text-muted-foreground">
                      {request.requestTicketAssistance ? "Requested" : "Standard"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Places / Itinerary Stops */}
            {places.length > 0 && (
              <div className="rounded-2xl border p-4 space-y-2 bg-card">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-primary" /> Scheduled Itinerary ({places.length} Stops)
                  </span>
                </div>
                <div className="divide-y text-[0.75rem]">
                  {places.map((place, idx) => (
                    <div key={place.id || idx} className="py-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="size-5 rounded-full bg-primary/10 text-primary font-bold text-[0.65rem] flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-foreground">{place.name}</p>
                          {(place.district || place.category) && (
                            <p className="text-[0.65rem] text-muted-foreground">
                              {[place.district, place.category].filter(Boolean).join(" · ")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-[0.7rem] text-muted-foreground">
                        {place.visitArrangement && <span className="block font-medium">{place.visitArrangement}</span>}
                        {place.duration && <span>{place.duration}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Financial Summary & Truthful Payment Status */}
            <div className="rounded-2xl border p-4 bg-primary/5 border-primary/20 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-bold block">
                    Agreed Total Tour Amount
                  </span>
                  <span className="text-xl font-bold text-primary">
                    {request.amount !== null ? formatCurrency(request.amount) : "Pricing on confirmation"}
                  </span>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="text-[0.65rem] border-primary/30 text-primary font-semibold">
                    {request.paymentStatus || "Direct Settlement"}
                  </Badge>
                  <p className="text-[0.65rem] text-muted-foreground mt-1">Direct settlement between guide & client</p>
                </div>
              </div>
              <div className="border-t border-primary/10 pt-2 text-[0.68rem] text-muted-foreground">
                <p>
                  <strong>Cancellation Policy:</strong> {cancellationPolicy}
                </p>
              </div>
            </div>

            {/* Actions Inside Dialog */}
            <div className="flex justify-end gap-2 pt-3 border-t">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setViewOpen(false)}
                  className="rounded-xl cursor-pointer"
                >
                  Close Preview
                </Button>
              </DialogClose>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => {
                  window.print();
                }}
                className="gap-1.5 rounded-xl shadow-sm cursor-pointer"
              >
                <Printer className="size-3.5" /> Print to PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Official Printable Document (Rendered only during window.print) */}
      {withPrintDocument && <OfficialBookingDocument request={request} />}
    </>
  );
}

/**
 * Dedicated authoritative A4 printable confirmation document.
 * Rendered strictly for window.print / PDF export without background page noise.
 */
export function OfficialBookingDocument({ request }: { request: ProviderRequest }) {
  const { appName, brandName, tagline, symbolLogoUrl } = useBranding();
  const platformName = appName || brandName || "ATLASWANDERS";
  const platformTagline = tagline || "Official Service Provider Booking Confirmation";

  const refCode = formatBookingRef(request.id, platformName);
  const tourDateFormatted = formatBookingDate(request.date);
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
  const cancellationPolicy =
    request.cancellationPolicy ||
    request.bookingSnapshot?.cancellationPolicy ||
    "Standard tour policy: Full refund up to 48 hours prior to start. Non-refundable thereafter.";

  const pricingModeDisplay =
    request.pricingMode ||
    request.bookingSnapshot?.pricingMode ||
    (request.pricingUnit ? `Per ${request.pricingUnit}` : "Agreed Tour Rate");

  const providerAgencyName =
    request.agencyName ||
    request.bookingSnapshot?.agencyName ||
    (request.kind === "hotel_booking" ? request.listingName : null) ||
    (request.kind === "restaurant_reservation" ? request.listingName : null) ||
    "Official Registered Provider";

  const assignedGuideName =
    request.tourGuideName ||
    request.specificGuide?.name ||
    request.bookingSnapshot?.specificGuide?.name ||
    "Licensed Tour Guide";

  return (
    <div className="hidden print:block official-print-document font-sans text-black">
      {/* Printable Header */}
      <div className="border-b-2 border-gray-900 pb-4 mb-5 flex justify-between items-start print-avoid-break">
        <div>
          <div className="flex items-center gap-2">
            {symbolLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={symbolLogoUrl}
                alt={platformName}
                className="size-7 object-contain shrink-0"
              />
            ) : (
              <Compass className="size-7 text-black stroke-[2.5]" />
            )}
            <h1 className="text-2xl font-black tracking-tight text-black">{platformName}</h1>
          </div>
          <p className="text-xs text-gray-700 font-semibold tracking-wide uppercase mt-1">
            Official Service Provider Booking Confirmation
          </p>
          <p className="text-[10px] text-gray-500">{platformTagline}</p>
        </div>
        <div className="text-right">
          <div className="inline-block border-2 border-gray-900 px-3 py-1 font-mono font-bold text-sm bg-gray-50">
            {refCode}
          </div>
          <p className="text-[11px] font-semibold text-gray-800 mt-1.5">Status: {request.status}</p>
          <p className="text-[10px] text-gray-500">Issued: {formatBookingDate(new Date())}</p>
        </div>
      </div>

      {/* Schedule & Customer Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-gray-300 p-4 rounded-md mb-5 bg-gray-50/50 print-avoid-break">
        <div className="min-w-0">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 border-b pb-1">
            Traveller Information
          </h2>
          <p className="text-sm font-bold text-black break-words [overflow-wrap:anywhere]">{request.customer.name}</p>
          <p className="text-xs text-gray-800 break-all [overflow-wrap:anywhere]">Email: {request.customer.email}</p>
          <p className="text-xs text-gray-800 break-words [overflow-wrap:anywhere]">
            Phone: {request.customer.phone ? request.customer.phone : "Not provided"}
          </p>
          <p className="text-xs font-semibold text-gray-900 mt-1">
            Travellers: {totalGuests} Total
            {adults !== undefined && children !== undefined ? ` (${adults} Adults, ${children} Children)` : ""}
          </p>
        </div>

        <div className="min-w-0">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 border-b pb-1">
            Tour Schedule & Pickup
          </h2>
          <p className="text-xs text-gray-800">
            <strong className="text-black">Tour Date:</strong> {tourDateFormatted}
          </p>
          <p className="text-xs text-gray-800">
            <strong className="text-black">Scheduled Start Time:</strong> {tourTimeFormatted} (IST)
          </p>
          <p className="text-xs text-gray-800">
            <strong className="text-black">Requested On:</strong> {createdDateFormatted}
          </p>
          <p className="text-xs text-gray-800 mt-1 break-words [overflow-wrap:anywhere]">
            <strong className="text-black">Pickup Location:</strong> {pickupName || "Designated Meeting Point"}
          </p>
          {pickupAddress && <p className="text-[11px] text-gray-600 break-words [overflow-wrap:anywhere]">{pickupAddress}</p>}
        </div>
      </div>

      {/* Service Provider & Guide Information */}
      <div className="border border-gray-300 p-4 rounded-md mb-5 bg-gray-50/50 print-avoid-break">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 border-b pb-1">
          Service Provider &amp; Guide Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-gray-500 text-[10px] uppercase font-bold">Service Provider / Agency</p>
            <p className="text-sm font-bold text-black mt-0.5">{providerAgencyName}</p>
          </div>
          <div>
            <p className="text-gray-500 text-[10px] uppercase font-bold">Tour Guide / Representative</p>
            <p className="text-sm font-semibold text-black mt-0.5">{assignedGuideName}</p>
          </div>
        </div>
      </div>

      {/* Service Package & Details */}
      <div className="border border-gray-300 p-4 rounded-md mb-5 print-avoid-break">
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 border-b pb-1">
          Selected Package / Service Details
        </h2>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-base font-bold text-black">{request.listingName}</p>
            <p className="text-xs text-gray-600">Pricing Basis: {pricingModeDisplay}</p>
          </div>
          {assignedGuideName && (
            <div className="text-right text-xs">
              <span className="text-gray-500 block">Assigned Guide:</span>
              <span className="font-semibold text-black">{assignedGuideName}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t text-xs">
          <div>
            <span className="font-semibold text-gray-700 block">Meals Configuration:</span>
            <span className="text-gray-900">{foodText || "Not included"}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700 block">Transport Arrangement:</span>
            <span className="text-gray-900">{transportText || "Self / Not included"}</span>
          </div>
          <div>
            <span className="font-semibold text-gray-700 block">Ticket Purchasing:</span>
            <span className="text-gray-900">
              {request.requestTicketAssistance ? "Assistance Requested" : "Standard Policy"}
            </span>
          </div>
        </div>

        {notes && (
          <div className="mt-3 pt-2 border-t text-xs">
            <span className="font-semibold text-gray-700 block">Traveller Special Request:</span>
            <p className="text-gray-800 italic mt-0.5">&ldquo;{notes}&rdquo;</p>
          </div>
        )}
      </div>

      {/* Ordered Itinerary Stops */}
      {places.length > 0 && (
        <div className="border border-gray-300 rounded-md mb-5 overflow-hidden print-avoid-break">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-gray-700">
              Confirmed Itinerary Stops ({places.length} Locations)
            </h2>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-300 bg-gray-50 text-[10px] uppercase text-gray-600 font-bold">
                <th className="py-2 px-3 w-10">#</th>
                <th className="py-2 px-3">Place / Destination</th>
                <th className="py-2 px-3">District / Category</th>
                <th className="py-2 px-3">Visit Arrangement</th>
                <th className="py-2 px-3 text-right">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {places.map((place, idx) => (
                <tr key={place.id || idx}>
                  <td className="py-2 px-3 font-bold text-gray-700">{idx + 1}</td>
                  <td className="py-2 px-3 font-semibold text-black">{place.name}</td>
                  <td className="py-2 px-3 text-gray-600">
                    {[place.district, place.category].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="py-2 px-3 text-gray-700">{place.visitArrangement || "Visit & Explore"}</td>
                  <td className="py-2 px-3 text-right text-gray-700">{place.duration || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Financial Terms & Truthful Payment Status */}
      <div className="border-2 border-gray-900 p-4 rounded-md mb-5 bg-gray-50 print-avoid-break">
        <div className="flex justify-between items-center mb-2 border-b border-gray-300 pb-2">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 block">
              Agreed Total Tour Amount
            </span>
            <span className="text-xl font-black text-black">
              {request.amount !== null ? formatCurrency(request.amount) : "As Agreed"}
            </span>
          </div>
          <div className="text-right">
            <span className="inline-block border border-gray-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase text-gray-800">
              {request.paymentStatus || "Direct Settlement"}
            </span>
            <p className="text-[10px] text-gray-600 mt-0.5">
              Direct settlement with Tour Guide / Unverified Platform Transaction
            </p>
          </div>
        </div>
        <p className="text-[10px] text-gray-600 leading-tight">
          <strong>Cancellation & Terms:</strong> {cancellationPolicy}
        </p>
      </div>

      {/* Official Document Footer */}
      <div className="pt-3 border-t border-gray-300 text-center text-[10px] text-gray-500 print-avoid-break">
        <p>
          This official confirmation was generated via {platformName} for booking reference {refCode}.
        </p>
        <p className="mt-0.5">
          Tour services are rendered in accordance with {platformName} standards and verified guide guidelines.
        </p>
      </div>
    </div>
  );
}

