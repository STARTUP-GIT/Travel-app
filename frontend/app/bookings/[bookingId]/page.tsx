"use client";

import * as React from "react";
import {
  Calendar,
  Clock,
  Compass,
  MapPin,
  Users,
  Building2,
  Ticket,
  Printer,
  Eye,
  ChevronLeft,
  Utensils,
  Car,
  ExternalLink,
  ShieldCheck,
  FileText,
  AlertCircle,
  Phone,
  Mail,
  Award,
  Languages,
} from "lucide-react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";

import { AuthGate } from "@/components/shared/auth-gate";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ErrorState } from "@/components/shared/states";
import { PrintableBookingModal, type PrintableBookingData } from "@/components/shared/printable-booking";
import { getBookingById } from "@/features/bookings/api/bookings.api";
import type { BookingDetailResponse } from "@/features/bookings/types";
import { formatCurrency, formatBookingDate } from "@/lib/utils";

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = React.use(params);
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<BookingDetailResponse | null>(null);
  const [openConfirmation, setOpenConfirmation] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    getBookingById(bookingId)
      .then((res) => {
        if (active) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load booking details. It may not exist or you may not be authorized."
          );
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [bookingId]);

  if (loading) {
    return (
      <AuthGate title="Sign in to view booking" description="Access your confirmed booking details">
        <div className="app-container py-6 max-w-4xl mx-auto space-y-6">
          <div className="h-6 w-36 rounded-lg bg-muted animate-pulse" />
          <div className="card-surface p-6 rounded-3xl space-y-4 animate-pulse">
            <div className="h-8 w-64 rounded-xl bg-muted" />
            <div className="h-4 w-48 rounded-lg bg-muted" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-2xl bg-muted" />
              ))}
            </div>
          </div>
          <div className="card-surface p-6 rounded-3xl space-y-3 animate-pulse">
            <div className="h-6 w-40 rounded-lg bg-muted" />
            <div className="h-24 w-full rounded-2xl bg-muted" />
          </div>
        </div>
      </AuthGate>
    );
  }

  if (error || !data) {
    return (
      <AuthGate title="Sign in to view booking" description="Access your confirmed booking details">
        <div className="app-container py-6 max-w-4xl mx-auto space-y-4">
          <Link
            href="/bookings"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ChevronLeft className="size-4" /> Back to My Bookings
          </Link>
          <ErrorState
            title="Booking not found"
            description={error || "We couldn't locate this booking or you don't have permission to view it."}
          />
        </div>
      </AuthGate>
    );
  }

  const { type, booking } = data;
  const refCode = `KTG-${booking.id.slice(0, 8).toUpperCase()}`;

  // Extract snapshot priority data when available
  const snapshot = (booking as any).bookingSnapshot;
  const tourDateFormatted = (booking as any).bookingDate
    ? formatBookingDate((booking as any).bookingDate)
    : (booking as any).reservationDate
    ? formatBookingDate((booking as any).reservationDate)
    : (booking as any).checkIn
    ? `${formatBookingDate((booking as any).checkIn)} → ${formatBookingDate((booking as any).checkOut)}`
    : "—";

  const tourTimeFormatted =
    (booking as any).reservationTime ||
    (booking as any).tripStartTime ||
    (booking as any).bookingTime ||
    snapshot?.reservationTime ||
    snapshot?.tripStartTime ||
    "—";

  const totalTravellers =
    (booking as any).numberOfPeople ??
    (booking as any).guests ??
    snapshot?.totalTravellers ??
    1;

  const adults = (booking as any).numberOfAdults ?? snapshot?.adultsCount;
  const children = (booking as any).numberOfChildren ?? snapshot?.childrenCount;

  const pricingModeDisplay =
    snapshot?.pricingMode === "PLACE_BASED"
      ? "Place-based pricing"
      : (booking as any).pricingMode === "PLACE_BASED"
      ? "Place-based pricing"
      : "Whole Tour Flat Rate";

  const pricingUnitDisplay =
    snapshot?.pricingUnit === "PER_PERSON"
      ? "Per Person"
      : (booking as any).pricingUnit === "PER_PERSON"
      ? "Per Person"
      : "Per Group / Tour";

  const totalAmount =
    (booking as any).totalPrice ??
    (booking as any).totalAmount ??
    snapshot?.calculatedTotalPrice ??
    0;

  const paymentStatus =
    (booking as any).paymentStatus || "Direct Settlement with Guide / Not Verified";

  // Provider and agency details
  const guideOrAgencyName =
    (booking as any).commonGuide?.agencyName ||
    (booking as any).commonGuide?.full_name ||
    (booking as any).specificGuide?.full_name ||
    (booking as any).hotel?.name ||
    (booking as any).restaurent?.name ||
    "Service Provider";

  const agencyName = (booking as any).commonGuide?.agencyName;
  const agencyAddress = (booking as any).commonGuide?.agencyAddress;
  const agencyBanner = (booking as any).commonGuide?.agencyBanner;
  const agencyMapsUrl = (booking as any).commonGuide?.agencyMapsUrl;

  const leadGuide = (booking as any).commonGuide || (booking as any).specificGuide;
  const specificGuide = (booking as any).specificGuide;

  // Pickup details
  const pickupName =
    (booking as any).requestedPickupName ||
    (booking as any).pickupName ||
    snapshot?.pickupName;
  const pickupAddress =
    (booking as any).requestedPickupAddress ||
    (booking as any).pickupAddress ||
    snapshot?.pickupAddress;
  const pickupMapsUrl =
    (booking as any).requestedPickupMapsUrl ||
    (booking as any).pickupMapsUrl ||
    snapshot?.pickupMapsUrl;

  // Cancellation terms
  const cancellationPolicy =
    snapshot?.cancellationPolicy ||
    (booking as any).cancellationPolicy ||
    "Free cancellation up to 24 hours prior to tour start. Standard platform booking terms apply.";

  // Customer notes
  const customerNotes = snapshot?.notes || (booking as any).notes;

  // Itinerary stops
  const places: any[] =
    snapshot?.places?.length > 0
      ? snapshot.places
      : (booking as any).selectedPlaces?.map((sp: any) => ({
          id: sp.place?.id || sp.id,
          name: sp.place?.name || "Tour Destination",
          district: sp.place?.district?.name,
          visitArrangement: "GUIDED",
        })) ||
        ((booking as any).place
          ? [
              {
                id: (booking as any).place.id,
                name: (booking as any).place.name,
                district: (booking as any).place.district?.name,
                visitArrangement: "Specialist Guide Tour",
              },
            ]
          : []);

  // Customer profile info from booking or session
  const customerName = (booking as any).user?.name || "Customer";
  const customerEmail = (booking as any).user?.email || "—";
  const customerPhone = (booking as any).user?.phonenumber || "Not provided";

  // Construct PrintableBookingData for the separated confirmation modal
  const printableData: PrintableBookingData = {
    id: booking.id,
    type: type as any,
    status: booking.status,
    createdAt: (booking as any).createdAt || new Date().toISOString(),
    guideOrAgencyName,
    agencyName,
    agencyAddress,
    agencyBanner,
    guideName: leadGuide?.full_name,
    guidePhone: leadGuide?.phonenumber,
    guideEmail: leadGuide?.email,
    customerName,
    customerEmail,
    customerPhone,
    packageName: snapshot?.packageName || (booking as any).package?.name,
    places: places.map((p) => ({
      id: p.id,
      name: p.name,
      districtName: p.district,
    })),
    numberOfPeople: totalTravellers,
    numberOfAdults: adults,
    numberOfChildren: children,
    specificGuideName: specificGuide?.full_name,
    specificGuidePhone: specificGuide?.phonenumber,
    specificGuideStatus: (booking as any).specificGuideStatus,
    bookingDate: tourDateFormatted,
    bookingTime: tourTimeFormatted,
    pickupName,
    pickupAddress,
    pickupMapsUrl,
    pricingMode: (booking as any).pricingMode,
    pricingUnit: (booking as any).pricingUnit,
    totalPrice: totalAmount,
    cancellationPolicy,
    foodStatus: (booking as any).foodStatus || snapshot?.meals?.service,
    foodDetails: (booking as any).foodDetails || snapshot?.meals?.details,
    transportStatus: (booking as any).transportStatus || snapshot?.transport?.service,
    transportDetails: (booking as any).transportDetails,
    entryFeeStatus: (booking as any).entryFeeStatus,
    entryFeeDetails: (booking as any).entryFeeDetails,
    additionalCostsDetails: (booking as any).additionalCostsDetails,
    requestTicketAssistance: (booking as any).requestTicketAssistance,
    paymentStatus,
  };

  const handlePrint = () => {
    setOpenConfirmation(true);
  };

  return (
    <AuthGate title="Sign in to view booking" description="Access your confirmed booking details">
      <div className="pb-12">
        <div className="app-container max-w-4xl mx-auto py-6 space-y-6">
          {/* Back Navigation & Breadcrumb */}
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/bookings"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="size-4" /> Back to My Bookings
            </Link>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpenConfirmation(true)}
                className="rounded-xl text-xs gap-1.5 font-semibold"
              >
                <Eye className="size-3.5 text-primary" /> View Confirmation
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handlePrint}
                className="rounded-xl text-xs gap-1.5 font-semibold shadow-sm"
              >
                <Printer className="size-3.5" /> Print Confirmation
              </Button>
            </div>
          </div>

          {/* Top Booking Overview Header Card */}
          <div className="card-surface p-5 sm:p-6 rounded-3xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm sm:text-base font-bold text-foreground">
                    {refCode}
                  </span>
                  <Badge variant="outline" className="text-xs uppercase font-semibold">
                    {type === "common" ? "Tour Guide Package" : type === "specific" ? "Place Specialist" : type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Requested on {new Date((booking as any).createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
              <StatusBadge status={booking.status} className="text-xs font-bold px-3 py-1" />
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="rounded-2xl border p-3 bg-muted/30">
                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-bold block">
                  Tour Date
                </span>
                <p className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                  <Calendar className="size-3.5 text-primary shrink-0" />
                  <span className="truncate">{tourDateFormatted}</span>
                </p>
              </div>

              <div className="rounded-2xl border p-3 bg-muted/30">
                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-bold block">
                  Start Time
                </span>
                <p className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                  <Clock className="size-3.5 text-primary shrink-0" />
                  <span>{tourTimeFormatted}</span>
                </p>
              </div>

              <div className="rounded-2xl border p-3 bg-muted/30">
                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-bold block">
                  Travellers
                </span>
                <p className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                  <Users className="size-3.5 text-primary shrink-0" />
                  <span>{totalTravellers} Person{totalTravellers > 1 ? "s" : ""}</span>
                </p>
                {adults !== undefined && children !== undefined ? (
                  <span className="text-[0.65rem] text-muted-foreground block mt-0.5">
                    ({adults} Adult{adults > 1 ? "s" : ""}, {children} Child{children > 1 ? "ren" : ""})
                  </span>
                ) : null}
              </div>

              <div className="rounded-2xl border p-3 bg-muted/30">
                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-bold block">
                  Total Amount
                </span>
                <p className="text-xs sm:text-sm font-black text-primary flex items-center gap-1 mt-0.5">
                  <span>{formatCurrency(totalAmount)}</span>
                </p>
                <span className="text-[0.65rem] text-muted-foreground block mt-0.5 truncate">
                  {pricingUnitDisplay}
                </span>
              </div>
            </div>
          </div>

          {/* Agency & Guide Details */}
          <div className="card-surface p-5 sm:p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-2 border-b pb-3">
              <Compass className="size-5 text-primary shrink-0" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Service Provider & Assigned Guides
              </h2>
            </div>

            {agencyBanner ? (
              <div className="relative h-32 w-full overflow-hidden rounded-2xl border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={agencyBanner}
                  alt={agencyName || "Agency Banner"}
                  className="size-full object-cover"
                />
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div>
                  <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-bold block">
                    Lead Agency / Operator
                  </span>
                  <p className="text-base font-bold text-foreground flex items-center gap-1.5">
                    {agencyName ? (
                      <>
                        <Building2 className="size-4 text-primary" /> {agencyName}
                      </>
                    ) : (
                      guideOrAgencyName
                    )}
                  </p>
                  {agencyAddress ? (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-start gap-1">
                      <MapPin className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <span>{agencyAddress}</span>
                    </p>
                  ) : null}
                </div>

                {agencyMapsUrl ? (
                  <Button asChild size="sm" variant="outline" className="h-8 rounded-xl text-xs gap-1.5">
                    <a href={agencyMapsUrl} target="_blank" rel="noopener noreferrer">
                      <MapPin className="size-3.5 text-primary" /> View Agency on Maps
                      <ExternalLink className="size-3" />
                    </a>
                  </Button>
                ) : null}
              </div>

              <div className="space-y-2 rounded-2xl bg-muted/20 border p-3.5">
                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-bold block">
                  Lead Guide Profile
                </span>
                <div className="flex items-center gap-3">
                  <Avatar className="size-11 shrink-0">
                    {leadGuide?.profile_pic ? <AvatarImage src={leadGuide.profile_pic} alt={leadGuide.full_name} /> : null}
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {(leadGuide?.full_name || "G").charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">{leadGuide?.full_name || "Assigned Tour Guide"}</p>
                    {leadGuide?.language?.length ? (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Languages className="size-3 text-muted-foreground shrink-0" />
                        <span className="truncate">{leadGuide.language.join(", ")}</span>
                      </p>
                    ) : null}
                  </div>
                </div>

                {(leadGuide?.phonenumber || leadGuide?.email) ? (
                  <div className="space-y-1 pt-1 text-xs border-t text-muted-foreground">
                    {leadGuide.phonenumber ? (
                      <p className="flex items-center gap-1.5">
                        <Phone className="size-3 text-primary" /> {leadGuide.phonenumber}
                      </p>
                    ) : null}
                    {leadGuide.email ? (
                      <p className="flex items-center gap-1.5 truncate">
                        <Mail className="size-3 text-primary" /> {leadGuide.email}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Dedicated Specific Guide Card if assigned */}
            {specificGuide ? (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10 shrink-0">
                    {specificGuide.profile_pic ? <AvatarImage src={specificGuide.profile_pic} alt={specificGuide.full_name} /> : null}
                    <AvatarFallback className="bg-primary/15 text-primary font-bold">
                      {specificGuide.full_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <span className="text-[0.65rem] uppercase tracking-wider text-primary font-bold block">
                      Assigned Monument / Specific Guide
                    </span>
                    <p className="text-sm font-bold text-foreground">{specificGuide.full_name}</p>
                    {specificGuide.phonenumber ? (
                      <p className="text-xs text-muted-foreground">Contact: {specificGuide.phonenumber}</p>
                    ) : null}
                  </div>
                </div>
                {(booking as any).specificGuideStatus ? (
                  <Badge variant="outline" className="text-xs font-semibold">
                    Status: {(booking as any).specificGuideStatus}
                  </Badge>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Hotel Stay Particulars */}
          {type === "hotel" ? (
            <div className="card-surface p-5 sm:p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-2 border-b pb-3">
                <Building2 className="size-5 text-primary shrink-0" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Reserved Room & Stay Particulars
                </h2>
              </div>

              <div className="rounded-2xl border p-4 bg-muted/20 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[0.65rem] uppercase tracking-wider text-primary font-bold block">
                      Room Type
                    </span>
                    <p className="text-base font-bold text-foreground">
                      {snapshot?.roomTitle || (booking as any).roomType?.title || "Standard Hotel Room"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(snapshot?.roomTypeClassification || (booking as any).roomType?.roomType) ? (
                      <Badge variant="default" className="text-xs">
                        {snapshot?.roomTypeClassification || (booking as any).roomType?.roomType}
                      </Badge>
                    ) : null}
                    <Badge variant="outline" className="text-xs font-semibold">
                      {(booking as any).rooms || 1} Room(s)
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                  <div className="rounded-xl bg-card border p-2.5">
                    <span className="text-muted-foreground block text-[0.65rem] uppercase">Stay Dates</span>
                    <span className="font-semibold">{tourDateFormatted}</span>
                  </div>
                  <div className="rounded-xl bg-card border p-2.5">
                    <span className="text-muted-foreground block text-[0.65rem] uppercase">Guests</span>
                    <span className="font-semibold">{totalTravellers} Guest(s)</span>
                  </div>
                  <div className="rounded-xl bg-card border p-2.5">
                    <span className="text-muted-foreground block text-[0.65rem] uppercase">Rate</span>
                    <span className="font-semibold">
                      {formatCurrency(snapshot?.pricePerNight || (booking as any).roomType?.pricePerNight || (booking as any).hotel?.cost_per_night || 0)} / nt
                    </span>
                  </div>
                  <div className="rounded-xl bg-card border p-2.5">
                    <span className="text-muted-foreground block text-[0.65rem] uppercase">Total</span>
                    <span className="font-semibold text-primary">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>

                {/* Selected Add-ons */}
                {(snapshot?.selectedAddOns?.length > 0 || (booking as any).selectedAddOns?.length > 0) ? (
                  <div className="rounded-xl border border-border/80 bg-card p-3 space-y-1.5 text-xs">
                    <span className="font-bold uppercase tracking-wider text-[0.65rem] text-muted-foreground block">
                      Selected Add-on Services
                    </span>
                    <div className="space-y-1">
                      {(snapshot?.selectedAddOns || (booking as any).selectedAddOns || []).map((addon: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-muted-foreground">
                          <span>{addon.name}</span>
                          <span className="font-semibold text-foreground">+{formatCurrency(addon.price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Package & Itinerary Stops */}
          {type !== "hotel" && places.length > 0 ? (
            <div className="card-surface p-5 sm:p-6 rounded-3xl space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Ticket className="size-5 text-primary shrink-0" />
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Confirmed Itinerary Stops ({places.length} Locations)
                  </h2>
                </div>
                <Badge variant="secondary" className="text-xs font-semibold">
                  {pricingModeDisplay}
                </Badge>
              </div>

              <div className="divide-y border rounded-2xl overflow-hidden bg-card">
                {places.map((place: any, idx: number) => (
                  <div key={place.id || idx} className="p-3.5 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{place.name}</p>
                        {place.district ? (
                          <p className="text-xs text-muted-foreground truncate">{place.district}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className="text-[0.7rem] font-medium">
                        {place.visitArrangement || "Guided Visit"}
                      </Badge>
                      {place.expectedDuration ? (
                        <p className="text-[0.65rem] text-muted-foreground mt-0.5">{place.expectedDuration}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Logistics, Pickup, Meals & Transport Arrangements */}
          {type !== "hotel" ? (
            <div className="card-surface p-5 sm:p-6 rounded-3xl space-y-4">
              <div className="flex items-center gap-2 border-b pb-3">
                <Car className="size-5 text-primary shrink-0" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Logistics, Pickup & Facilities
                </h2>
              </div>

            {/* Pickup Point Card */}
            {(pickupName || pickupAddress || pickupMapsUrl) ? (
              <div className="rounded-2xl border p-4 bg-muted/20 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                    <MapPin className="size-3.5 text-primary" /> Designated Meeting / Pickup Location
                  </span>
                  {pickupMapsUrl ? (
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs rounded-lg gap-1">
                      <a href={pickupMapsUrl} target="_blank" rel="noopener noreferrer">
                        Open in Google Maps <ExternalLink className="size-3" />
                      </a>
                    </Button>
                  ) : (pickupName || pickupAddress) ? (
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs rounded-lg gap-1">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pickupName || ""} ${pickupAddress || ""}`.trim())}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Search Location <ExternalLink className="size-3" />
                      </a>
                    </Button>
                  ) : null}
                </div>
                <p className="font-bold text-sm text-foreground">{pickupName || "Designated Meeting Location"}</p>
                {pickupAddress ? <p className="text-xs text-muted-foreground">{pickupAddress}</p> : null}
              </div>
            ) : null}

            {/* Meals & Transport Breakdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border p-3.5 bg-card space-y-1">
                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                  <Utensils className="size-3.5 text-primary" /> Meals & Catering
                </span>
                <p className="font-semibold text-xs text-foreground capitalize">
                  {(booking as any).foodStatus || snapshot?.meals?.service || "Excluded / Self-arranged"}
                </p>
                {(booking as any).foodDetails || snapshot?.meals?.details ? (
                  <p className="text-xs text-muted-foreground">
                    {(booking as any).foodDetails || snapshot?.meals?.details}
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border p-3.5 bg-card space-y-1">
                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
                  <Car className="size-3.5 text-primary" /> Transport Service
                </span>
                <p className="font-semibold text-xs text-foreground capitalize">
                  {(booking as any).transportStatus || snapshot?.transport?.service || "Self-arranged / Excluded"}
                </p>
                {(booking as any).transportDetails ? (
                  <p className="text-xs text-muted-foreground">{(booking as any).transportDetails}</p>
                ) : null}
              </div>
            </div>

            {/* Ticket Assistance */}
            {(booking as any).requestTicketAssistance ? (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs space-y-1">
                <p className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <Ticket className="size-4" /> Ticket Purchasing Assistance Requested
                </p>
                <p className="text-muted-foreground">
                  Your guide will assist with purchasing monument/entry tickets. Ticket costs are separate from guide fees and settled directly.
                </p>
              </div>
            ) : null}
          </div>
          ) : null}

          {/* Customer & Traveller Details */}
          <div className="card-surface p-5 sm:p-6 rounded-3xl space-y-4">
            <div className="flex items-center gap-2 border-b pb-3">
              <Users className="size-5 text-primary shrink-0" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                Customer & Traveller Information
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-bold block">
                  Lead Customer
                </span>
                <p className="font-bold text-sm text-foreground">{customerName}</p>
              </div>

              <div>
                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-bold block">
                  Email Address
                </span>
                <p className="font-medium text-xs text-primary truncate">{customerEmail}</p>
              </div>

              <div>
                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-bold block">
                  Contact Phone
                </span>
                <p className="font-semibold text-xs text-foreground">{customerPhone}</p>
              </div>
            </div>

            {customerNotes ? (
              <div className="border-t pt-3 text-xs space-y-1 bg-muted/20 rounded-xl p-3">
                <span className="text-[0.65rem] uppercase tracking-wider text-muted-foreground font-bold block">
                  Saved Customer Special Requests
                </span>
                <p className="text-foreground italic">&ldquo;{customerNotes}&rdquo;</p>
              </div>
            ) : null}
          </div>

          {/* Financial Summary & Terms */}
          <div className="card-surface p-5 sm:p-6 rounded-3xl space-y-4 bg-primary/[0.02] border-primary/20">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-primary shrink-0" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">
                  Financial Agreement & Policy
                </h2>
              </div>
              <Badge variant="outline" className="text-xs font-semibold border-primary/30 text-primary">
                {paymentStatus}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground block">Final Agreed Tour Amount</span>
                <p className="text-2xl font-black text-primary">{formatCurrency(totalAmount)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Basis: {pricingModeDisplay} · {pricingUnitDisplay}
                </p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Settlement Method: Direct</p>
                <span>Direct settlement between traveller and service provider</span>
              </div>
            </div>

            <div className="border-t pt-3 text-xs text-muted-foreground space-y-1">
              <span className="font-semibold text-foreground block">Cancellation & Refund Terms:</span>
              <p>{cancellationPolicy}</p>
            </div>
          </div>
        </div>

        {/* Separated Printable Confirmation Modal */}
        <PrintableBookingModal
          open={openConfirmation}
          onOpenChange={setOpenConfirmation}
          booking={printableData}
        />
      </div>
    </AuthGate>
  );
}
