"use client";

import { Coins, Plus, Trash2, Info, Check } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type {
  PlaceAdditionalFee,
  PlaceAdditionalFeeCategory,
  PlaceAdditionalFeeStatus,
  PlaceAdditionalFeeVisitor,
} from "@/features/provider/types";

export const STANDARD_FEE_CATEGORIES: {
  id: PlaceAdditionalFeeCategory;
  label: string;
}[] = [
  { id: "CAMERA", label: "Camera fee" },
  { id: "VIDEO", label: "Video recording fee" },
  { id: "PARKING", label: "Parking fee" },
  { id: "SPECIAL_EXHIBIT", label: "Special exhibit fee" },
  { id: "GUIDE_SUPPLEMENT", label: "Guide-required entry supplement" },
  { id: "OTHER", label: "Other" },
];

interface AdditionalFeesSectionProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  fees: PlaceAdditionalFee[];
  onChange: (fees: PlaceAdditionalFee[]) => void;
}

export function AdditionalFeesSection({
  enabled,
  onEnabledChange,
  fees,
  onChange,
}: AdditionalFeesSectionProps) {
  function handleAddFee(category: PlaceAdditionalFeeCategory = "CAMERA") {
    const defaultLabel =
      STANDARD_FEE_CATEGORIES.find((c) => c.id === category)?.label || "Other Fee";
    const newFee: PlaceAdditionalFee = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `fee-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      category,
      name: category === "OTHER" ? "" : defaultLabel,
      amount: 50,
      status: "PAID",
      visitor: "ALL",
      conditions: "",
    };
    onChange([...fees, newFee]);
  }

  function handleUpdateFee(index: number, partial: Partial<PlaceAdditionalFee>) {
    const updated = [...fees];
    const target = updated[index];
    if (!target) return;

    const merged = { ...target, ...partial };
    // If switching category from/to standard
    if (partial.category && partial.category !== "OTHER" && (!target.name || target.name === "Other Fee" || STANDARD_FEE_CATEGORIES.some((c) => c.label === target.name))) {
      const catLabel = STANDARD_FEE_CATEGORIES.find((c) => c.id === partial.category)?.label;
      if (catLabel) merged.name = catLabel;
    }
    updated[index] = merged;
    onChange(updated);
  }

  function handleRemoveFee(index: number) {
    onChange(fees.filter((_, i) => i !== index));
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card/60 p-4 transition-all">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Coins className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Additional Fees
            </h3>
            <p className="text-xs text-muted-foreground">
              Configure optional separate fees like camera, parking, or special exhibit charges
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Label
            htmlFor="enable-additional-fees"
            className="cursor-pointer text-xs font-medium text-foreground select-none"
          >
            Enable additional fees
          </Label>
          <Switch
            id="enable-additional-fees"
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
        </div>
      </div>

      {enabled && (
        <div className="flex flex-col gap-4 border-t border-border/70 pt-3">
          {/* Quick-add category chips */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[0.72rem] font-semibold text-muted-foreground uppercase tracking-wider">
              Standard Fee Categories
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {STANDARD_FEE_CATEGORIES.map((cat) => {
                const isSelected = fees.some((f) => f.category === cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleAddFee(cat.id)}
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5"
                  >
                    <Plus className="size-3 text-primary" />
                    {cat.label}
                    {isSelected && (
                      <Badge variant="secondary" className="ml-1 px-1 py-0 text-[0.65rem]">
                        Added
                      </Badge>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fee Entries */}
          {fees.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              No additional fees added yet. Click a category chip above or &ldquo;Add Fee Entry&rdquo; below.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {fees.map((fee, idx) => {
                const isOther = fee.category === "OTHER";
                return (
                  <div
                    key={fee.id || idx}
                    className="rounded-xl border border-border bg-background p-3.5 shadow-xs flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="flex size-5 items-center justify-center rounded-full bg-primary/10 text-[0.65rem] font-bold text-primary">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-foreground">
                          {fee.name || (isOther ? "Custom Fee" : fee.category)}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveFee(idx)}
                        className="size-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                      {/* Category */}
                      <div className="flex flex-col gap-1">
                        <Label className="text-[0.7rem] font-medium text-muted-foreground">
                          Fee Category *
                        </Label>
                        <Select
                          value={fee.category}
                          onValueChange={(val: PlaceAdditionalFeeCategory) =>
                            handleUpdateFee(idx, { category: val })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STANDARD_FEE_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Name (Required when Other) */}
                      <div className="flex flex-col gap-1">
                        <Label className="text-[0.7rem] font-medium text-muted-foreground">
                          Fee Name {isOther ? "*" : "(optional)"}
                        </Label>
                        <Input
                          value={fee.name}
                          onChange={(e) => handleUpdateFee(idx, { name: e.target.value })}
                          placeholder={isOther ? "e.g. Locker fee" : "Fee name"}
                          className="h-8 text-xs"
                          required={isOther}
                        />
                      </div>

                      {/* Visitor Type */}
                      <div className="flex flex-col gap-1">
                        <Label className="text-[0.7rem] font-medium text-muted-foreground">
                          Applicable Visitors
                        </Label>
                        <Select
                          value={fee.visitor}
                          onValueChange={(val: PlaceAdditionalFeeVisitor) =>
                            handleUpdateFee(idx, { visitor: val })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ALL">All visitors</SelectItem>
                            <SelectItem value="DOMESTIC">Domestic visitors only</SelectItem>
                            <SelectItem value="FOREIGN">Foreign visitors only</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {/* Pricing Status & Amount */}
                      <div className="flex flex-col gap-1">
                        <Label className="text-[0.7rem] font-medium text-muted-foreground">
                          Pricing Status
                        </Label>
                        <div className="flex items-center gap-1.5">
                          <Select
                            value={fee.status}
                            onValueChange={(val: PlaceAdditionalFeeStatus) =>
                              handleUpdateFee(idx, {
                                status: val,
                                amount: val === "PAID" ? (fee.amount ?? 50) : val === "FREE" ? 0 : null,
                              })
                            }
                          >
                            <SelectTrigger className="h-8 flex-1 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PAID">Paid fee (₹)</SelectItem>
                              <SelectItem value="FREE">Explicitly Free (₹0)</SelectItem>
                              <SelectItem value="UNKNOWN">Unknown / To be confirmed</SelectItem>
                            </SelectContent>
                          </Select>

                          {fee.status === "PAID" && (
                            <div className="relative w-28">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                ₹
                              </span>
                              <Input
                                type="number"
                                min={0}
                                step="any"
                                value={fee.amount ?? ""}
                                onChange={(e) =>
                                  handleUpdateFee(idx, {
                                    amount: e.target.value === "" ? null : Math.max(0, Number(e.target.value)),
                                  })
                                }
                                placeholder="0"
                                className="h-8 pl-6 text-xs"
                                required
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Conditions / Notes */}
                      <div className="flex flex-col gap-1">
                        <Label className="text-[0.7rem] font-medium text-muted-foreground">
                          Conditions or Notes (optional)
                        </Label>
                        <Input
                          value={fee.conditions || ""}
                          onChange={(e) => handleUpdateFee(idx, { conditions: e.target.value })}
                          placeholder="e.g. Per vehicle, DSLR only, required ID"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddFee("OTHER")}
              className="h-8 text-xs"
            >
              <Plus className="size-3.5 mr-1 text-primary" /> Add Custom Fee Entry
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
