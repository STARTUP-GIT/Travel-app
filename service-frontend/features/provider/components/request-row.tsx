"use client";

import { CalendarDays, ChevronRight, Loader2, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { AppImage } from "@/components/shared/app-image";
import { Button } from "@/components/ui/button";
import { setRequestStatus } from "@/features/provider/api/provider.actions";
import { providerKindForRequest, statusActions } from "@/features/provider/config";
import type { ProviderRequest } from "@/features/provider/types";
import { formatCurrency, formatShortDate, pluralize } from "@/lib/utils";

const BUTTON_VARIANT = {
  accept: "default",
  decline: "destructive",
  neutral: "outline",
} as const;

/** The accept / decline / complete controls, limited to legal transitions. */
export function RequestActions({
  request,
  compact = false,
}: {
  request: ProviderRequest;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const actions = statusActions(providerKindForRequest(request.kind), request.status);

  if (actions.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No further action is possible for this request.
      </p>
    );
  }

  async function update(status: ProviderRequest["status"]) {
    setBusy(status);
    const result = await setRequestStatus(request.id, status);
    setBusy(null);

    if (result.ok) {
      toast.success(
        status === "CONFIRMED"
          ? "Request accepted"
          : status === "COMPLETED"
            ? "Marked as completed"
            : status === "REJECTED"
              ? "Request rejected"
              : "Request cancelled"
      );
      router.refresh();
    } else {
      toast.error(result.message);
    }
  }

  return (
    <div
      className={
        compact
          ? "flex flex-wrap gap-2"
          : "flex flex-col gap-2 sm:flex-row sm:flex-wrap"
      }
    >
      {actions.map((action) => (
        <Button
          key={action.status}
          type="button"
          size={compact ? "sm" : "default"}
          variant={BUTTON_VARIANT[action.variant]}
          className="rounded-full"
          disabled={busy !== null}
          onClick={() => void update(action.status)}
        >
          {busy === action.status ? (
            <Loader2 className="size-4 animate-spin" />
          ) : null}
          {busy === action.status ? "Working…" : action.label}
        </Button>
      ))}
    </div>
  );
}

/** A request row with the traveller, stay details, and inline status actions. */
export function RequestRow({ request }: { request: ProviderRequest }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <AppImage
          src={request.customer.photo}
          alt={request.customer.name}
          fallbackClassName="rounded-full"
          className="size-11 shrink-0 rounded-full"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{request.customer.name}</p>
          <Link
            href={`/requests/${request.id}`}
            className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            <span className="truncate">{request.listingName}</span>
            <ChevronRight className="size-3 shrink-0" />
          </Link>
        </div>
        {request.amount !== null ? (
          <span className="shrink-0 text-sm font-semibold">
            {formatCurrency(request.amount)}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="size-3.5" />
          {formatShortDate(request.date)}
          {request.endDate ? ` → ${formatShortDate(request.endDate)}` : ""}
        </span>
        {request.guests ? (
          <span className="flex items-center gap-1.5">
            <Users className="size-3.5" />
            {pluralize(request.guests, "guest")}
            {request.rooms ? ` · ${pluralize(request.rooms, "room")}` : ""}
          </span>
        ) : null}
        {request.places.length > 0 ? (
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5" />
            {request.places.map((place) => place.name).join(", ")}
          </span>
        ) : null}
      </div>

      <RequestActions request={request} compact />
    </div>
  );
}
