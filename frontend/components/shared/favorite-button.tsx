"use client";

import { AnimatePresence, motion } from "motion/react";
import { Heart } from "lucide-react";
import * as React from "react";

import { useFavorites } from "@/features/favorites/hooks/useFavorites";
import type { FavoriteSnapshot, FavoriteTarget } from "@/features/favorites/types";
import { cn } from "@/lib/utils";

type FavoriteButtonProps = {
  id: string;
  type?: FavoriteTarget;
  className?: string;
  /** Position the button over imagery with a frosted chip look. */
  overlay?: boolean;
  label?: boolean;
  /** Snapshot metadata recorded so the Saved screen can render the item. */
  name?: string;
  image?: string | null;
  districtSlug?: string;
};

export function FavoriteButton({
  id,
  type = "place",
  className,
  overlay = false,
  label = false,
  name,
  image,
  districtSlug,
}: FavoriteButtonProps) {
  const { isSaved, toggle } = useFavorites();
  const saved = isSaved(id, type);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(id, type, { name, image, districtSlug });
      }}
      aria-pressed={saved}
      aria-label={saved ? "Remove from favorites" : "Save to favorites"}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full transition-all active:scale-90",
        overlay
          ? "glass-tint size-10 shadow-sm"
          : "size-10 border border-border/70 bg-card text-muted-foreground shadow-sm hover:text-primary",
        label && "gap-1.5 px-3",
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={saved ? "saved" : "unsaved"}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="inline-flex items-center gap-1.5"
        >
          <Heart
            className={cn(
              "size-[19px] transition-colors",
              saved && "fill-red-500 text-red-500"
            )}
          />
          {label ? <span className="text-xs font-medium">{saved ? "Saved" : "Save"}</span> : null}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}