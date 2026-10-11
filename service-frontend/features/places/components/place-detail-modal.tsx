"use client";

import { ExternalLink, MapPin, Tag, Ticket } from "lucide-react";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <DialogTitle className="text-xl font-bold">{place.name}</DialogTitle>
              <DialogDescription className="mt-1 flex items-center gap-2">
                <Badge variant={statusVariant}>{statusText}</Badge>
                {place.district?.name && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3 text-primary" />
                    {place.district.name}
                  </span>
                )}
                {place.category && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Tag className="size-3 text-primary" />
                    {place.category}
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
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

          <div>
            <h4 className="text-sm font-semibold">About this place</h4>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
              {place.description || "No description provided."}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3">
            <h4 className="flex items-center gap-1.5 text-sm font-semibold">
              <Ticket className="size-4 text-primary" />
              Entry pricing
            </h4>
            {place.pricing && place.pricing.length > 0 ? (
              <div className="mt-2 space-y-1.5">
                {place.pricing.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-foreground">
                      {p.ageGroup || "General"} ({p.visitor.toLowerCase()})
                    </span>
                    <span className="text-muted-foreground">
                      {formatCurrency(p.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : typeof place.entryfee === "number" && place.entryfee > 0 ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Flat entry price: <span className="font-medium text-foreground">{formatCurrency(place.entryfee)}</span>
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Free entry for all visitors.
              </p>
            )}
          </div>

          {typeof place.latitude === "number" && typeof place.longitude === "number" && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                Coordinates: {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}
              </span>
              <a
                href={`https://maps.google.com/?q=${place.latitude},${place.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 font-medium text-primary hover:underline"
              >
                Open on Google Maps
                <ExternalLink className="size-3" />
              </a>
            </div>
          )}
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
