"use client";

import Link from "next/link";
import * as React from "react";

import { useCurrentDistrict } from "@/features/locations/state/current-district-provider";

/**
 * Link to a district that first persists the full state → district selection,
 * so jumping between district homepages never bypasses the state/district
 * flow (and the district page is never reached without a selection in app).
 */
export function DestinationLink({
  stateSlug,
  districtSlug,
  href,
  className,
  children,
  ...props
}: {
  stateSlug: string;
  districtSlug: string;
  href: string;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<typeof Link>, "href" | "className" | "children">) {
  const { setDestination } = useCurrentDistrict();

  return (
    <Link
      href={href}
      className={className}
      onClick={() => setDestination(stateSlug, districtSlug)}
      {...props}
    >
      {children}
    </Link>
  );
}