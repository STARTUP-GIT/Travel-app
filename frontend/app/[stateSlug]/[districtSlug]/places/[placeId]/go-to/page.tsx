"use client";

import { motion } from "motion/react";
import { ArrowRight, CarTaxiFront, Clock, MapPin, Route } from "lucide-react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { ScreenHeader } from "@/components/shared/screen-header";
import { Button } from "@/components/ui/button";
import { usePlace } from "@/features/places/hooks/usePlaces";

const UPCOMING: {
  icon: typeof MapPin;
  label: string;
  description: string;
}[] = [
  {
    icon: MapPin,
    label: "Turn-by-turn directions",
    description: "A clear step-by-step route from your location to this place.",
  },
  {
    icon: Clock,
    label: "Distance & travel time",
    description: "An upfront estimate so you know the trip before you set off.",
  },
  {
    icon: CarTaxiFront,
    label: "Helpful pickup guidance",
    description: "Tips for meeting your driver and getting the trip started.",
  },
];

export default function GoToComingSoonPage() {
  const params = useParams<{ stateSlug: string; districtSlug: string; placeId: string }>();
  const stateSlug = params.stateSlug;
  const districtSlug = params.districtSlug;
  const placeId = params.placeId;
  const districtBase = `/${stateSlug}/${districtSlug}`;
  const placeHref = `${districtBase}/places/${placeId}`;

  const place = usePlace(placeId ? districtSlug : undefined, placeId);
  const placeName = place.data?.name;

  return (
    <div className="pb-8">
      <ScreenHeader title="Go To" subtitle={placeName ?? "Navigation"} backHref={placeHref} />

      <div className="app-container mt-2">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-surface rounded-3xl p-6 text-center"
        >
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Route className="size-8" />
          </span>
          <h2 className="mt-4 text-lg font-bold tracking-tight">Coming Soon</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Turn-by-turn navigation to{" "}
            {placeName ? (
              <span className="font-semibold text-foreground">{placeName}</span>
            ) : (
              "this place"
            )}{" "}
            is not available yet. We are putting the finishing touches on it.
          </p>
        </motion.section>

        <section aria-labelledby="go-to-upcoming" className="mt-5">
          <h3
            id="go-to-upcoming"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            What you will get
          </h3>
          <div className="mt-2.5 space-y-2.5">
            {UPCOMING.map(({ icon: Icon, label, description }) => (
              <div key={label} className="card-surface flex items-start gap-3 rounded-2xl p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-5">
          <Button asChild variant="action" size="lg" className="w-full rounded-2xl">
            <Link href={placeHref}>
              Back to place <ArrowRight className="size-5" />
            </Link>
          </Button>
        </div>
        <p className="mt-2.5 text-center text-xs text-muted-foreground">
          In the meantime, you can browse guides for this district.
        </p>
      </div>
    </div>
  );
}
