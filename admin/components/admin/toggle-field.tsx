"use client";

import { Loader2 } from "lucide-react";
import * as React from "react";

import { Switch } from "@/components/ui/switch";

export function ToggleField({
  label,
  description,
  checked,
  busy = false,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  busy?: boolean;
  onChange: (next: boolean) => void | Promise<void>;
}) {
  const [pending, setPending] = React.useState(false);
  const active = busy || pending;

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description ? (
          <p className="text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {active ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
        <Switch
          checked={checked}
          disabled={active}
          onCheckedChange={async (next) => {
            setPending(true);
            try {
              await onChange(next);
            } finally {
              setPending(false);
            }
          }}
        />
      </div>
    </div>
  );
}