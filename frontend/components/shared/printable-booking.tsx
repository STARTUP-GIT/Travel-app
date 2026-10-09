"use client";

import * as React from "react";
import { Printer, X, Compass, MapPin, Calendar, Clock, Users, Building2, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

export type PrintableBookingData = {
  id: string;
  type: "specific" | "common" | "hotel" | "restaurant";
  status: string;
  createdAt: string;
  guideOrAgencyName: string;
  agencyName?: string | null;
  agencyAddress?: string | null;
  agencyBanner?: string | null;
  guideName?: string;
  guidePhone?: string;
  guideEmail?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  packageName?: string;
  places: { id: string; name: string; districtName?: string }[];
  numberOfPeople: number;
  bookingDate: string;
  bookingTime?: string | null;
  pickupName?: string | null;
  pickupAddress?: string | null;
  requestedPickupName?: string | null;
  requestedPickupAddress?: string | null;
  pricingMode?: string;
  pricingUnit?: string;
  totalPrice: number;
  cancellationPolicy?: string | null;
  foodStatus?: string | null;
  foodDetails?: string | null;
  transportStatus?: string | null;
  transportDetails?: string | null;
  entryFeeStatus?: string | null;
  entryFeeDetails?: string | null;
  additionalCostsDetails?: string | null;
  paymentStatus?: string;
};

export function PrintableBookingModal({
  open,
  onOpenChange,
  booking,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: PrintableBookingData | null;
}) {
  if (!booking) return null;

  const handlePrint = () => {
    window.print();
  };

  const refCode = `KTG-${booking.id.slice(0, 8).toUpperCase()}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 sm:rounded-3xl">
        {/* Screen Header Controls (Hidden on Print) */}
        <div className="flex items-center justify-between border-b p-4 print:hidden bg-muted/30">
          <DialogTitle className="text-base font-semibold">
            Booking Confirmation Details
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="action" size="sm" onClick={handlePrint} className="gap-1.5 rounded-xl">
              <Printer className="size-4" /> Print Booking
            </Button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div className="p-6 sm:p-8 space-y-6 print:p-0 print:space-y-4" id="printable-booking-content">
          {/* Header & Branding */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-5 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-primary font-bold text-xl">
                <Compass className="size-6 text-primary" />
                <span>Karnataka Tourism Guide</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Official Tour Booking Confirmation & Cost Breakdown
              </p>
            </div>
            <div className="text-left sm:text-right space-y-1">
              <p className="font-mono text-sm font-bold text-foreground">{refCode}</p>
              <p className="text-xs text-muted-foreground">
                Booked: {new Date(booking.createdAt).toLocaleDateString()}
              </p>
              <span className="inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
                Status: {booking.status}
              </span>
            </div>
          </div>

          {/* Agency Banner if present */}
          {booking.agencyBanner ? (
            <div className="relative h-32 w-full overflow-hidden rounded-2xl border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={booking.agencyBanner}
                alt={booking.agencyName ?? "Agency Banner"}
                className="size-full object-cover"
              />
            </div>
          ) : null}

          {/* Guide & Agency Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border p-4 bg-card/50">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Service Provider
              </p>
              {booking.agencyName ? (
                <p className="font-bold text-base flex items-center gap-1.5">
                  <Building2 className="size-4 text-primary" />
                  {booking.agencyName}
                </p>
              ) : null}
              <p className="text-sm font-semibold text-foreground">
                Guide: {booking.guideName || booking.guideOrAgencyName}
              </p>
              {booking.agencyAddress ? (
                <p className="text-xs text-muted-foreground">{booking.agencyAddress}</p>
              ) : null}
              {booking.guidePhone ? (
                <p className="text-xs text-muted-foreground">Phone: {booking.guidePhone}</p>
              ) : null}
            </div>

            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                Traveller Details
              </p>
              <p className="text-sm font-semibold text-foreground">
                {booking.customerName || "Customer"}
              </p>
              {booking.customerPhone ? (
                <p className="text-xs text-muted-foreground">Phone: {booking.customerPhone}</p>
              ) : null}
              {booking.customerEmail ? (
                <p className="text-xs text-muted-foreground">Email: {booking.customerEmail}</p>
              ) : null}
            </div>
          </div>

          {/* Tour Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold border-b pb-1">Tour & Itinerary Details</h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border p-3 bg-muted/20">
                <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">Date</p>
                <p className="text-sm font-bold flex items-center gap-1 mt-0.5">
                  <Calendar className="size-3.5 text-primary" />
                  {booking.bookingDate}
                </p>
              </div>

              <div className="rounded-xl border p-3 bg-muted/20">
                <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">Start Time</p>
                <p className="text-sm font-bold flex items-center gap-1 mt-0.5">
                  <Clock className="size-3.5 text-primary" />
                  {booking.bookingTime || "09:00 AM"}
                </p>
              </div>

              <div className="rounded-xl border p-3 bg-muted/20">
                <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">Travellers</p>
                <p className="text-sm font-bold flex items-center gap-1 mt-0.5">
                  <Users className="size-3.5 text-primary" />
                  {booking.numberOfPeople} person{booking.numberOfPeople > 1 ? "s" : ""}
                </p>
              </div>

              <div className="rounded-xl border p-3 bg-muted/20">
                <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">Pricing Mode</p>
                <p className="text-sm font-bold flex items-center gap-1 mt-0.5">
                  <Ticket className="size-3.5 text-primary" />
                  {booking.pricingMode === "PLACE_BASED" ? "Place Based" : "Whole Tour"}
                </p>
              </div>
            </div>

            {/* Pickup Point */}
            {(booking.pickupName || booking.requestedPickupName) ? (
              <div className="rounded-xl border p-3 bg-card space-y-1">
                <p className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <MapPin className="size-3.5 text-primary" /> Meeting / Pickup Point
                </p>
                <p className="text-xs text-muted-foreground">
                  {booking.requestedPickupName
                    ? `Requested: ${booking.requestedPickupName} (${booking.requestedPickupAddress || ""})`
                    : `${booking.pickupName || "Agreed Pickup"} ${booking.pickupAddress ? `— ${booking.pickupAddress}` : ""}`}
                </p>
              </div>
            ) : null}

            {/* Places Included */}
            {booking.places.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Places Included in Tour:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {booking.places.map((place) => (
                    <div key={place.id} className="flex items-center gap-2 rounded-xl border p-2.5 text-xs bg-muted/30">
                      <MapPin className="size-3.5 text-primary shrink-0" />
                      <span className="font-semibold text-foreground truncate">{place.name}</span>
                      {place.districtName ? (
                        <span className="text-muted-foreground text-[0.65rem] ml-auto">{place.districtName}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* Facilities & Disclosures */}
          <div className="space-y-3 border-t pt-4">
            <h3 className="text-sm font-bold">Included & Excluded Facilities</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl border p-3 bg-card">
                <p className="font-semibold text-foreground">Food & Meals</p>
                <p className="text-muted-foreground capitalize mt-0.5">{booking.foodStatus || "Excluded"}</p>
                {booking.foodDetails ? <p className="text-[0.7rem] text-muted-foreground/80 mt-1">{booking.foodDetails}</p> : null}
              </div>

              <div className="rounded-xl border p-3 bg-card">
                <p className="font-semibold text-foreground">Transport</p>
                <p className="text-muted-foreground capitalize mt-0.5">{booking.transportStatus || "Excluded"}</p>
                {booking.transportDetails ? <p className="text-[0.7rem] text-muted-foreground/80 mt-1">{booking.transportDetails}</p> : null}
              </div>

              <div className="rounded-xl border p-3 bg-card">
                <p className="font-semibold text-foreground">Entry Fees</p>
                <p className="text-muted-foreground capitalize mt-0.5">{booking.entryFeeStatus || "Excluded"}</p>
                {booking.entryFeeDetails ? <p className="text-[0.7rem] text-muted-foreground/80 mt-1">{booking.entryFeeDetails}</p> : null}
              </div>
            </div>
            {booking.cancellationPolicy ? (
              <p className="text-xs text-muted-foreground rounded-xl border p-2.5 bg-muted/20">
                <span className="font-semibold text-foreground">Cancellation Policy:</span> {booking.cancellationPolicy}
              </p>
            ) : null}
          </div>

          {/* Pricing & Total */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex items-center justify-between text-base font-bold">
              <span>Total Estimated Amount</span>
              <span className="text-xl text-primary">{formatCurrency(booking.totalPrice)}</span>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border p-3.5 bg-muted/40 text-xs">
              <div className="space-y-0.5">
                <p className="font-semibold text-foreground">Payment Status</p>
                <p className="text-muted-foreground">
                  {booking.paymentStatus === "PRIVATELY_ARRANGED"
                    ? "Payment arranged privately with guide"
                    : "Payment status not verified"}
                </p>
              </div>

              {/* Online Payment Placeholder */}
              <Button disabled variant="secondary" className="rounded-xl text-xs gap-1.5 cursor-not-allowed">
                Pay Online — Coming Soon
              </Button>
            </div>
          </div>

          {/* Footer Terms */}
          <div className="border-t pt-4 text-center text-[0.7rem] text-muted-foreground space-y-1">
            <p>Thank you for choosing Karnataka Tourism Guide platform!</p>
            <p>Please present this document to your guide at the meeting point.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
