"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  MapPin,
  Printer,
  ShieldCheck,
  Ticket,
  Users,
  Utensils,
  Car,
  X,
  AlertCircle,
  Loader2,
} from "lucide-react";
import Link from "next/link";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { createCommonGuideBooking } from "@/features/bookings/api/bookings.api";
import type { CommonGuideBooking } from "@/features/bookings/types";
import type { PackageWithContext } from "@/features/guides/types";
import { formatCurrency } from "@/lib/utils";

interface PackageBookingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pkg: PackageWithContext;
  districtId: string;
}

export function PackageBookingModal({
  open,
  onOpenChange,
  pkg,
  districtId,
}: PackageBookingModalProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Tomorrow's date formatted as YYYY-MM-DD
  const minDate = React.useMemo(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const [bookingDate, setBookingDate] = React.useState(minDate);
  const [bookingTime, setBookingTime] = React.useState(
    pkg.tripStartTime || "09:00 AM"
  );
  const [adults, setAdults] = React.useState(1);
  const [children, setChildren] = React.useState(0);

  // Selected places: All selected by default
  const [selectedPlaceIds, setSelectedPlaceIds] = React.useState<string[]>(() =>
    pkg.places.map((p) => p.id)
  );

  // Reset selected places when package opens
  React.useEffect(() => {
    if (open) {
      setSelectedPlaceIds(pkg.places.map((p) => p.id));
    }
  }, [open, pkg.places]);

  // Alternative pickup request state
  const [isRequestingPickup, setIsRequestingPickup] = React.useState(false);
  const [requestedPickupName, setRequestedPickupName] = React.useState("");
  const [requestedPickupAddress, setRequestedPickupAddress] = React.useState("");
  const [requestedPickupMapsUrl, setRequestedPickupMapsUrl] = React.useState("");

  const [submitting, setSubmitting] = React.useState(false);
  const [confirmedBooking, setConfirmedBooking] =
    React.useState<CommonGuideBooking | null>(null);

  const totalPeople = adults + children;
  const isWholeTour = (pkg.pricingMode || "WHOLE_TOUR") === "WHOLE_TOUR";
  const isPerPerson = (pkg.pricingUnit || "PER_TOUR") === "PER_PERSON";

  const childrenAllowed = pkg.childrenAllowed !== false;
  const maxChildren = pkg.maxChildren ?? 10;
  const maxCapacity = pkg.maxGroupSize ?? 50;
  const countsTowardCap = pkg.childrenCountTowardCapacity !== false;
  const currentCapacityCount = countsTowardCap ? (adults + children) : adults;

  // Calculate price transparently according to configured pricing rules
  const calculatedTotal = React.useMemo(() => {
    if (isWholeTour) {
      const base = pkg.price && pkg.price > 0 ? pkg.price : (pkg.guide.cost || 0);
      if (isPerPerson) {
        const adultRate = base;
        const childRate = pkg.childPrice !== null && pkg.childPrice !== undefined ? pkg.childPrice : base;
        return (adultRate * adults) + (childRate * children);
      }
      return base;
    } else {
      // Place based pricing
      const placeSum = selectedPlaceIds.reduce((sum, pid) => {
        const pl = pkg.places.find((p) => p.id === pid);
        return sum + (pl?.price ?? 0);
      }, 0);
      if (isPerPerson) {
        const childRate = pkg.childPrice !== null && pkg.childPrice !== undefined
          ? (pkg.childPrice * selectedPlaceIds.length)
          : placeSum;
        return (placeSum * adults) + (childRate * children);
      }
      return placeSum;
    }
  }, [isWholeTour, isPerPerson, pkg.price, pkg.guide.cost, pkg.childPrice, adults, children, selectedPlaceIds, pkg.places]);

  const canDeselectPlaces = pkg.allowCustomerPlaceSelection !== false;

  function togglePlace(placeId: string) {
    if (!canDeselectPlaces) {
      toast.info("This package requires completing all scheduled stops together.");
      return;
    }
    if (selectedPlaceIds.includes(placeId)) {
      if (selectedPlaceIds.length <= 1) {
        toast.error("At least one place must remain selected.");
        return;
      }
      setSelectedPlaceIds(selectedPlaceIds.filter((id) => id !== placeId));
    } else {
      setSelectedPlaceIds([...selectedPlaceIds, placeId]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error("Please sign in to book this tour package");
      onOpenChange(false);
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    if (!bookingDate) {
      toast.error("Please select a tour date");
      return;
    }

    if (totalPeople < 1) {
      toast.error("Total travellers must be at least 1");
      return;
    }

    if (!childrenAllowed && children > 0) {
      toast.error("Children are not permitted on this package");
      return;
    }

    if (childrenAllowed && pkg.maxChildren && children > pkg.maxChildren) {
      toast.error(`Maximum ${pkg.maxChildren} children allowed per booking`);
      return;
    }

    if (pkg.maxGroupSize && currentCapacityCount > pkg.maxGroupSize) {
      toast.error(`Maximum group size of ${pkg.maxGroupSize} exceeded`);
      return;
    }

    if (selectedPlaceIds.length === 0) {
      toast.error("At least one place must be selected");
      return;
    }

    setSubmitting(true);
    try {
      const booking = await createCommonGuideBooking({
        commonGuideId: pkg.guide.id,
        packageId: pkg.id,
        placeIds: selectedPlaceIds,
        bookingDate,
        bookingTime,
        tripStartTime: bookingTime,
        numberOfPeople: totalPeople,
        numberOfAdults: adults,
        numberOfChildren: children,
        pricingMode: pkg.pricingMode || "WHOLE_TOUR",
        pricingUnit: pkg.pricingUnit || "PER_TOUR",
        totalPrice: Math.round(calculatedTotal),
        pickupName: pkg.pickupName || undefined,
        pickupAddress: pkg.pickupAddress || undefined,
        pickupMapsUrl: pkg.pickupMapsUrl || undefined,
        requestedPickupName: isRequestingPickup ? requestedPickupName : undefined,
        requestedPickupAddress: isRequestingPickup ? requestedPickupAddress : undefined,
        requestedPickupMapsUrl: isRequestingPickup ? requestedPickupMapsUrl : undefined,
      });

      setConfirmedBooking(booking);
      toast.success("Tour Package Booked Successfully!", {
        description: `Your booking with ${pkg.guide.agencyName || pkg.guide.full_name} has been submitted.`,
      });
    } catch (err: any) {
      console.error("Package booking error:", err);
      toast.error(err?.message || "Failed to create booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const pickupMapsLink = pkg.pickupMapsUrl
    ? pkg.pickupMapsUrl
    : pkg.pickupAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pkg.pickupAddress)}`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl p-6 rounded-3xl">
        {confirmedBooking ? (
          <div className="space-y-6 py-4">
            <div className="text-center space-y-2">
              <div className="inline-flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mb-2">
                <CheckCircle2 className="size-10" />
              </div>
              <DialogTitle className="text-2xl font-bold">Booking Confirmed!</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Your tour package request has been sent to {pkg.guide.agencyName || pkg.guide.full_name}.
              </DialogDescription>
            </div>

            {/* Confirmed Booking Summary Card */}
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <span className="text-xs text-muted-foreground font-mono">
                  REF #{confirmedBooking.id?.slice(-8).toUpperCase()}
                </span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300">
                  {confirmedBooking.status || "CONFIRMED"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Package</span>
                  <span className="font-semibold text-foreground">{pkg.name}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Guide / Agency</span>
                  <span className="font-semibold text-foreground">
                    {pkg.guide.agencyName || pkg.guide.full_name}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Date & Time</span>
                  <span className="font-semibold text-foreground">
                    {bookingDate} at {bookingTime}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Travellers</span>
                  <span className="font-semibold text-foreground">
                    {totalPeople} ({adults} Adult{adults > 1 ? "s" : ""}, {children} Child{children !== 1 ? "ren" : ""})
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Total Quoted Price</span>
                  <span className="font-bold text-primary text-base">
                    {formatCurrency(confirmedBooking.totalPrice || calculatedTotal)}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Selected Stops</span>
                  <span className="font-semibold text-foreground">
                    {selectedPlaceIds.length} place{selectedPlaceIds.length > 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Pickup information in confirmation */}
              <div className="rounded-xl bg-muted/50 p-3 text-xs space-y-1">
                <span className="font-semibold block text-foreground">Meeting & Pickup Location:</span>
                {isRequestingPickup && requestedPickupName ? (
                  <p className="text-muted-foreground">
                    Custom requested: <span className="font-medium text-foreground">{requestedPickupName}</span>
                    {requestedPickupAddress && ` (${requestedPickupAddress})`}
                  </p>
                ) : pkg.pickupName || pkg.pickupAddress ? (
                  <p className="text-muted-foreground">
                    {pkg.pickupName && <span className="font-medium text-foreground">{pkg.pickupName}: </span>}
                    {pkg.pickupAddress}
                  </p>
                ) : (
                  <p className="text-muted-foreground">Guide will contact you with exact meeting point.</p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => {
                  window.print();
                }}
              >
                <Printer className="size-4 mr-2" /> Print Confirmation
              </Button>
              <Button
                asChild
                variant="action"
                className="flex-1 rounded-xl"
              >
                <Link href="/bookings">
                  View All My Bookings
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <DialogHeader className="text-left space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="info" className="text-xs">
                  Tour Package
                </Badge>
                {pkg.guide.agencyName && (
                  <span className="text-xs font-medium text-muted-foreground">
                    {pkg.guide.agencyName}
                  </span>
                )}
              </div>
              <DialogTitle className="text-xl font-bold tracking-tight">
                Book {pkg.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Led by {pkg.guide.full_name} · {pkg.places.length} stops included
              </DialogDescription>
            </DialogHeader>

            {/* 1. Date & Time Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <CalendarIcon className="size-4 text-primary" />
                Select Date & Start Time
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">Tour Date</span>
                  <Input
                    type="date"
                    min={minDate}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    required
                    className="rounded-xl bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-xs text-muted-foreground">Trip Start Time</span>
                  <Input
                    type="text"
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    placeholder="e.g. 09:00 AM"
                    className="rounded-xl bg-background"
                  />
                </div>
              </div>
            </div>

            {/* 2. Number of Travellers (Adults & Children) */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <Users className="size-4 text-primary" />
                Number of Travellers
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border bg-card p-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold block">Adults</span>
                    <span className="text-xs text-muted-foreground">Age {pkg.childMaxAge ? `${pkg.childMaxAge}+` : "12+"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="size-8 rounded-full p-0"
                      disabled={adults <= 1}
                      onClick={() => setAdults(Math.max(1, adults - 1))}
                    >
                      -
                    </Button>
                    <span className="w-6 text-center font-bold text-sm">{adults}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="size-8 rounded-full p-0"
                      disabled={currentCapacityCount >= maxCapacity}
                      onClick={() => setAdults(adults + 1)}
                    >
                      +
                    </Button>
                  </div>
                </div>

                {childrenAllowed ? (
                  <div className="rounded-2xl border border-border bg-card p-3 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold block">Children</span>
                      <span className="text-xs text-muted-foreground">
                        Under {pkg.childMaxAge || 12} yrs {pkg.childPrice && pkg.childPrice > 0 ? `(₹${pkg.childPrice})` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="size-8 rounded-full p-0"
                        disabled={children <= 0}
                        onClick={() => setChildren(Math.max(0, children - 1))}
                      >
                        -
                      </Button>
                      <span className="w-6 text-center font-bold text-sm">{children}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="size-8 rounded-full p-0"
                        disabled={children >= maxChildren || currentCapacityCount >= maxCapacity}
                        onClick={() => setChildren(children + 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 p-3 flex flex-col justify-center">
                    <span className="text-xs font-semibold text-muted-foreground block">Children: Not Permitted</span>
                    <span className="text-[0.65rem] text-muted-foreground">Adults-only tour configured by guide.</span>
                  </div>
                )}
              </div>
              {pkg.maxGroupSize ? (
                <p className="text-[0.7rem] text-muted-foreground">
                  Tour capacity: Max {pkg.maxGroupSize} guests
                  {pkg.childrenCountTowardCapacity === false ? " (Children don't count toward limit)" : " (Total passengers)"}
                </p>
              ) : null}
            </div>

            {/* 3. Included Itinerary Places */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <MapPin className="size-4 text-primary" />
                  Tour Stops ({selectedPlaceIds.length}/{pkg.places.length} selected)
                </Label>
                {!canDeselectPlaces ? (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Full tour package required
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Customize stops if desired
                  </span>
                )}
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {pkg.places.map((place, idx) => {
                  const isSelected = selectedPlaceIds.includes(place.id);
                  return (
                    <div
                      key={place.id}
                      onClick={() => togglePlace(place.id)}
                      className={`flex items-center justify-between rounded-xl border p-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary/40 bg-primary/5"
                          : "border-border bg-card opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{place.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {place.districtName} {place.entryfee ? `· Entry ${formatCurrency(place.entryfee)}` : ""}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`size-5 rounded-md flex items-center justify-center border transition-colors ${
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-border bg-background"
                        }`}
                      >
                        {isSelected && <Check className="size-3.5" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. Pickup Location & Alternative Request */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                Pickup & Meeting Point
              </Label>
              <div className="rounded-2xl border border-border bg-card p-3 space-y-2 text-xs">
                {pkg.pickupName || pkg.pickupAddress ? (
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {pkg.pickupName && (
                        <p className="font-semibold text-foreground text-sm">{pkg.pickupName}</p>
                      )}
                      {pkg.pickupAddress && (
                        <p className="text-muted-foreground">{pkg.pickupAddress}</p>
                      )}
                    </div>
                    {pickupMapsLink && (
                      <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary shrink-0">
                        <a href={pickupMapsLink} target="_blank" rel="noopener noreferrer">
                          Maps <ExternalLink className="size-3 ml-1" />
                        </a>
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    Standard meeting point in central district. Your guide will provide coordinates before start.
                  </p>
                )}

                <div className="pt-2 border-t border-border">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={isRequestingPickup}
                      onChange={(e) => setIsRequestingPickup(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                    Request alternative pickup point (Hotel / Airport / Station)
                  </label>

                  {isRequestingPickup && (
                    <div className="mt-2 space-y-2 pt-1 pl-5">
                      <Input
                        placeholder="Pickup location name (e.g. Grand Palace Hotel)"
                        value={requestedPickupName}
                        onChange={(e) => setRequestedPickupName(e.target.value)}
                        className="h-8 text-xs rounded-lg"
                      />
                      <Input
                        placeholder="Pickup address details"
                        value={requestedPickupAddress}
                        onChange={(e) => setRequestedPickupAddress(e.target.value)}
                        className="h-8 text-xs rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 5. Inclusions Disclosures */}
            <div className="rounded-2xl border border-border bg-muted/30 p-3 space-y-2 text-xs">
              <span className="font-semibold text-foreground block">Tour Package Inclusions:</span>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-card p-2 border border-border">
                  <span className="text-muted-foreground block text-[10px]">Meals</span>
                  <span className="font-medium text-foreground">
                    {pkg.foodStatus === "INCLUDED" ? "Included" : "Pay Separately"}
                  </span>
                </div>
                <div className="rounded-lg bg-card p-2 border border-border">
                  <span className="text-muted-foreground block text-[10px]">Transport</span>
                  <span className="font-medium text-foreground">
                    {pkg.transportStatus === "INCLUDED" ? "Included" : "Pay Separately"}
                  </span>
                </div>
                <div className="rounded-lg bg-card p-2 border border-border">
                  <span className="text-muted-foreground block text-[10px]">Entry Tickets</span>
                  <span className="font-medium text-foreground">
                    {pkg.entryFeeStatus === "INCLUDED" ? "Included" : "Pay at Gate"}
                  </span>
                </div>
              </div>
            </div>

            {/* 6. Transparent Price Breakdown */}
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Pricing Model</span>
                <span className="font-medium text-foreground">
                  {isWholeTour ? "Whole Tour Flat Rate" : "Place-based rate"} (
                  {isPerPerson ? "Per Person" : "Per Group"})
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Base Tour Package</span>
                <span className="font-medium text-foreground">
                  {formatCurrency(pkg.price && pkg.price > 0 ? pkg.price : pkg.guide.cost)}
                </span>
              </div>
              {isPerPerson && totalPeople > 1 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Traveller Multiplier ({totalPeople} people)</span>
                  <span className="font-medium text-foreground">× {totalPeople}</span>
                </div>
              )}
              <div className="border-t border-border pt-2 flex items-center justify-between">
                <div>
                  <span className="font-bold text-base text-foreground block">
                    Estimated Total
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    No upfront card charge · Confirmed directly with guide
                  </span>
                </div>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(calculatedTotal)}
                </span>
              </div>
            </div>

            {/* Terms note */}
            <p className="text-[11px] text-muted-foreground text-center">
              {pkg.cancellationPolicy || "Free cancellation up to 24 hours before tour start."}
            </p>

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                variant="action"
                disabled={submitting || authLoading}
                className="w-full rounded-2xl py-6 text-base font-semibold shadow-lg"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-5 mr-2 animate-spin" />
                    Submitting Booking…
                  </>
                ) : (
                  `Confirm Booking — ${formatCurrency(calculatedTotal)}`
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
