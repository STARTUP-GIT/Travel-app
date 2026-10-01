"use client";

import * as React from "react";
import {
  Award,
  BadgeCheck,
  Building2,
  Calendar,
  Clock,
  Compass,
  Flag,
  Languages as LanguagesIcon,
  MapPin,
  Route,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { GuideAvatar } from "@/features/guides/ui/guide-card";
import { EnquireButtons } from "@/features/guides/ui/enquire-buttons";
import { ReviewsSection } from "@/features/reviews/ui/reviews";
import { MediaRowCard } from "@/components/shared/media-row-card";
import { SectionHeader } from "@/components/shared/section-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { BookingSummary } from "@/components/shared/booking-summary";
import type { GuideWithContext } from "@/features/guides/types";
import {
  createCommonGuideBooking,
  createSpecificGuideBooking,
} from "@/features/bookings/api/bookings.api";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const TIME_OPTIONS = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
];

export function GuideProfile({
  guide,
  districtSlug,
  stateSlug,
  districtId,
}: {
  guide: GuideWithContext;
  districtSlug: string;
  stateSlug?: string;
  districtId: string;
}) {
  const person = guide.guide;
  const [bookingOpen, setBookingOpen] = React.useState(false);
  const districtBase = stateSlug ? `/${stateSlug}/${districtSlug}` : "/explore";

  const isSpecific = guide.type === "specific";
  const placesForGuide = isSpecific
    ? [{ id: guide.place.id, name: guide.place.name, slug: guide.place.slug, districtName: guide.place.districtName }]
    : guide.places;
  /*
   * Read off the narrowed `guide.guide` rather than the aliased `person`: the
   * agency exists only on the common-guide variant, and TypeScript cannot narrow
   * an alias by testing `guide.type`. `null` means "no agency", which is what the
   * hero and the byline both hide on.
   */
  const agencyName = guide.type === "common" ? guide.guide.agencyName : null;

  return (
    <div className="pb-8">
      {/* Hero */}
      <section className="relative -mx-4 overflow-hidden bg-gradient-to-br from-blue-800 via-primary to-indigo-800 px-5 pb-6 pt-7 text-white sm:mx-4 sm:mt-4 sm:rounded-3xl">
        <div className="pointer-events-none absolute -right-12 -top-16 size-60 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="relative flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <GuideAvatar
            name={person.full_name}
            image={person.profile_pic}
            className="size-20 shrink-0 ring-4 ring-white/20"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h1 className="text-2xl font-bold tracking-tight">{person.full_name}</h1>
              <BadgeCheck className="size-5 text-emerald-300" />
              <Badge variant={isSpecific ? "info" : "success"} className="border-white/20 bg-white/15 text-white hover:bg-white/20">
                {isSpecific ? "Specific guide" : "Common guide"}
              </Badge>
              {/*
                Shown ahead of the guide's own name as the headline a traveller
                books under, because for an agency that is what they are choosing.
                The guide is still named — as "with <name>" — so it is clear who
                actually leads the tour.
              */}
              {agencyName ? (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-2 py-0.5 text-sm font-semibold">
                  <Building2 className="size-3.5" />
                  {agencyName}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-blue-50/90">
              {person.tagline ?? (isSpecific ? `Expert at ${guide.place.name}` : "Knows several places here")}
            </p>
            {agencyName ? (
              <p className="mt-0.5 text-sm text-blue-50/80">
                Guided tours by {agencyName}, led by {person.full_name}
              </p>
            ) : null}
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-blue-50/90">
              {typeof person.rating === "number" && person.rating > 0 ? (
                <span className="inline-flex items-center gap-1 font-semibold">
                  <Star className="size-3.5 fill-amber-300 text-amber-300" />
                  {person.rating.toFixed(1)}
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <Award className="size-3.5" /> {person.experience} yrs experience
              </span>
              <span className="inline-flex items-center gap-1">
                <LanguagesIcon className="size-3.5" /> {person.language?.join(", ") ?? "English"}
              </span>
            </div>
          </div>
        </div>

        <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold">{formatCurrency(person.cost)}</span>
            <span className="text-xs text-blue-50/80">per booking</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="action"
              onClick={() => setBookingOpen(true)}
              className="rounded-xl"
            >
              Book this guide
            </Button>
            <Button
              asChild
              variant="glass"
              className="rounded-xl"
            >
              <Link href={`/report?type=guide&id=${person.id}`}>
                <Flag className="size-4" /> Report
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="app-container mt-6 space-y-8">
        {/* About */}
        <section>
          <SectionHeader title="About" />
          <p className="text-[0.95rem] leading-relaxed text-foreground/90">
            {person.description ?? "A local expert guide ready to make your trip memorable."}
          </p>
        </section>

        {/* Places covered */}
        <section>
          <SectionHeader
            title={isSpecific ? "Guide for" : "Places covered"}
            subtitle={isSpecific ? "This guide specialises at this place" : "Select these places when you book this common guide"}
          />
          <div className="space-y-2.5">
            {placesForGuide.map((place) => (
              <MediaRowCard
                key={place.id}
                href={`${districtBase}/places/${place.id}`}
                title={place.name}
                subtitle={`${place.districtName} · ${districtSlug}`}
                icon={<MapPin className="size-4" />}
              />
            ))}
          </div>
        </section>

        {/* Tour packages — common guides only */}
        {guide.type === "common" && guide.packages.length > 0 ? (
          <section>
            <SectionHeader
              title="Tour packages"
              subtitle="Ready-made tours covering several of these places"
            />
            <div className="space-y-2.5">
              {guide.packages.map((pkg) => (
                <MediaRowCard
                  key={pkg.id}
                  href={`${districtBase}/guides/${person.id}/packages/${pkg.id}`}
                  title={pkg.name}
                  subtitle={pkg.description ?? "Tap to see the places and book"}
                  icon={<Route className="size-4" />}
                />
              ))}
            </div>
          </section>
        ) : null}

        {/* Enquire */}
        <section>
          <SectionHeader title="Enquire now" subtitle="Reach the guide directly" />
          <EnquireButtons
            contact={{
              email: person.email,
              phone: person.phonenumber,
              name: person.full_name,
            }}
          />
        </section>

        {/* Reviews */}
        <section>
          <ReviewsSection
            target={{
              rating: person.rating ?? undefined,
              ratingCount: person.rating ? (person.review?.length ?? 1) : undefined,
              distribution: null,
              published: person.review ?? [],
            }}
            targetId={person.id}
            targetType="guide"
          />
        </section>
      </div>

      <GuideBookingSheet
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        guide={guide}
        districtSlug={districtSlug}
        stateSlug={stateSlug}
        districtId={districtId}
        placesForGuide={placesForGuide}
      />
    </div>
  );
}

export function GuideBookingSheet({
  open,
  onOpenChange,
  guide,
  districtSlug,
  stateSlug,
  districtId,
  placesForGuide,
  defaultSelectedPlaceIds = [],
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  guide: GuideWithContext;
  districtSlug: string;
  stateSlug?: string;
  districtId: string;
  placesForGuide: { id: string; name: string; slug: string; districtName: string }[];
  defaultSelectedPlaceIds?: string[];
}) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  const districtBase = stateSlug ? `/${stateSlug}/${districtSlug}` : "/explore";
  const isCommon = guide.type === "common";
  const [selectedPlaces, setSelectedPlaces] = React.useState<string[]>(
    isCommon ? defaultSelectedPlaceIds : []
  );
  const [bookingDate, setBookingDate] = React.useState("");
  const [bookingTime, setBookingTime] = React.useState("10:00 AM");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (open && isCommon && defaultSelectedPlaceIds.length === 0 && placesForGuide.length === 1) {
      setSelectedPlaces([placesForGuide[0].id]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    if (open && !isCommon) setSelectedPlaces([]);
  }, [open, isCommon]);

  const minDate = new Date();
  const todayIso = minDate.toISOString().slice(0, 10);

  function togglePlace(id: string) {
    setSelectedPlaces((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  async function submit() {
    if (!isAuthenticated) {
      onOpenChange(false);
      router.push("/login");
      return;
    }
    if (!bookingDate) {
      toast.error("Please pick a date");
      return;
    }
    if (isCommon && selectedPlaces.length === 0) {
      toast.error("Select at least one place");
      return;
    }

    setSubmitting(true);
    try {
      if (isCommon) {
        await createCommonGuideBooking({
          commonGuideId: guide.guide.id,
          placeIds: selectedPlaces,
          bookingDate,
          bookingTime,
        });
      } else {
        await createSpecificGuideBooking({
          specificGuideId: guide.guide.id,
          bookingDate,
          bookingTime,
        });
      }
      toast.success("Booking request sent", {
        description: "The guide will confirm your booking.",
      });
      onOpenChange(false);
      setSelectedPlaces([]);
      setBookingDate("");
    } catch (err) {
      toast.error("Couldn't create booking", {
        description: err instanceof Error ? err.message : "Please try again later.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const rows: { label: React.ReactNode; value: React.ReactNode; strong?: boolean }[] = [
    { label: "Guide", value: guide.guide.full_name },
    { label: "Type", value: isCommon ? "Common guide" : "Specific guide" },
    ...(isCommon
      ? [
          {
            label: "Places",
            value: `${selectedPlaces.length} place${selectedPlaces.length === 1 ? "" : "s"} selected`,
            strong: true,
          },
          { label: `Per place (${formatCurrency(guide.guide.cost)})`, value: formatCurrency(guide.guide.cost * Math.max(selectedPlaces.length, 0)), strong: true },
        ]
      : []),
    { label: "Date", value: bookingDate || "—" },
    { label: "Time", value: bookingTime },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] w-full max-w-lg gap-0 overflow-y-auto rounded-t-3xl border-border sm:max-w-xl">
        <SheetHeader className="gap-2 px-4 pt-7 pb-5 text-left sm:px-6">
          <SheetTitle className="pr-9 text-lg font-semibold tracking-tight sm:text-xl">
            Book {guide.guide.full_name}
          </SheetTitle>
          <SheetDescription className="leading-relaxed">
            {isLoading
              ? "Checking session…"
              : isAuthenticated
                ? `Booking as ${user?.name ?? "you"}. The guide confirms before it's final.`
                : "You'll be asked to sign in to book."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-7 px-4 sm:px-6">
          {isCommon && placesForGuide.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm font-semibold">
                Select places <span className="text-muted-foreground">({placesForGuide.length} covered)</span>
              </p>
              <p className="text-xs text-muted-foreground">
                The number of places is set by your selection.
              </p>
              <div className="space-y-2.5 pt-1">
                {placesForGuide.map((place) => {
                  const checked = selectedPlaces.includes(place.id);
                  return (
                    <label
                      key={place.id}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl border bg-card p-3 transition-colors",
                        checked ? "border-primary/50 bg-primary/5" : "border-border"
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => togglePlace(place.id)}
                        aria-label={`Include ${place.name}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{place.name}</p>
                        <p className="text-xs text-muted-foreground">{place.districtName}</p>
                      </div>
                      <Link
                        href={`${districtBase}/places/${place.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-semibold text-primary"
                      >
                        View
                      </Link>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            <div className="space-y-2">
              <Label htmlFor="booking-date" className="inline-flex items-center gap-1.5">
                <Calendar className="size-3.5" /> Date
              </Label>
              <Input
                id="booking-date"
                type="date"
                min={todayIso}
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="h-10 w-full rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-time" className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" /> Time
              </Label>
              <select
                id="booking-time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                className="h-10 w-full rounded-xl border border-input bg-card px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <BookingSummary
            title="Booking summary"
            rows={rows}
            total={isCommon ? formatCurrency(guide.guide.cost * Math.max(selectedPlaces.length, 0)) : formatCurrency(guide.guide.cost)}
            totalLabel="Estimated amount"
          />
        </div>

        <SheetFooter className="px-4 pt-7 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:justify-center sm:px-6">
          <Button
            variant="action"
            size="lg"
            className="w-full rounded-2xl"
            disabled={submitting || isLoading}
            onClick={submit}
          >
            {submitting ? "Sending request…" : isAuthenticated ? "Request booking" : "Sign in to book"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}