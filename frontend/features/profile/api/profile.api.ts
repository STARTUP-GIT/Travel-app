import {
  getProfileAction,
  updateProfileAction,
  uploadProfilePhotoAction,
} from "./profile.actions";
import type { CustomerProfile, UpdateProfileInput } from "@/features/profile/types";

/**
 * Customer profile API. Transport is server-side (server actions) — there is
 * no /api/proxy and no backend token ever reaches the browser. The exported
 * function signatures are unchanged for existing callers.
 */
export async function getProfile(): Promise<CustomerProfile> {
  const result = await getProfileAction();
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

export async function updateProfile(
  input: UpdateProfileInput
): Promise<CustomerProfile> {
  const result = await updateProfileAction(input);
  if (!result.ok) throw new Error(result.message);
  return result.data;
}

/**
 * Uploads a locally selected image file through the backend's Cloudinary
 * upload endpoint and resolves with the Cloudinary secure_url.
 */
export async function uploadProfilePhoto(file: File): Promise<string> {
  const result = await uploadProfilePhotoAction(file);
  if (!result.ok) throw new Error(result.message);
  return result.data;
}
