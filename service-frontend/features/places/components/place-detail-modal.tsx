"use client";

import {
  Coins,
  ExternalLink,
  Globe2,
  MapPin,
  Tag,
  Ticket,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ManageablePlace } from "@/features/provider/types";
import { formatCurrency } from "@/lib/utils";

export function PlaceDetailModal({
  place,
  open,
  onOpenChange,
  onEdit,
}: {
  place: ManageablePlace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (place: ManageablePlace) => void;
}) {
  if (!place) return null;

  const statusVariant =
    place.status === "APPROVED"
      ? "default"
      : place.status === "PENDING"
      ? "secondary"
      : "destructive";

  const statusText =
    place.status === "APPROVED"
      ? "Approved"
      : place.status === "PENDING"
      ? "Pending Review"
      : "Rejected";

  const categories =
    Array.isArray(place.categories) && place.categories.length > 0
      ? place.categories
      : place.category
      ? [place.category]
      : [];

  const fullAddress = [
    place.addressLine,
    place.locality,
    place.district?.name,
    place.district?.state?.name || place.state?.name,
    place.pincode ? `PIN: ${place.pincode}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const lat = place.latitude;
  const lng = place.longitude;
  const hasCoords =
    typeof lat === "number" &&
    typeof lng === "number" &&
    (lat !== 0 || lng !== 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle className="text-xl font-bold">{place.name}</DialogTitle>
              <DialogDescription className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant={statusVariant}>{statusText}</Badge>
                {place.district?.name && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3 text-primary" />
                    {place.district.name}
                    {place.district.state?.name ? `, ${place.district.state.name}` : ""}
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Categories Chips */}
          {categories.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {categories.map((cat) => (
                <Badge key={cat} variant="secondary" className="gap-1 text-xs font-medium">
                  <Tag className="size-3 text-primary" />
                  {cat}
                </Badge>
              ))}
            </div>
          )}

          {/* Photos */}
          {place.images && place.images.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {place.images.map((img, i) => (
                <div
                  key={i}
                  className="relative aspect-video overflow-hidden rounded-xl border border-border"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="size-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="text-sm font-semibold">About this place</h4>
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {place.description || "No description provided."}
            </p>
          </div>

          {/* Indian Visitor Pricing */}
          <div className="rounded-xl border border-border bg-card p-3.5">
            <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Ticket className="size-4 text-primary" />
              Indian Visitor Entry Fees
            </h4>

            {place.entryFeeType === "FREE" || (place.entryfee === 0 && !place.childEntryFee) ? (
              <p className="mt-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                Free entry for all domestic / Indian visitors.
              </p>
            ) : place.entryFeeType === "PAID" || (typeof place.entryfee === "number" && place.entryfee > 0) ? (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Adult Entry:</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(place.entryfee ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    Child Entry (up to {place.childMaxAge ?? 12} yrs):
                  </span>
                  <span className="font-semibold text-foreground">
                    {typeof place.childEntryFee === "number"
                      ? formatCurrency(place.childEntryFee)
                      : "Same as adult"}
                  </span>
                </div>
                {place.entryFeeConditions && (
                  <p className="mt-1 text-[0.72rem] italic text-muted-foreground">
                    Note: {place.entryFeeConditions}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Entry fee unknown or not configured.
              </p>
            )}
          </div>

          {/* Foreign Visitor Pricing */}
          <div className="rounded-xl border border-border bg-card p-3.5">
            <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Globe2 className="size-4 text-primary" />
              Foreign Visitor Entry Fees
            </h4>

            {place.hasForeignPricing ? (
              place.foreignEntryFeeType === "FREE" ? (
                <p className="mt-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  Free entry for international tourists.
                </p>
              ) : place.foreignEntryFeeType === "PAID" || typeof place.foreignAdultFee === "number" ? (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Foreign Adult Entry:</span>
                    <span className="font-semibold text-foreground">
                      {formatCurrency(place.foreignAdultFee ?? 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Foreign Child (up to {place.foreignChildMaxAge ?? 12} yrs):
                    </span>
                    <span className="font-semibold text-foreground">
                      {typeof place.foreignChildFee === "number"
                        ? formatCurrency(place.foreignChildFee)
                        : "Same as foreign adult"}
                    </span>
                  </div>
                  {place.foreignEntryFeeConditions && (
                    <p className="mt-1 text-[0.72rem] italic text-muted-foreground">
                      Note: {place.foreignEntryFeeConditions}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Foreign fee not specifically provided.
                </p>
              )
            ) : (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Separate foreign visitor pricing is not configured. Domestic entry policy applies.
              </p>
            )}
          </div>

          {/* Additional Fees */}
          {place.hasAdditionalFees && Array.isArray(place.additionalFees) && place.additionalFees.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-3.5">
              <h4 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <Coins className="size-4 text-primary" />
                Additional Place Fees
              </h4>
              <div className="mt-2 divide-y divide-border/60">
                {place.additionalFees.map((fee) => (
                  <div key={fee.id} className="flex items-center justify-between py-2 text-xs">
                    <div>
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <span>{fee.name}</span>
                        {fee.visitor !== "ALL" && (
                          <Badge variant="outline" className="text-[0.65rem]">
                            {fee.visitor === "FOREIGN" ? "Foreign visitors" : "Domestic visitors"}
                          </Badge>
                        )}
                      </div>
                      {fee.conditions && (
                        <p className="mt-0.5 text-[0.7rem] text-muted-foreground italic">
                          {fee.conditions}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {fee.status === "FREE" ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Free</span>
                      ) : fee.status === "PAID" && typeof fee.amount === "number" ? (
                        <span className="font-semibold text-foreground">{formatCurrency(fee.amount)}</span>
                      ) : (
                        <span className="text-muted-foreground italic">To be confirmed at venue</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Address & Coordinates */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <MapPin className="size-3.5 text-primary" />
              Physical Address & Location
            </h4>
            {fullAddress ? (
              <p className="mt-1 text-xs text-muted-foreground">{fullAddress}</p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">No physical street address recorded.</p>
            )}

            {hasCoords && typeof lat === "number" && typeof lng === "number" && (
              <div className="mt-2.5 flex items-center justify-between border-t border-border/50 pt-2 text-xs text-muted-foreground">
                <span>
                  Coordinates: {lat.toFixed(5)}, {lng.toFixed(5)}
                </span>
                <a
                  href={`https://maps.google.com/?q=${lat},${lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  View on Google Maps
                  <ExternalLink className="size-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onEdit && (
            <Button
              onClick={() => {
                onOpenChange(false);
                onEdit(place);
              }}
            >
              Edit place
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
