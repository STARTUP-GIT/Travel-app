import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  PENDING: "border-dashed bg-muted text-muted-foreground",
  APPROVED: "bg-zinc-900 text-white",
  REJECTED: "border-red-200 bg-red-50 text-red-700",
  CONFIRMED: "bg-zinc-900 text-white",
  CANCELLED: "border-dashed bg-muted text-muted-foreground",
  COMPLETED: "border-green-200 bg-green-50 text-green-700",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("font-mono", STYLES[status] ?? "")}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}