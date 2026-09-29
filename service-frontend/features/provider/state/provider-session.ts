import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import {
  clearServiceSession,
  providerKindFromToken,
  readServiceSessionToken,
} from "@/features/auth/api/service-session";
import {
  getProviderProfile,
  ProviderApiError,
} from "@/features/provider/api/provider.server";
import type { ProviderKind } from "@/features/provider/types";

/**
 * The session every provider screen works from. Built from the backend JWT
 * stored on this origin, then confirmed against the provider profile endpoint.
 */
export type ProviderSession = {
  kind: ProviderKind;
  token: string;
  email: string;
  name: string;
  /**
   * The account's own `username`, taken from the backend profile.
   */
  username: string;
  image: string | null;
  userId: string;
};

async function loadSessionFromBackendToken(): Promise<ProviderSession | null> {
  const token = await readServiceSessionToken();
  if (!token) return null;

  const kind = providerKindFromToken(token);
  if (!kind) {
    await clearServiceSession();
    return null;
  }

  try {
    const profile = await getProviderProfile(token, kind);
    return {
      kind,
      token,
      email: profile.email,
      name: profile.name,
      username: profile.username,
      image: profile.photo,
      userId: profile.id,
    };
  } catch (error) {
    if (
      error instanceof ProviderApiError &&
      (error.status === 401 || error.status === 403 || error.status === 404)
    ) {
      await clearServiceSession();
      return null;
    }
    throw error;
  }
}

/** Deduped per request so layout + page share one profile lookup. */
export const getProviderSession = cache(
  async (): Promise<ProviderSession | null> => loadSessionFromBackendToken()
);

/** For pages that must redirect to the sign-in screen. */
export async function requireProviderSession(
  redirectTo = "/dashboard"
): Promise<ProviderSession> {
  const session = await getProviderSession();
  if (!session) redirect(`/login?next=${encodeURIComponent(redirectTo)}`);
  return session;
}

/**
 * Guards provider screens. Hotel and restaurant owners get their own app; the
 * two guide kinds share the same app but must not be able to open each other's
 * kind-specific screens.
 */
export async function requireProvider(
  allowed?: ProviderKind[],
  redirectTo = "/dashboard"
): Promise<ProviderSession> {
  const session = await requireProviderSession(redirectTo);
  if (allowed && !allowed.includes(session.kind)) redirect("/dashboard");
  return session;
}
