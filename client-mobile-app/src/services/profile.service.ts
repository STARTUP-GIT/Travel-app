/**
 * Customer profile and photo upload.
 *
 * Identity always comes from the session token — the backend reads the id out of
 * the JWT and ignores anything the client sends — so no user id is ever included
 * in a request body.
 *
 * `updateProfile` forwards only whitelisted fields. Password changes are
 * deliberately not supported by this form: the backend's edit-profile route does
 * not accept a password, and sending one would silently do nothing while
 * implying it succeeded.
 */

import { api, ApiError, asRecord } from "@/lib/api/client";
import type { CustomerProfile, UpdateProfileInput } from "@/types/api";

export async function getProfile(): Promise<CustomerProfile> {
  const data = await api.get<CustomerProfile>("/users/profile/api/getprofile");
  if (!data || typeof data.id !== "string") {
    throw new ApiError("server", "We couldn't load your profile. Please try again.");
  }
  return data;
}

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<CustomerProfile> {
  const payload: UpdateProfileInput = {};
  if (typeof input.name === "string") payload.name = input.name;
  if (typeof input.username === "string") payload.username = input.username;
  if (typeof input.email === "string") payload.email = input.email;
  if (typeof input.phonenumber === "string") payload.phonenumber = input.phonenumber;
  if (typeof input.profilepic === "string") payload.profilepic = input.profilepic;

  const data = await api.patch<{ user?: CustomerProfile }>(
    "/users/profile/api/editprofile",
    payload,
  );

  const user = asRecord(data).user as CustomerProfile | undefined;
  if (!user) {
    throw new ApiError("server", "Your profile was not updated. Please try again.");
  }
  return user;
}

/* -------------------------------------------------------------------------- */
/* Photo upload                                                               */
/* -------------------------------------------------------------------------- */

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const CLOUDINARY_URL_PREFIX = "https://res.cloudinary.com/";

/**
 * Uploads a picked image through the backend's single Cloudinary endpoint
 * (`POST /api/upload/image`, multipart field `file`) and returns its secure URL.
 *
 * `anyAuthMiddleware` accepts a customer session, so this works with the same
 * token as everything else. The Cloudinary secret stays on the server.
 */
export async function uploadProfilePhoto(file: {
  uri: string;
  name?: string;
  mimeType?: string;
  size?: number;
}): Promise<string> {
  if (!file?.uri) {
    throw new ApiError("validation", "No image file was selected.");
  }
  if (file.mimeType && !ALLOWED_MIME_TYPES.includes(file.mimeType)) {
    throw new ApiError("validation", "Please choose a PNG, JPG or WEBP image.");
  }
  // Only checked when the picker reports a size; `expo-image-picker` omits it for
  // some Android providers, and the server enforces its own 5 MB limit anyway.
  if (typeof file.size === "number" && file.size > MAX_IMAGE_BYTES) {
    throw new ApiError("validation", "Image must be 5 MB or smaller.");
  }

  const form = new FormData();
  form.append("file", {
    uri: file.uri,
    name: file.name ?? "profile.png",
    type: file.mimeType ?? "image/png",
  } as unknown as Blob);
  form.append("folder", "profiles");

  // No Content-Type header: the runtime must set the multipart boundary.
  const data = await api.post<{ success?: boolean; url?: string }>(
    "/api/upload/image",
    form,
    { isMultipart: true, timeoutMs: 60_000 },
  );

  const url = asRecord(data).url;
  if (!url || typeof url !== "string" || !url.startsWith(CLOUDINARY_URL_PREFIX)) {
    throw new ApiError("server", "We couldn't upload that photo. Please try another.");
  }
  return url;
}