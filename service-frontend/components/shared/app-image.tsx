"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Backend image wrapper. Images are hosted by whichever provider the admin
 * used, so domain-restricted <Image /> is not reliable here. This component
 * centralises sizing, alt-text and fallback behavior in one place.
 */
export function AppImage({
  src,
  alt,
  className,
  fallbackClassName,
  draggable = false,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  draggable?: boolean;
}) {
  /**
   * The broken URL is remembered rather than a boolean flag, so a new `src`
   * renders immediately without an effect that resets state after paint.
   */
  const [brokenSrc, setBrokenSrc] = React.useState<string | null>(null);

  if (!src || brokenSrc === src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "flex size-full items-center justify-center bg-gradient-to-br from-blue-800 via-primary to-indigo-800 font-bold text-white/40",
          fallbackClassName
        )}
      >
        <span className="text-4xl">{alt.charAt(0).toUpperCase()}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      draggable={draggable}
      onError={() => setBrokenSrc(src)}
      className={cn("size-full object-cover", className)}
    />
  );
}