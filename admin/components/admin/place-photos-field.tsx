"use client";

import { ArrowDown, ArrowUp, ImagePlus, Loader2, Trash2 } from "lucide-react";
import * as React from "react";

import { validateImageFile } from "@/lib/api/upload";

export type PlacePhoto = {
  id: string;
  url: string;
  preview: string;
  file?: File;
  sourceKey?: string;
  uploading?: boolean;
  error?: string;
};

export function photosFromUrls(urls: string[]): PlacePhoto[] {
  return urls.map((url, index) => ({ id: `${url}-${index}`, url, preview: url }));
}

export function PlacePhotosField({
  value,
  onChange,
}: {
  value: PlacePhoto[];
  onChange: React.Dispatch<React.SetStateAction<PlacePhoto[]>>;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [validationErrors, setValidationErrors] = React.useState<string[]>([]);

  function selectFiles(files: FileList | null) {
    if (!files?.length) return;
    const nextItems: PlacePhoto[] = [];
    const nextErrors: string[] = [];

    for (const file of Array.from(files)) {
      const error = validateImageFile(file);
      if (error) {
        nextErrors.push(`${file.name}: ${error}`);
        continue;
      }
      const sourceKey = `${file.name}:${file.size}:${file.lastModified}`;
      if (value.some((photo) => photo.sourceKey === sourceKey)) continue;
      nextItems.push({
        id: crypto.randomUUID(),
        url: "",
        preview: URL.createObjectURL(file),
        file,
        sourceKey,
      });
    }

    setValidationErrors(nextErrors);
    if (!nextItems.length) return;
    onChange((current) => [...current, ...nextItems]);
  }

  function removePhoto(photo: PlacePhoto) {
    if (photo.preview.startsWith("blob:")) URL.revokeObjectURL(photo.preview);
    onChange((current) => current.filter((item) => item.id !== photo.id));
  }

  function movePhoto(index: number, offset: -1 | 1) {
    const destination = index + offset;
    if (destination < 0 || destination >= value.length) return;
    onChange((current) => {
      const reordered = [...current];
      [reordered[index], reordered[destination]] = [reordered[destination], reordered[index]];
      return reordered;
    });
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        className="sr-only"
        onChange={(event) => {
          selectFiles(event.target.files);
          event.currentTarget.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm font-medium hover:bg-muted/40"
      >
        <ImagePlus className="size-4" /> Add Photos
      </button>
      <p className="text-xs text-muted-foreground">PNG, JPG or WEBP. Maximum 5 MB per photo.</p>
      {validationErrors.map((error) => (
        <p key={error} role="alert" className="text-xs text-destructive">{error}</p>
      ))}
      {value.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.map((photo, index) => (
            <div key={photo.id} className="overflow-hidden rounded-md border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.preview} alt={`Place photo ${index + 1}`} className="aspect-square w-full object-cover" />
              <div className="flex items-center justify-between gap-1 p-2">
                <span className="min-w-0 truncate text-xs text-muted-foreground">
                  {photo.uploading ? "Uploading…" : photo.error ? "Upload failed" : photo.file?.name ?? (index === 0 ? "Primary photo" : `Photo ${index + 1}`)}
                </span>
                <div className="flex shrink-0 items-center">
                  {photo.uploading ? <Loader2 className="mr-1 size-4 animate-spin" /> : null}
                  <button type="button" title="Move photo earlier" aria-label="Move photo earlier" disabled={index === 0} onClick={() => movePhoto(index, -1)} className="rounded p-1 hover:bg-muted disabled:opacity-40">
                    <ArrowUp className="size-3.5" />
                  </button>
                  <button type="button" title="Move photo later" aria-label="Move photo later" disabled={index === value.length - 1} onClick={() => movePhoto(index, 1)} className="rounded p-1 hover:bg-muted disabled:opacity-40">
                    <ArrowDown className="size-3.5" />
                  </button>
                  <button type="button" title="Delete photo" aria-label="Delete photo" onClick={() => removePhoto(photo)} className="rounded p-1 text-destructive hover:bg-muted">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              {photo.error ? <p role="alert" className="px-2 pb-2 text-xs text-destructive">{photo.error}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}