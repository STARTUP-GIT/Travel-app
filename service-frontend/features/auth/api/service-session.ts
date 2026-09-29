import "server-only";

import { cookies } from "next/headers";

import type { ProviderKind } from "@/features/provider/types";

/**
 * The Express backend issues a JWT named `token` (json body + optional
 * httpOnly cookie on the API host). Cross-origin `sameSite: strict` means the
 * service frontend never receives that cookie, so this app keeps the same JWT
 * in an httpOnly cookie on its own origin and sends it as
 * `Authorization: Bearer` on every backend call.
 */
export const SERVICE_SESSION_COOKIE = "token";

/** Matches `generateSessionToken` (`expiresIn: "1h"`). */
const SESSION_MAX_AGE_SECONDS = 60 * 60;

const ROLE_TO_KIND: Record<string, ProviderKind> = {
  hotel_owner: "hotel",
  restaurent_owner: "restaurant",
  common_guide: "common_guide",
  specific_guide: "specific_guide",
};

export async function setServiceSession(token: string): Promise<void> {
  const store = await cookies();
  store.set(SERVICE_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearServiceSession(): Promise<void> {
  const store = await cookies();
  store.delete(SERVICE_SESSION_COOKIE);
}

export async function readServiceSessionToken(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(SERVICE_SESSION_COOKIE)?.value?.trim();
  return value || null;
}

/**
 * Reads the `role` claim from the backend JWT without verifying the
 * signature. Verification is the backend middleware's job (`JWT_SECRET`).
 */
export function providerKindFromToken(token: string): ProviderKind | null {
  const parts = token.split(".");
  if (parts.length < 2 || !parts[1]) return null;

  try {
    const json = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(json) as { role?: unknown };
    if (typeof payload.role !== "string") return null;
    return ROLE_TO_KIND[payload.role] ?? null;
  } catch {
    return null;
  }
}
