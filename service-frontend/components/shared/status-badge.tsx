import { MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ListingStatus, RequestStatus } from "@/features/provider/types";

const REQUEST_LABELS: Record<
  RequestStatus,
  { label: string; variant: "success" | "warning" | "destructive" | "info" }
> = {
  PENDING: { label: "Pending", variant: "warning" },
  CONFIRMED: { label: "Confirmed", variant: "success" },
  COMPLETED: { label: "Completed", variant: "info" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
  REJECTED: { label: "Rejected", variant: "destructive" },
};

const LISTING_LABELS: Record<
  ListingStatus,
  { label: string; variant: "success" | "warning" | "destructive" }
> = {
  PENDING: { label: "Awaiting approval", variant: "warning" },
  APPROVED: { label: "Live", variant: "success" },
  REJECTED: { label: "Rejected", variant: "destructive" },
};

export function RequestStatusBadge({
  status,
  className,
}: {
  status: RequestStatus;
  className?: string;
}) {
  const entry = REQUEST_LABELS[status] ?? REQUEST_LABELS.PENDING;
  return (
    <Badge variant={entry.variant} className={cn("uppercase", className)}>
      {entry.label}
    </Badge>
  );
}

export function ListingStatusBadge({
  status,
  className,
}: {
  status: ListingStatus;
  className?: string;
}) {
  const entry = LISTING_LABELS[status] ?? LISTING_LABELS.PENDING;
  return (
    <Badge variant={entry.variant} className={cn("uppercase", className)}>
      {entry.label}
    </Badge>
  );
}

export function DistrictBadge({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <Badge variant="glass" className={cn("gap-1", className)}>
      <MapPin className="size-3" />
      {name}
    </Badge>
  );
}
