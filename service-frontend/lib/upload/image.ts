/**
 * Client-safe image upload rules, shared by the file picker and the server
 * action. Deliberately free of any Cloudinary credentials: the API key and
 * secret live only in the backend, which performs the actual upload and returns
 * the secure URL. Nothing here may ever be given a secret.
 *
 * The values mirror the backend upload endpoint
 * (`backend/src/app_config/routes/upload.routes.ts`): a single multipart field
 * named `file`, 5 MB maximum, and image MIME types only.
 */
export const CLOUDINARY_URL_PREFIX = "https://res.cloudinary.com/";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** `accept` attribute for the hidden file input. */
export const ACCEPTED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

export const ACCEPT_ATTRIBUTE = [
  ...ACCEPTED_IMAGE_EXTENSIONS,
  ...ACCEPTED_IMAGE_TYPES,
].join(",");

export const IMAGE_SIZE_LABEL = "JPG, PNG or WEBP · up to 5 MB";

/** Folder on Cloudinary, under the backend's `tourism-app` root. */
export const PROFILE_PHOTO_FOLDER = "provider-profiles";

/**
 * Client-side guard so an obviously wrong file never costs a round-trip. The
 * server action repeats every one of these checks, because the browser is not
 * trusted to have run them.
 */
export function validateImageFile(file: File | null | undefined): string | null {
  if (!file) return "No image file was selected.";

  const isAllowedType = ACCEPTED_IMAGE_TYPES.includes(file.type);
  // Some devices report an empty MIME type, so fall back to the extension
  // before rejecting a file the user believes is a valid photo.
  const looksAllowedByName = ACCEPTED_IMAGE_EXTENSIONS.some((extension) =>
    file.name.toLowerCase().endsWith(extension)
  );

  if (!isAllowedType && !looksAllowedByName) {
    return "Please choose a JPG, PNG or WEBP image.";
  }
  if (file.size === 0) {
    return "That file is empty. Please choose another image.";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "The image must be 5 MB or smaller.";
  }
  return null;
}

/** Guards against storing anything that is not a Cloudinary delivery URL. */
export function isCloudinaryUrl(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(CLOUDINARY_URL_PREFIX);
}

/** Turns a thrown upload error into a sentence a provider can act on. */
export function describeUploadError(error: unknown): string {
  const raw =
    error instanceof Error && error.message ? error.message : "Image upload failed.";
  return /cloudinary is not configured|cloudinary/i.test(raw)
    ? "Image upload is not available right now. Please try again later."
    : raw;
}
