"use client";

import { AnimatePresence, motion } from "motion/react";
import { Expand, X } from "lucide-react";
import * as React from "react";

import { AppImage } from "@/components/shared/app-image";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type GalleryCategory = {
  label: string;
  images: string[];
};

type ImageGalleryProps = {
  images: string[];
  name: string;
  /** Optional labelled categories (e.g. Exterior / Interior / Events). */
  categories?: GalleryCategory[];
};

const COUNT_PER_TAB = {
  ALL: 300,
  CATEGORY: 300,
} as const;

export function ImageGallery({ images, name, categories }: ImageGalleryProps) {
  const hasCategories =
    categories && categories.length > 0 && categories.some((c) => c.images.length > 0);

  const [active, setActive] = React.useState<string>(hasCategories ? categories![0].label : "All");
  const [lightboxIndex, setLightboxIndex] = React.useState<number | null>(null);

  const currentImages = React.useMemo(() => {
    if (!hasCategories) return images;
    const cat = categories!.find((c) => c.label === active);
    return cat ? cat.images : images;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, images, JSON.stringify(categories)]);

  const gallery = currentImages.filter(Boolean).slice(0, COUNT_PER_TAB.ALL);
  if (gallery.length === 0) return null;

  function openLightbox(i: number) {
    setLightboxIndex(i);
  }

  const tabs = hasCategories
    ? ["All", ...categories!.map((c) => c.label)]
    : null;

  return (
    <div>
      {tabs ? (
        <div className="scroll-row mb-4 -mx-4 px-4 lg:mx-0 lg:px-0">
          {tabs.map((tab) => {
            const isCat = tab !== "All";
            const count = isCat
              ? categories!.find((c) => c.label === tab)?.images.length ?? 0
              : images.filter(Boolean).length;
            const selected = active === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActive(tab)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                )}
              >
                {tab}
                <span className={cn("text-xs", selected ? "text-white/80" : "text-muted-foreground")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {gallery.map((src, i) => (
          <button
            key={`${src}-${i}`}
            type="button"
            onClick={() => openLightbox(i)}
            className={cn(
              "group relative w-full overflow-hidden rounded-2xl bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              i === 0 ? "col-span-2 row-span-2 aspect-square sm:aspect-video" : "aspect-square"
            )}
            aria-label={`View image ${i + 1} of ${gallery.length}`}
          >
            <AppImage
              src={src}
              alt={`${name} photo ${i + 1}`}
              className="transition-transform duration-500 group-hover:scale-105"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-opacity group-hover:bg-black/20 group-hover:opacity-100">
              <Expand className="size-6 text-white drop-shadow" />
            </span>
          </button>
        ))}
      </div>

      <Lightbox
        images={gallery}
        name={name}
        open={lightboxIndex !== null}
        index={lightboxIndex ?? 0}
        onIndexChange={setLightboxIndex}
        onClose={() => setLightboxIndex(null)}
      />
    </div>
  );
}

function Lightbox({
  images,
  name,
  open,
  index,
  onIndexChange,
  onClose,
}: {
  images: string[];
  name: string;
  open: boolean;
  index: number;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndexChange((index + 1) % images.length);
      if (e.key === "ArrowLeft") onIndexChange((index - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, index, images.length, onIndexChange, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex flex-col bg-black/95"
          role="dialog"
          aria-modal="true"
          aria-label={`${name} photo viewer`}
        >
          <div className="flex items-center justify-between p-4 text-white">
            <span className="text-sm text-white/80">
              {index + 1} / {images.length}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="flex size-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
              aria-label="Close image viewer"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="relative flex flex-1 items-center justify-center overflow-hidden px-2 pb-6">
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="relative h-full w-full"
            >
              <AnimatePresence mode="wait">
                <motion.img
                  key={images[index]}
                  src={images[index]}
                  alt={`${name} photo ${index + 1}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="size-full object-contain"
                  draggable={false}
                />
              </AnimatePresence>
            </motion.div>
          </div>

          <div className="scroll-row safe-bottom items-center justify-center px-4 pb-4">
            {images.map((src, i) => (
              <button
                key={src + i}
                type="button"
                onClick={() => onIndexChange(i)}
                className={cn(
                  "size-14 overflow-hidden rounded-lg border-2 transition-all",
                  i === index ? "border-primary opacity-100" : "border-transparent opacity-50"
                )}
                aria-label={`Jump to image ${i + 1}`}
              >
                <AppImage src={src} alt={`${name} thumbnail ${i + 1}`} />
              </button>
            ))}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function GalleryHint({ images, name }: { images: string[]; name: string }) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant="info" className="gap-1">
        <Expand className="size-3" /> {images.length} photos
      </Badge>
    </div>
  );
}