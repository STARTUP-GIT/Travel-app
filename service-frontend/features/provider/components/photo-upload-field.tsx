"use client";

import { Camera, Loader2, Trash2, Upload, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { AppImage } from "@/components/shared/app-image";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadProfilePhoto } from "@/features/provider/api/provider.actions";
import {
  ACCEPT_ATTRIBUTE,
  IMAGE_SIZE_LABEL,
  describeUploadError,
  validateImageFile,
} from "@/lib/upload/image";

type Props = {
  /** The saved Cloudinary URL, or null/empty when there is no photo. */
  value: string | null;
  /** Receives the new Cloudinary URL, or "" when the photo is removed. */
  onChange: (url: string) => void;
  /** Falls back to this when there is no photo yet, e.g. the provider name. */
  fallbackLabel: string;
  disabled?: boolean;
};

/**
 * Profile photo picker. The provider always selects a file from their device:
 * there is no text field for a URL anywhere in this flow.
 *
 * Selecting a file shows a local preview immediately, then uploads it to
 * Cloudinary through the backend and hands the returned secure URL upwards. The
 * local file, its object URL, and any base64 data are never stored — only the
 * Cloudinary delivery URL is, in the existing `profile_pic` field.
 */
export function PhotoUploadField({
  value,
  onChange,
  fallbackLabel,
  disabled = false,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const previewRef = React.useRef<string | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Object URLs are revoked when they are replaced or unmounted so the blob is
  // not held in memory for the life of the page.
  React.useEffect(() => {
    previewRef.current = preview;
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, [preview]);

  const display = preview ?? (value ? value : null);
  const initial = value ? value : null;

  function clearPreview() {
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setFileName(null);
  }

  async function handleFile(file: File) {
    const invalid = validateImageFile(file);
    if (invalid) {
      setError(invalid);
      toast.error(invalid);
      return;
    }

    setError(null);
    setFileName(file.name);
    setPreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const result = await uploadProfilePhoto(file);
      if (!result.ok) {
        setError(result.message);
        clearPreview();
        toast.error(result.message);
        return;
      }
      // Only the Cloudinary URL is propagated. The local file is discarded.
      onChange(result.data);
      clearPreview();
      toast.success("Photo uploaded", {
        description: "Save your changes to keep this photo.",
      });
    } catch (uploadError) {
      const message = describeUploadError(uploadError);
      setError(message);
      clearPreview();
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    clearPreview();
    setError(null);
    onChange("");
    toast.info("Photo removed", {
      description: "Save your changes to apply this.",
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label>Profile Photo</Label>

      <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-3">
        <div className="relative size-20 shrink-0">
          {display ? (
            <AppImage
              key={display}
              src={display}
              alt={fallbackLabel}
              className="size-20 rounded-full"
              fallbackClassName="rounded-full"
              draggable={false}
            />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
              {fallbackLabel.charAt(0).toUpperCase() || "P"}
            </div>
          )}

          {uploading ? (
            <div
              role="status"
              aria-label="Uploading photo"
              className="absolute inset-0 flex items-center justify-center rounded-full bg-background/75"
            >
              <Loader2 className="size-5 animate-spin text-primary" />
            </div>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTRIBUTE}
            className="hidden"
            disabled={disabled || uploading}
            aria-label="Choose a profile photo"
            onChange={(event) => {
              const file = event.target.files?.[0];
              // Reset first so choosing the same file twice still fires onChange.
              event.target.value = "";
              if (file) void handleFile(file);
            }}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full"
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : display && display !== initial ? (
                <Camera className="size-4" />
              ) : (
                <Upload className="size-4" />
              )}
              {uploading
                ? "Uploading…"
                : display
                  ? "Replace Photo"
                  : "Upload Photo"}
            </Button>

            {display ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="rounded-full text-destructive"
                disabled={disabled || uploading}
                onClick={handleRemove}
              >
                <Trash2 className="size-4" />
                Remove
              </Button>
            ) : null}

            {uploading && fileName ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="rounded-full"
                onClick={() => {
                  clearPreview();
                  setError(null);
                }}
              >
                <X className="size-4" />
                Cancel
              </Button>
            ) : null}
          </div>

          <p className="mt-1.5 text-xs text-muted-foreground">
            {uploading ? `Uploading ${fileName ?? "photo"}…` : IMAGE_SIZE_LABEL}
          </p>

          {error ? (
            <p role="alert" className="mt-1 text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
