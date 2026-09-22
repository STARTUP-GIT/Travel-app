import { ApiError } from "@/lib/api/client";

export function getApiBaseUrl(): string {
  const url = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "";

  if (!url) {
    throw new ApiError(
      "Backend API URL is not configured. Set BACKEND_URL in the admin .env.",
      500
    );
  }

  return url.replace(/\/+$/, "");
}