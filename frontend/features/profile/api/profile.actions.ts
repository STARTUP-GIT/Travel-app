"use server";

import "server-only";

import { auth } from "@/auth";
import { ApiError, getApiBaseUrl } from "@/lib/api/client";
import type {
  CustomerProfile,
  UpdateProfileInput,
} from "@/features/profile/types";

/**
 * Server-side profile actions.
 *
 * Following the same architecture as auth.actions.ts: there is no /api/proxy —
 * every backend call is made server-side using the backend session token from
 * the NextAuth JWT session. The token and the Cloudinary secret never leave
 * the server, and the backend identifies the customer from the token itself
 * (never from an id supplied by the browser).
 */
export type ProfileActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string };

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const CLOUDINARY_URL_PREFIX = "https://res.cloudinary.com/";

async function getBackendToken(): Promise<string | null> {
  const session = await auth();
  return session?.backendToken ?? null;
}

function failureMessage(error: unknown, fallback: string): string {
  // ApiError messages describe local configuration problems and contain no
  // secrets, so they are safe to surface. Everything else gets a generic
  // message; backend response errors are handled by the callers.
  if (error instanceof ApiError) return error.message;
  return fallback;
}

/** GET the signed-in customer's profile from the existing backend endpoint. */
export async function getProfileAction(): Promise<
  ProfileActionResult<CustomerProfile>
> {
  try {
    const token = await getBackendToken();
    if (!token) {
      return { ok: false, message: "Please sign in again to view your profile." };
    }

    const res = await fetch(`${getApiBaseUrl()}/users/profile/api/getprofile`, {
      method: "GET",
      headers: { cookie: `token=${token}` },
      cache: "no-store",
    });

    const data = (await res.json().catch(() => null)) as
      | (Partial<CustomerProfile> & { message?: string })
      | null;

    if (!res.ok || !data?.id) {
      return {
        ok: false,
        message: data?.message ?? `Could not load your profile (HTTP ${res.status}).`,
      };
    }

    return { ok: true, data: data as CustomerProfile };
  } catch (error) {
    return { ok: false, message: failureMessage(error, "Could not reach the server. Please try again.") };
  }
}

/**
 * PATCH the signed-in customer's profile through the existing
 * /users/profile/api/editprofile endpoint. Only whitelisted fields are
 * forwarded; the identity comes from the session token on the backend side.
 */
export async function updateProfileAction(
  input: UpdateProfileInput
): Promise<ProfileActionResult<CustomerProfile>> {
  try {
    const token = await getBackendToken();
    if (!token) {
      return { ok: false, message: "Session expired. Please sign in again." };
    }

    const payload: UpdateProfileInput = {};
    if (typeof input.name === "string") payload.name = input.name;
    if (typeof input.username === "string") payload.username = input.username;
    if (typeof input.email === "string") payload.email = input.email;
    if (typeof input.phonenumber === "string") payload.phonenumber = input.phonenumber;
    if (typeof input.profilepic === "string") payload.profilepic = input.profilepic;
    // NOTE: password changes are intentionally never forwarded from this form.

    const res = await fetch(`${getApiBaseUrl()}/users/profile/api/editprofile`, {
      method: "PATCH",
      headers: {
        cookie: `token=${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => null)) as
      | { message?: string; user?: CustomerProfile }
      | null;

    if (!res.ok || !data?.user) {
      return {
        ok: false,
        message: data?.message ?? `Profile update failed (HTTP ${res.status}).`,
      };
    }

    return { ok: true, data: data.user };
  } catch (error) {
    return { ok: false, message: failureMessage(error, "Could not reach the server. Please try again.") };
  }
}

/**
 * Send the actual image file (multipart/form-data) to the backend's single
 * upload endpoint, which streams it to Cloudinary and returns the secure URL.
 * Returns the Cloudinary `https://res.cloudinary.com/...` URL.
 */
export async function uploadProfilePhotoAction(
  file: File
): Promise<ProfileActionResult<string>> {
  try {
    if (!file || typeof file === "string" || file.size === 0) {
      return { ok: false, message: "No image file was selected." };
    }
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      return { ok: false, message: "Please choose a PNG, JPG or WEBP image." };
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return { ok: false, message: "Image must be 5 MB or smaller." };
    }

    const token = await getBackendToken();
    if (!token) {
      return { ok: false, message: "Session expired. Please sign in again." };
    }

    const formData = new FormData();
    formData.append("file", file, file.name || "photo.png");
    formData.append("folder", "profiles");

    // No Content-Type header: Node's fetch sets the multipart boundary.
    const res = await fetch(`${getApiBaseUrl()}/api/upload/image`, {
      method: "POST",
      headers: { cookie: `token=${token}` },
      body: formData,
      cache: "no-store",
    });

    const data = (await res.json().catch(() => null)) as
      | { success?: boolean; url?: string; error?: string; details?: string }
      | null;

    const url = data?.url;
    if (!res.ok || !data?.success || !url) {
      return {
        ok: false,
        message:
          data?.details ??
          data?.error ??
          `Photo upload failed (HTTP ${res.status}).`,
      };
    }

    if (!url.startsWith(CLOUDINARY_URL_PREFIX)) {
      return { ok: false, message: "Upload did not return a valid Cloudinary URL." };
    }

    return { ok: true, data: url };
  } catch (error) {
    return { ok: false, message: failureMessage(error, "Could not reach the server. Please try again.") };
  }
}
