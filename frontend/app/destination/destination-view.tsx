"use client";

import { ArrowRight, Globe2, MapPin, Sparkles } from "lucide-react";
import { useReducedMotion } from "motion/react";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentDistrict } from "@/features/locations/state/current-district-provider";
import { cn } from "@/lib/utils";

export function DestinationView() {
  const router = useRouter();
  const { stateSlug } = useCurrentDistrict();
  const reduceMotion = useReducedMotion();

  function goState() {
    router.push("/explore");
  }

  function goDistrict() {
    if (stateSlug) {
      router.push(`/explore/${stateSlug}`);
    } else {
      toast.info("Please select a state first", {
        description: "Choose your state to view its available districts.",
      });
      router.push("/explore");
    }
  }

  const options = [
    {
      key: "state",
      icon: Globe2,
      title: "SELECT STATE",
      subtitle: "Browse by State",
      description:
        "Choose a state like Karnataka, Kerala or Goa, then discover its districts.",
      badge: null as string | null,
      buttonText: "SELECT STATE",
      onClick: goState,
    },
    {
      key: "district",
      icon: MapPin,
      title: "SELECT DISTRICT",
      subtitle: "Browse by District",
      description: stateSlug
        ? "Jump straight to districts in your selected state."
        : "Select your state first, then pick a district to explore.",
      badge: stateSlug
        ? `Active: ${stateSlug.toUpperCase()}`
        : "State Required",
      buttonText: "SELECT DISTRICT",
      onClick: goDistrict,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:gap-4">
      {options.map((option, i) => {
        const Icon = option.icon;
        return (
          <div
            key={option.key}
            className={cn(
              "destination-card card-surface group flex flex-col gap-3 rounded-2xl p-4 transition-all hover:border-primary/50 hover:shadow-md sm:p-5",
              !reduceMotion && "animate-fade-in-up"
            )}
            style={
              reduceMotion
                ? undefined
                : { animationDelay: `${i * 0.1}s`, animationFillMode: "both" }
            }
          >
            {/* Card header row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white sm:size-11">
                  <Icon className="size-5" />
                </span>
                <div>
                  <span className="block text-[0.65rem] font-bold uppercase tracking-wider text-primary">
                    {option.subtitle}
                  </span>
                  <h2 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                    {option.title}
                  </h2>
                </div>
              </div>
              {option.badge ? (
                <Badge
                  variant={stateSlug ? "success" : "outline"}
                  className="shrink-0 text-[0.65rem]"
                >
                  {stateSlug && option.key === "district" ? (
                    <Sparkles className="mr-1 size-2.5" />
                  ) : null}
                  {option.badge}
                </Badge>
              ) : null}
            </div>

            {/* Description */}
            <p className="text-xs leading-relaxed text-muted-foreground">
              {option.description}
            </p>

            {/* CTA Button */}
            <Button
              variant="action"
              size="sm"
              className="w-full justify-center gap-2 rounded-xl font-semibold sm:size-default"
              onClick={option.onClick}
            >
              {option.buttonText}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </div>
        );
      })}
    </div>
  );
}