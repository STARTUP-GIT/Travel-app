"use client";

import { Camera, Loader2, Trash2, Upload, X } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { AppImage } from "@/components/shared/app-image";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ACCEPT_ATTRIBUTE,
  IMAGE_SIZE_LABEL,
  describeUploadError,
  validateImageFile,
} from "@/lib/upload/image";

type Props = {
  /**
   * The image currently shown in the box. In the profile editor this is the
   * saved Cloudinary URL; while registering it is the local preview of the
   * file that has been chosen but not uploaded yet.
   */
  value: string | null;
  /** Shown instead of an image when there is nothing to display. */
  fallbackLabel: string;
  disabled?: boolean;
  /**
   * Uploads the file and resolves with the Cloudinary URL. Provided by the
   * profile editor, which already has a session and uploads immediately.
   * Mutually exclusive with `onPick`.
   */
  upload?: (file: File) => Promise<string>;
  /**
   * Receives the validated file without uploading it. Used by the signup form,
   * where no session exists until the account exists, so the file is uploaded
   * by the registration action itself.
   * Mutually exclusive with `upload`.
   */
  onPick?: (file: File) => void;
  /** Called when the user clears the photo. */
  onChange?: (url: string) => void;
  /** Hint under the box, e.g. to explain when the upload really happens. */
  hint?: string;
};

/**
 * Profile photo picker. The provider always picks a file from their device:
 * there is no text field for a URL anywhere in this flow, so a photo URL can
 * never be typed in by hand.
 *
 * The local file, its object URL and any base64 data are never stored. Either
 * the file is uploaded straight away and only the Cloudinary delivery URL is
 * kept, or (while registering) the file is handed to the registration action,
 * which uploads it with the session it creates.
 */
export function PhotoUploadField({
  value,
  fallbackLabel,
  disabled = false,
  upload,
  onPick,
  onChange,
  hint,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const previewRef = React.useRef<string | null>(null);
  const [preview, setPreview] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Object URLs are revoked when replaced or unmounted so the blob is not held
  // in memory for the life of the page.
  React.useEffect(() => {
    previewRef.current = preview;
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, [preview]);

  const display = preview ?? (value ? value : null);
  const isDeferred = !upload;

  function clearPreview() {
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
    setFileName(null);
  }

  async function handleFile(file: File) {
    // Checked here so an obviously wrong file never costs a round-trip, and
    // again on the server because the browser cannot be trusted to have run it.
    const invalid = validateImageFile(file);
    if (invalid) {
      setError(invalid);
      toast.error(invalid);
      return;
    }

    setError(null);
    setFileName(file.name);
    setPreview(URL.createObjectURL(file));

    // Registration has no session yet: the file is passed on and uploaded by
    // the registration action once the account exists.
    if (isDeferred) {
      onPick?.(file);
      return;
    }

    setUploading(true);
    try {
      const url = await upload!(file);
      // Only the Cloudinary URL is propagated. The local file is discarded.
      onChange?.(url);
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
    onChange?.("");
    onPick?.(undefined as unknown as File);
    toast.info("Photo removed", {
      description: "Save your changes to apply this.",
    });
  }

  const buttonLabel = uploading
    ? "Uploading…"
    : display
      ? "Change Photo"
      : "Upload Photo";

  return (
    <div className="space-y-1.5">
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
              ) : display ? (
                <Camera className="size-4" />
              ) : (
                <Upload className="size-4" />
              )}
              {buttonLabel}
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

            {uploading ? (
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

          {hint ? (
            <p className="text-xs text-muted-foreground">{hint}</p>
          ) : null}

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
