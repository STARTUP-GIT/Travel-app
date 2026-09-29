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

/**
 * `status` is absent while a record has no approval column to read yet (the
 * guide auto-approval migration adds one), so it is optional here. Calling
 * `.replace()` on that undefined value crashed the whole guides page, which is
 * why a missing status now renders as a neutral "—" instead of throwing.
 */
export function StatusBadge({ status }: { status?: string | null }) {
  if (!status) {
    return (
      <Badge variant="outline" className="font-mono text-muted-foreground">
        —
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn("font-mono", STYLES[status] ?? "")}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}