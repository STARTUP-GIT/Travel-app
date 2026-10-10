"use client";

import * as React from "react";
import { Printer, Compass, Eye, MapPin, Calendar, Clock, Users, ShieldCheck, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ProviderRequest } from "@/features/provider/types";

export function PrintBookingButton({ request }: { request: ProviderRequest }) {
  const [viewOpen, setViewOpen] = React.useState(false);

  const handlePrint = () => {
    window.print();
  };

  const refCode = `KTG-${request.id.slice(0, 8).toUpperCase()}`;

  return (
    <>
      <div className="flex items-center gap-2 print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setViewOpen(true)}
          className="rounded-xl gap-1.5 text-xs font-semibold"
        >
          <Eye className="size-3.5 text-primary" /> View Confirmation
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={handlePrint}
          className="rounded-xl gap-1.5 text-xs font-semibold"
        >
          <Printer className="size-3.5" /> Print Confirmation
        </Button>
      </div>

      {/* On-screen Readable Confirmation Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto p-6 rounded-3xl">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-primary font-bold text-lg">
                <Compass className="size-5" />
                <span>Karnataka Tourism Guide</span>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                {refCode}
              </Badge>
            </div>
            <DialogTitle className="text-base font-bold text-foreground mt-2">
              Authoritative Booking Confirmation
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Review saved customer and itinerary details before printing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Status and Ref Banner */}
            <div className="flex items-center justify-between rounded-xl bg-muted/40 p-3 border">
              <div>
                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground block font-bold">
                  Status
                </span>
                <span className="font-bold text-sm text-foreground">{request.status}</span>
              </div>
              <div className="text-right">
                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground block font-bold">
                  Booking Date
                </span>
                <span className="font-semibold text-foreground">{formatDate(request.date)}</span>
              </div>
            </div>

            {/* Customer & Service Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border p-4 bg-card">
              <div className="space-y-1">
                <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-bold">
                  Traveller Details
                </p>
                <p className="font-bold text-sm text-foreground">{request.customer.name}</p>
                <p className="text-muted-foreground">{request.customer.email}</p>
                {request.customer.phone && <p className="text-muted-foreground">{request.customer.phone}</p>}
                {request.guests && (
                  <p className="text-primary font-semibold pt-1 flex items-center gap-1">
                    <Users className="size-3" /> {request.guests} Travellers
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-bold">
                  Package / Experience
                </p>
                <p className="font-bold text-sm text-foreground">{request.listingName}</p>
                {request.time && (
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3" /> Scheduled Start: {request.time}
                  </p>
                )}
              </div>
            </div>

            {/* Places Breakdown */}
            {request.places && request.places.length > 0 && (
              <div className="rounded-xl border p-4 space-y-2">
                <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-primary" /> Included Places ({request.places.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {request.places.map((place, idx) => (
                    <Badge key={place.id} variant="outline" className="text-xs">
                      {idx + 1}. {place.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Financial Breakdown */}
            <div className="rounded-xl border p-4 bg-primary/5 border-primary/20 flex items-center justify-between">
              <div>
                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-bold block">
                  Agreed Total Amount
                </span>
                <span className="text-lg font-bold text-primary">
                  {request.amount !== null ? formatCurrency(request.amount) : "Pricing on confirmation"}
                </span>
              </div>
              <div className="text-right text-[0.7rem] text-muted-foreground">
                <p>Payment: Direct to Guide</p>
                <p className="text-[0.65rem]">Official platform booking snapshot</p>
              </div>
            </div>

            {/* Actions Inside Dialog */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setViewOpen(false)}>
                Close Preview
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => {
                  setViewOpen(false);
                  setTimeout(() => window.print(), 150);
                }}
                className="gap-1.5"
              >
                <Printer className="size-3.5" /> Print to PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clean Print Layout for Browser Printing */}
      <div className="hidden print:block fixed inset-0 bg-white p-8 z-50 text-black space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <Compass className="size-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Karnataka Tourism Guide</h1>
              <p className="text-xs text-gray-500">Service Provider Official Booking Confirmation</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono font-bold text-sm">{refCode}</p>
            <p className="text-xs text-gray-500">Status: {request.status}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm border-b pb-4">
          <div>
            <span className="text-xs text-gray-500 block">Customer</span>
            <span className="font-semibold">{request.customer.name}</span>
            <span className="text-xs block text-gray-600">{request.customer.email}</span>
            {request.customer.phone && <span className="text-xs block text-gray-600">{request.customer.phone}</span>}
            {request.guests && <span className="text-xs block text-gray-600">Travellers: {request.guests}</span>}
          </div>
          <div>
            <span className="text-xs text-gray-500 block">Listing / Package</span>
            <span className="font-semibold">{request.listingName}</span>
            <span className="text-xs block text-gray-600">Date: {formatDate(request.date)}</span>
            {request.time && <span className="text-xs block text-gray-600">Time: {request.time}</span>}
          </div>
        </div>

        {request.places && request.places.length > 0 && (
          <div className="border-b pb-4">
            <span className="text-xs text-gray-500 block mb-1">Scheduled Places / Stops:</span>
            <div className="flex flex-wrap gap-2 text-xs">
              {request.places.map((p, idx) => (
                <span key={p.id} className="border px-2 py-1 rounded bg-gray-50 font-medium">
                  {idx + 1}. {p.name}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <span className="text-xs text-gray-500 block">Total Quoted Value</span>
            <span className="text-lg font-bold">
              {request.amount !== null ? formatCurrency(request.amount) : "N/A"}
            </span>
          </div>
          <div className="text-right text-xs text-gray-500">
            <span>Payment Method: Direct Settlement</span>
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 pt-4">
          Official booking confirmation snapshot issued via Karnataka Tourism Guide.
        </div>
      </div>
    </>
  );
}
