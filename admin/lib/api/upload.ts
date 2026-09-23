import { http } from "@/lib/api/client";

/**
 * Central image-upload helper for the admin panel. Sends the real file
 * (multipart/form-data) to the backend's single Cloudinary upload endpoint
 * (POST /api/upload/image) and resolves with the returned Cloudinary
 * secure_url. No URL is ever manually typed by the admin; only the secure_url
 * returned by Cloudinary is stored in the existing database fields.
 */

const CLOUDINARY_URL_PREFIX = "https://res.cloudinary.com/";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const ACCEPTED_ICON_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
];

export type UploadedImage = {
  url: string;
  publicId: string;
};

type UploadResponse = {
  success?: boolean;
  url?: string;
  publicId?: string;
  error?: string;
  details?: string;
};

/**
 * Client-side validation. `allowSvg` is only used for the branding app icon,
 * mirroring the backend's allowed types (the shared endpoint accepts SVG so
 * the icon can use it; profile/banner uploads stay PNG/JPG/WEBP).
 */
export function validateImageFile(
  file: File,
  opts: { allowSvg?: boolean } = {}
): string | null {
  if (!file || file.size === 0) {
    return "No image file was selected.";
  }
  const allowed = opts.allowSvg ? ACCEPTED_ICON_TYPES : ACCEPTED_IMAGE_TYPES;
  if (!allowed.includes(file.type)) {
    return opts.allowSvg
      ? "Please choose a PNG, JPG, WEBP or SVG image."
      : "Please choose a PNG, JPG or WEBP image.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Image must be 5 MB or smaller.";
  }
  return null;
}

/** Uploads one image file to Cloudinary and resolves with the secure_url. */
export async function uploadImage(
  file: File,
  folder: string
): Promise<UploadedImage> {
  const formData = new FormData();
  formData.append("file", file, file.name || "image.png");
  formData.append("folder", folder);

  const data = await http<UploadResponse>("/api/upload/image", {
    method: "POST",
    body: formData,
  });

  if (!data?.success || !data.url) {
    throw new Error(data?.details ?? data?.error ?? "Image upload failed.");
  }
  if (!data.url.startsWith(CLOUDINARY_URL_PREFIX)) {
    throw new Error("Upload did not return a valid Cloudinary URL.");
  }
  return { url: data.url, publicId: data.publicId ?? "" };
}

/**
 * Turns a thrown upload error into a user-facing message. The backend reports
 * missing Cloudinary credentials as "Cloudinary is not configured"; the UI is
 * told plainly that uploading is unavailable.
 */
export function describeUploadError(error: unknown): string {
  const raw =
    error instanceof Error ? error.message : "Image upload failed";
  return /not configured|cloudinary/i.test(raw)
    ? "Image upload is not configured."
    : raw;
}