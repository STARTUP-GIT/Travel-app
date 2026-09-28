import "server-only";

import { backendRequest, readJson } from "@/lib/api/server";
import {
  MAX_IMAGE_BYTES,
  isCloudinaryUrl,
  validateImageFile,
} from "@/lib/upload/image";
import { ProviderApiError } from "@/features/provider/api/provider.server";

/**
 * Uploads one image to Cloudinary through the backend's single upload endpoint
 * and returns the Cloudinary `secure_url`.
 *
 * The Cloudinary API secret never reaches this app: the browser sends the file
 * to this server action, and this action forwards it to
 * `POST /api/upload/image` on the backend, which owns the credentials and does
 * the signing. Only the resulting public delivery URL travels back.
 */
export async function uploadImageWithToken(
  token: string,
  file: File,
  folder: string
): Promise<string> {
  // Re-validated server side: the browser's checks cannot be trusted, and the
  // file arrives here as untrusted input.
  const invalid = validateImageFile(file);
  if (invalid) {
    throw new ProviderApiError(invalid, 400, {});
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ProviderApiError("The image must be 5 MB or smaller.", 413, {});
  }

  const formData = new FormData();
  formData.append("file", file, file.name || "photo.jpg");
  formData.append("folder", folder);

  // `backendRequest` forwards FormData untouched and does not set a
  // content-type, so Node adds the multipart boundary itself.
  const res = await backendRequest("/api/upload/image", {
    method: "POST",
    body: formData,
    token,
  });

  const data = await readJson<{
    success?: boolean;
    url?: string;
    publicId?: string;
    error?: string;
    details?: string;
  }>(res);

  if (!res.ok || !data?.success || typeof data?.url !== "string") {
    throw new ProviderApiError(
      data?.details ??
        data?.error ??
        `The image could not be uploaded (HTTP ${res.status}).`,
      res.status,
      {}
    );
  }

  // Only ever persist a real Cloudinary delivery URL. A base64 data URL, a blob
  // URL or a local path must never reach the database.
  if (!isCloudinaryUrl(data.url)) {
    throw new ProviderApiError(
      "The upload did not return a valid Cloudinary URL.",
      502,
      {}
    );
  }

  return data.url;
}
