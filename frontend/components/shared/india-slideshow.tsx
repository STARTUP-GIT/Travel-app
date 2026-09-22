"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import * as React from "react";

import { useBranding } from "@/features/app-config/state/app-config-provider";
import {
  FALLBACK_LANDING_SLIDES,
  type LandingSlide,
} from "@/features/app-config/fallback-gallery";
import { cn } from "@/lib/utils";

const SLIDE_INTERVAL = 6000;

/**
 * Common, state-independent tourism slideshow for the landing page. Images
 * come from the admin-controlled application configuration
 * (app_config.imageBanners); a real-tourism fallback gallery is used only
 * when nothing is configured or every configured image fails to load.
 * Slow crossfade with a subtle zoom, respects reduced motion.
 */
export function IndiaSlideshow({
  className,
  overlayClassName,
}: {
  className?: string;
  overlayClassName?: string;
}) {
  const { bannerImages } = useBranding();
  const reduceMotion = useReducedMotion();

  const slides = React.useMemo<LandingSlide[]>(() => {
    const configured = (bannerImages ?? []).filter(Boolean);
    return configured.length > 0
      ? configured.map((src) => ({ src, alt: "" }))
      : FALLBACK_LANDING_SLIDES;
  }, [bannerImages]);

  const [index, setIndex] = React.useState(0);
  const [failed, setFailed] = React.useState<Set<string>>(new Set());
  const [loadedSlide, setLoadedSlide] = React.useState<LandingSlide | null>(null);

  const available = React.useMemo(
    () => slides.filter((s) => !failed.has(s.src)),
    [slides, failed]
  );

  const current = React.useMemo(() => {
    const pool = available.length > 0 ? available : slides;
    return pool[Math.min(index, pool.length - 1)] ?? null;
  }, [available, slides, index]);

  React.useEffect(() => {
    if (slides.length <= 1) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, SLIDE_INTERVAL);
    return () => window.clearInterval(t);
  }, [slides.length]);

  React.useEffect(() => {
    if (!current) return;
    let active = true;
    setLoadedSlide(null);
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (active) setLoadedSlide(current);
    };
    img.onerror = () => {
      if (active) {
        setFailed((prev) =>
          prev.has(current.src) ? prev : new Set(prev).add(current.src)
        );
      }
    };
    img.src = current.src;
    return () => {
      active = false;
    };
  }, [current]);

  const showControls = slides.length > 1;
  const label = loadedSlide?.alt ?? "";

  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      {/* Photography layer */}
      <AnimatePresence initial={false}>
        {loadedSlide ? (
          <motion.img
            key={loadedSlide.src}
            src={loadedSlide.src}
            alt=""
            aria-hidden
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: loadedSlide.position ?? "center" }}
            initial={
              reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.05 }
            }
            animate={reduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.03 }}
            transition={{
              duration: reduceMotion ? 0 : 1.4,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        ) : null}
      </AnimatePresence>

      {/* Subtle readability overlay — keeps the photograph clearly visible */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-b from-black/35 via-black/5 to-black/75",
          overlayClassName
        )}
        aria-hidden
      />

      {/* Destination caption */}
      {label ? (
        <p
          aria-live="polite"
          className="absolute bottom-10 left-4 right-16 z-10 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/85 sm:left-6"
        >
          <span className="inline-block size-1.5 rounded-full bg-amber-300" />
          {label}
        </p>
      ) : null}

      {/* Slideshow controls */}
      {showControls ? (
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
          {slides.map((slide, i) => (
            <button
              key={slide.src + i}
              type="button"
              aria-label={`Show slide ${i + 1}${
                slide.alt ? `: ${slide.alt}` : ""
              }`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
                i === index
                  ? "w-6 bg-white/90"
                  : "w-1.5 bg-white/40 hover:bg-white/70"
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}