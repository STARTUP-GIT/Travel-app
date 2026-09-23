import { ApiError } from "@/lib/api/client";

export function getApiBaseUrl(): string {
  // Same mechanism as the working customer frontend (frontend/lib/api/client.ts):
  // NEXT_PUBLIC_API_URL is inlined into the browser bundle (browser signup calls
  // need it); BACKEND_URL is used server-side by NextAuth.
  const url = process.env.NEXT_PUBLIC_API_URL ?? process.env.BACKEND_URL ?? "";

  if (!url) {
    throw new ApiError(
      "Backend API URL is not configured. Set NEXT_PUBLIC_API_URL (or BACKEND_URL) in the admin Vercel project environment variables.",
      500
    );
  }

  return url.replace(/\/+$/, "");
}