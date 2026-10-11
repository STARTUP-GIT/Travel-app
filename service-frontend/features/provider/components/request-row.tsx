"use client";

import { CalendarDays, ChevronRight, Loader2, MapPin, Ticket, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { AppImage } from "@/components/shared/app-image";
import { Button } from "@/components/ui/button";
import { setRequestStatus } from "@/features/provider/api/provider.actions";
import { providerKindForRequest, statusActions } from "@/features/provider/config";
import type { ProviderRequest } from "@/features/provider/types";
import {
  formatCurrency,
  formatShortDate,
  formatBookingDate,
  formatBookingTime,
  pluralize,
} from "@/lib/utils";

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
          className="rounded-full shadow-sm"
          disabled={busy !== null}
          onClick={(e) => {
            e.stopPropagation();
            void update(action.status);
          }}
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

/** A request row with the traveller, stay details, and inline status actions. Entire card is clickable. */
export function RequestRow({ request }: { request: ProviderRequest }) {
  const router = useRouter();
  const refCode = `KTG-${request.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase()}`;

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If click originates inside a button, link, or interactive element, ignore card navigation
    if ((e.target as HTMLElement).closest("button, a, input, select, textarea, [data-interactive='true']")) {
      return;
    }
    router.push(`/requests/${request.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter") {
      if ((e.target as HTMLElement).closest("button, a, input, select, textarea, [data-interactive='true']")) {
        return;
      }
      e.preventDefault();
      router.push(`/requests/${request.id}`);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={handleKeyDown}
      aria-label={`View booking request for ${request.customer.name}`}
      className="group relative flex flex-col gap-3.5 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs transition-all duration-200 hover:border-primary/40 hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:border-transparent"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <AppImage
            src={request.customer.photo}
            alt={request.customer.name}
            fallbackClassName="rounded-full"
            className="size-11 shrink-0 rounded-full border border-border/80"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                {request.customer.name}
              </p>
              <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[0.68rem] font-mono font-medium text-muted-foreground">
                {refCode}
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <span>{request.listingName}</span>
              <ChevronRight className="size-3 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              request.status === "CONFIRMED"
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                : request.status === "COMPLETED"
                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20"
                  : request.status === "PENDING"
                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                    : "bg-muted text-muted-foreground border border-border"
            }`}
          >
            {request.status}
          </span>
          {request.amount !== null ? (
            <span className="text-base font-bold text-primary tracking-tight">
              {formatCurrency(request.amount)}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <CalendarDays className="size-3.5 text-primary" />
          <span>{formatBookingDate(request.date)}</span>
          {request.endDate ? <span> → {formatBookingDate(request.endDate)}</span> : null}
        </span>

        {request.time || request.tripStartTime ? (
          <span className="flex items-center gap-1.5">
            <span className="size-1 rounded-full bg-border" />
            <span>Time: {formatBookingTime(request.time || request.tripStartTime)}</span>
          </span>
        ) : null}

        {request.guests ? (
          <span className="flex items-center gap-1.5">
            <span className="size-1 rounded-full bg-border" />
            <Users className="size-3.5 text-muted-foreground" />
            <span>
              {pluralize(request.guests, "traveller")}
              {request.adults !== null && request.adults !== undefined
                ? ` (${request.adults} adult${request.adults === 1 ? "" : "s"}${
                    typeof request.children === "number" && request.children > 0
                      ? `, ${request.children} child${request.children === 1 ? "" : "ren"}`
                      : ""
                  })`
                : ""}
            </span>
          </span>
        ) : null}

        {request.places && request.places.length > 0 ? (
          <span className="flex items-center gap-1.5 truncate max-w-md">
            <span className="size-1 rounded-full bg-border" />
            <MapPin className="size-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{request.places.map((place) => place.name).join(", ")}</span>
          </span>
        ) : null}

        {request.requestTicketAssistance ? (
          <span className="flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 font-medium text-amber-700 dark:text-amber-300">
            <Ticket className="size-3.5" />
            Ticket assistance
          </span>
        ) : null}
      </div>

      <div
        className="flex items-center justify-between pt-1 border-t border-border/40"
        data-interactive="true"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[0.72rem] text-muted-foreground">
          Requested on {formatBookingDate(request.createdAt)}
        </span>
        <RequestActions request={request} compact />
      </div>
    </div>
  );
}
