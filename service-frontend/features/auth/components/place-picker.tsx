"use client";

import { Check, MapPin } from "lucide-react";
import * as React from "react";

import { LoadingState } from "@/components/shared/loading-state";
import { ErrorState } from "@/components/shared/states";
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
import { useAsync } from "@/lib/hooks/use-async";
import { getDistricts } from "@/features/locations/api/locations.api";
import { getPlaces } from "@/features/places/api/places.api";
import { cn } from "@/lib/utils";

/**
 * A guide can only be registered against places the admin has approved, so this
 * reads the real district and place lists from the public API rather than
 * offering a free-text district. A specific guide is limited to a single place;
 * a common guide can cover several. Picking a place is optional for both — the
 * guide may register first and cover places later — so the district only gates
 * which places are offered, it is never the thing being validated.
 */
export function PlacePicker({
  value,
  onChange,
  multiple,
  error,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  multiple: boolean;
  error?: string;
}) {
  const [districtId, setDistrictId] = React.useState("");

  const districts = useAsync(() => getDistricts(), []);
  const places = useAsync(
    () => (districtId ? getPlaces(districtId) : Promise.resolve([])),
    [districtId]
  );

  const selected = new Set(value);

  function toggle(id: string) {
    if (multiple) {
      onChange(
        selected.has(id) ? value.filter((item) => item !== id) : [...value, id]
      );
    } else {
      // Clicking the chosen place again clears it, so a guide who picked one by
      // mistake can get back to the "no place yet" state.
      onChange(selected.has(id) ? [] : [id]);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="place-district">District</Label>
      <Select
        value={districtId}
        onValueChange={(next) => {
          setDistrictId(next);
          // Places from another district are never valid, so the selection is
          // cleared rather than silently carried over.
          onChange([]);
        }}
      >
        <SelectTrigger id="place-district" className="w-full">
          <SelectValue placeholder="Select a district" />
        </SelectTrigger>
        <SelectContent>
          {(districts.data ?? []).map((district) => (
            <SelectItem key={district.id} value={district.id}>
              {district.name}
              {district.state?.name ? `, ${district.state.name}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Label className="text-muted-foreground">
        {multiple ? "Places (optional)" : "Place (optional)"}
      </Label>

      {!districtId ? (
        <p className="text-xs text-muted-foreground">
          {multiple
            ? "Pick a district to see the places you can cover."
            : "Pick a district to see the place you can cover."}{" "}
          You can also leave this empty and add {multiple ? "places" : "a place"}{" "}
          later.
        </p>
      ) : places.isLoading ? (
        <LoadingState label="Loading places…" />
      ) : places.error ? (
        <ErrorState
          title="Places unavailable"
          description="The place list could not be loaded. Please try again."
          retry={places.refetch}
        />
      ) : (places.data ?? []).length === 0 ? (
        <p className="text-xs text-muted-foreground">
          This district has no approved places yet.
        </p>
      ) : (
        <div className="grid max-h-56 gap-2 overflow-y-auto rounded-2xl border border-border p-2">
          {(places.data ?? []).map((place) => {
            const active = selected.has(place.id);
            return (
              <button
                key={place.id}
                type="button"
                role="checkbox"
                aria-checked={active}
                onClick={() => toggle(place.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-accent"
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
                  )}
                >
                  {active ? <Check className="size-3.5" /> : null}
                </span>
                <span className="min-w-0 flex-1 truncate">{place.name}</span>
                <Badge variant="outline" className="shrink-0 text-[0.6rem]">
                  <MapPin className="size-3" />
                  {place.category}
                </Badge>
              </button>
            );
          })}
        </div>
      )}

      {value.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {value.length} place{value.length === 1 ? "" : "s"} selected
          {!multiple ? " — a place guide can be linked to one place only." : "."}
        </p>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

/** Free-form chips input for the guide language list. */
export function LanguageInput({
  value,
  onChange,
  error,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
}) {
  const [draft, setDraft] = React.useState("");

  function commit(raw: string) {
    const language = raw.trim();
    if (!language) return;
    if (value.some((item) => item.toLowerCase() === language.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, language]);
    setDraft("");
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="language">Languages you speak</Label>
      <div className="flex gap-2">
        <Input
          id="language"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === ",") {
              event.preventDefault();
              commit(draft);
            }
          }}
          placeholder="Kannada, English, Hindi"
        />
        <Button type="button" variant="outline" onClick={() => commit(draft)}>
          Add
        </Button>
      </div>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((language) => (
            <Badge key={language} variant="info" className="gap-1">
              {language}
              <button
                type="button"
                aria-label={`Remove ${language}`}
                onClick={() => onChange(value.filter((item) => item !== language))}
                className="text-primary/70 hover:text-primary"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
