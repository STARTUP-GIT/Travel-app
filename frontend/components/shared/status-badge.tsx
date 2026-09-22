import { MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/features/bookings/types";

const statusMap: Record<BookingStatus, { label: string; variant: "success" | "warning" | "destructive" | "info" | "default" }> = {
  CONFIRMED: { label: "Confirmed", variant: "success" },
  COMPLETED: { label: "Completed", variant: "info" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
  REJECTED: { label: "Rejected", variant: "destructive" },
  PENDING: { label: "Pending", variant: "warning" },
};

export function StatusBadge({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  const s = statusMap[status] ?? statusMap.PENDING;
  return (
    <Badge variant={s.variant} className={cn("uppercase", className)}>
      {s.label}
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