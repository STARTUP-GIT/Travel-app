"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUSES = ["PENDING", "CONFIRMED", "REJECTED", "CANCELLED", "COMPLETED"];

export function BookingStatusSelect({
  value,
  onUpdate,
}: {
  value: string;
  onUpdate: (next: string) => Promise<void>;
}) {
  const [busy, setBusy] = React.useState(false);

  return (
    <div className="flex items-center gap-1.5">
      {busy ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
      <Select
        value={value}
        disabled={busy}
        onValueChange={async (next) => {
          if (next === value) return;
          setBusy(true);
          try {
            await onUpdate(next);
          } finally {
            setBusy(false);
          }
        }}
      >
        <SelectTrigger className="h-8 w-[140px] rounded-lg font-mono text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="font-mono text-xs">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}