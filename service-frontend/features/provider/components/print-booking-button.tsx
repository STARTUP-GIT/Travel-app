"use client";

import * as React from "react";
import { Printer, Compass, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ProviderRequest } from "@/features/provider/types";

export function PrintBookingButton({ request }: { request: ProviderRequest }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrint}
        className="rounded-xl gap-1.5 print:hidden"
      >
        <Printer className="size-4" /> Print Confirmation
      </Button>

      {/* Hidden container on screen, visible on print */}
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
            <p className="font-mono font-bold text-sm">REF #{request.id.slice(0, 8).toUpperCase()}</p>
            <p className="text-xs text-gray-500">Status: {request.status}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm border-b pb-4">
          <div>
            <span className="text-xs text-gray-500 block">Customer</span>
            <span className="font-semibold">{request.customer.name}</span>
            <span className="text-xs block text-gray-600">{request.customer.email}</span>
            {request.customer.phone && <span className="text-xs block text-gray-600">{request.customer.phone}</span>}
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
              {request.places.map((p) => (
                <span key={p.id} className="border px-2 py-1 rounded bg-gray-50 font-medium">
                  {p.name}
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
            <span>Online Payment: Marked as Coming Soon</span>
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 pt-4">
          Thank you for serving travellers on the Karnataka Tourism Guide platform.
        </div>
      </div>
    </>
  );
}
