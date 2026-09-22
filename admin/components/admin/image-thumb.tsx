"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export function ImageThumb({
  src,
  alt,
  className,
  icon,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  icon?: React.ReactNode;
}) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    return (
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground",
          className
        )}
        aria-label={alt}
      >
        {icon ?? alt.charAt(0).toUpperCase()}
      </span>
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("size-10 shrink-0 rounded-lg object-cover", className)}
    />
  );
}