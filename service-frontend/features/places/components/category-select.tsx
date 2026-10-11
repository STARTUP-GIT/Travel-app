"use client";

import * as React from "react";
import { Check, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const STANDARD_CATEGORIES = [
  "Adventure",
  "Art & Culture",
  "Beach",
  "Dam",
  "Fort",
  "Garden",
  "Heritage",
  "Hill Station",
  "Historical Site",
  "Lake",
  "Monument",
  "Museum",
  "Nature",
  "Park",
  "Pilgrimage",
  "Religious",
  "Shopping & Bazaar",
  "Temple",
  "Trek & Trails",
  "Viewpoint",
  "Waterfall",
  "Wildlife",
] as const;

export function CategoryMultiSelect({
  selected,
  onChange,
  error,
}: {
  selected: string[];
  onChange: (categories: string[]) => void;
  error?: string;
}) {
  const [search, setSearch] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const trimmedSearch = search.trim();
  const searchLower = trimmedSearch.toLowerCase();

  const filteredStandard = STANDARD_CATEGORIES.filter(
    (cat) =>
      !selected.some((s) => s.toLowerCase() === cat.toLowerCase()) &&
      cat.toLowerCase().includes(searchLower)
  );

  const isExactMatch = STANDARD_CATEGORIES.some(
    (cat) => cat.toLowerCase() === searchLower
  ) || selected.some((s) => s.toLowerCase() === searchLower);

  function addCategory(cat: string) {
    const trimmed = cat.trim();
    if (!trimmed) return;
    if (selected.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return;
    onChange([...selected, trimmed]);
    setSearch("");
  }

  function removeCategory(catToRemove: string) {
    onChange(selected.filter((c) => c !== catToRemove));
  }

  return (
    <div className="flex flex-col gap-2" ref={containerRef}>
      <div className="flex items-center justify-between">
        <Label htmlFor="category-search-input">
          Categories <span className="text-destructive">*</span>
        </Label>
        <span className="text-xs text-muted-foreground">
          {selected.length === 0
            ? "Pick one or more"
            : `${selected.length} selected`}
        </span>
      </div>

      {/* Selected Chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-border/70 bg-muted/30 p-2">
          {selected.map((cat) => (
            <Badge
              key={cat}
              variant="secondary"
              className="gap-1.5 py-1 pl-2.5 pr-1.5 text-xs font-medium shadow-none transition-all hover:bg-secondary/80"
            >
              <span>{cat}</span>
              <button
                type="button"
                onClick={() => removeCategory(cat)}
                className="flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                aria-label={`Remove category ${cat}`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search and Add Input */}
      <div className="relative">
        <Input
          id="category-search-input"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={
            selected.length === 0
              ? "Search or type category (e.g. Heritage, Temple, Nature)…"
              : "Add another category…"
          }
          className="text-sm"
        />

        {isOpen && (
          <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-popover p-1.5 shadow-lg">
            {filteredStandard.length > 0 ? (
              <div className="flex flex-col gap-0.5">
                {filteredStandard.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => addCategory(cat)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-foreground transition-colors hover:bg-accent"
                  >
                    <span>{cat}</span>
                    <Plus className="size-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            ) : null}

            {trimmedSearch && !isExactMatch ? (
              <div className={cn(filteredStandard.length > 0 && "mt-1 border-t border-border pt-1")}>
                <button
                  type="button"
                  onClick={() => addCategory(trimmedSearch)}
                  className="flex w-full items-center justify-between rounded-lg bg-primary/10 px-2.5 py-2 text-left text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                >
                  <span>Add custom category &ldquo;{trimmedSearch}&rdquo;</span>
                  <Plus className="size-3.5" />
                </button>
              </div>
            ) : null}

            {filteredStandard.length === 0 && !trimmedSearch ? (
              <p className="p-2 text-center text-xs text-muted-foreground">
                All standard categories already added. Type to add a custom one.
              </p>
            ) : null}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-[0.75rem] text-muted-foreground">
        Select standard categories or add custom ones. Categories help travellers discover your place.
      </p>
    </div>
  );
}
