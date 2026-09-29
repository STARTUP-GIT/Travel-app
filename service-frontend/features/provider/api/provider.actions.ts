"use server";

import { revalidatePath } from "next/cache";

import {
  clearServiceSession,
  providerKindFromToken,
  readServiceSessionToken,
} from "@/features/auth/api/service-session";
import { PROFILE_PHOTO_FOLDER } from "@/lib/upload/image";
import { uploadImageWithToken } from "@/features/provider/api/upload.server";

import { requireProviderSession } from "@/features/provider/state/provider-session";
import type { ProviderKind } from "@/features/provider/types";
import { ApiError } from "@/lib/api/client";
import {
  ProviderApiError,
  buildStats,
  createProviderListing,
  deleteProviderListing,
  deleteProviderProfile,
  getProviderListings,
  getProviderProfile,
  getProviderRequests,
  updateProviderListing,
  signinWithEmail,
  signoutProvider,
  updateProviderProfile,
  updateProviderRequestStatus,
} from "@/features/provider/api/provider.server";
import type {
  ProviderDashboard,
  ProviderListing,
  ProviderListingsResult,
  ProviderProfile,
  ProviderProfileInput,
  ProviderListingInput,
  ProviderRequest,
  RequestStatus,
} from "@/features/provider/types";

/* -------------------------------------------------------------------------- */
/*  Result envelope                                                            */
/* -------------------------------------------------------------------------- */

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string; fields?: Record<string, string> };

async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (error) {
    if (error instanceof ProviderApiError) {
      return { ok: false, message: error.message, fields: error.fields };
    }
    if (error instanceof ApiError) {
      return { ok: false, message: error.message };
    }
    if (error instanceof Error && error.message) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

/* -------------------------------------------------------------------------- */
/*  Reads                                                                      */
/* -------------------------------------------------------------------------- */

export async function loadProfile(): Promise<ProviderProfile> {
  const session = await requireProviderSession("/profile");
  return getProviderProfile(session.token, session.kind);
}

export async function loadListings(): Promise<ProviderListingsResult> {
  const session = await requireProviderSession("/services");
  return getProviderListings(session.token, session.kind);
}

export async function loadRequests(): Promise<ProviderRequest[]> {
  const session = await requireProviderSession("/requests");
  return getProviderRequests(session.token, session.kind);
}

/**
 * The dashboard needs listings and requests together because the statistics are
 * derived from both. Listing failures must not blank the whole screen, so they
 * are reported as a partial result the UI can render honestly.
 */
export type DashboardData = ProviderDashboard & {
  listingsPartial: boolean;
  listingsError?: string;
};

export async function loadDashboard(): Promise<DashboardData> {
  const session = await requireProviderSession("/dashboard");

  const [requests, listings] = await Promise.allSettled([
    getProviderRequests(session.token, session.kind),
    getProviderListings(session.token, session.kind),
  ]);

  if (requests.status === "rejected") {
    throw requests.reason;
  }

  const listValue: ProviderListingsResult = listings.status === "fulfilled"
    ? listings.value
    : { listings: [], partial: false };

  const needsAction = requests.value.filter(
    (request) => request.status === "PENDING"
  );

  return {
    stats: buildStats(listValue.listings, requests.value, session.kind),
    recentRequests: requests.value.slice(0, 5),
    needsAction: needsAction.slice(0, 5),
    listingsPartial: listValue.partial,
    listingsError:
      listings.status === "rejected"
        ? listings.reason instanceof Error
          ? listings.reason.message
          : undefined
        : undefined,
  };
}

/** Small header badge: how many requests are waiting for a reply. */
export async function loadPendingCount(): Promise<number> {
  const session = await requireProviderSession("/dashboard");
  const requests = await getProviderRequests(session.token, session.kind);
  return requests.filter((request) => request.status === "PENDING").length;
}

/* -------------------------------------------------------------------------- */
/*  Profile mutations                                                          */
/* -------------------------------------------------------------------------- */

export async function saveProfile(
  input: ProviderProfileInput
): Promise<ActionResult<ProviderProfile>> {
  return run(async () => {
    const session = await requireProviderSession("/profile");
    const profile = await updateProviderProfile(
      session.token,
      session.kind,
      input
    );
    revalidatePath("/profile");
    revalidatePath("/settings");
    return profile;
  });
}

export async function removeAccount(): Promise<ActionResult> {
  return run(async () => {
    const session = await requireProviderSession("/settings");
    await deleteProviderProfile(session.token, session.kind);
    return undefined;
  });
}

/**
 * Ends the provider session without redirecting, so the caller can confirm it
 * with a toast before it navigates.
 */
export async function signOutProvider(): Promise<void> {
  const token = await readServiceSessionToken();
  const kind = token ? providerKindFromToken(token) : null;
  if (kind) {
    await signoutProvider(kind).catch(() => undefined);
  }
  await clearServiceSession();
  try {
    const { signOut } = await import("@/auth");
    await signOut({ redirect: false });
  } catch {
    // Email login never creates an Auth.js session.
  }
}

/* -------------------------------------------------------------------------- */
/*  Profile photo upload                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Uploads a provider photo to Cloudinary and returns the secure URL to store in
 * the existing `profile_pic` field.
 *
 * The file travels browser → this server action → backend → Cloudinary. The
 * browser only ever sees the resulting delivery URL, never a Cloudinary
 * credential.
 */
export async function uploadProfilePhoto(
  file: File
): Promise<ActionResult<string>> {
  return run(async () => {
    const session = await requireProviderSession("/profile");
    return uploadImageWithToken(session.token, file, PROFILE_PHOTO_FOLDER);
  });
}

/**
 * Uploads the photo chosen on the sign-up form using the backend token the
 * registration just produced.
 *
 * Sign-up is the one flow with no session to authenticate with, and the upload
 * endpoint requires one, so the photo is sent after the account exists: the
 * account is created, signed in, and only then is the file uploaded with that
 * fresh session. `profilePic` is never part of the signup payload, so the
 * backend never receives a hand-typed URL.
 */
export async function uploadSignupPhoto(
  kind: ProviderKind,
  email: string,
  password: string,
  file: File
): Promise<ActionResult<string>> {
  return run(async () => {
    // Re-authenticating here is what gives the upload a valid token: the signup
    // POST itself returns no session, and the endpoint rejects anonymous files.
    const token = await signinWithEmail(kind, email, password);
    return uploadImageWithToken(token, file, PROFILE_PHOTO_FOLDER);
  });
}

/* -------------------------------------------------------------------------- */
/*  Service mutations                                                          */
/* -------------------------------------------------------------------------- */

export async function addService(
  input: ProviderListingInput
): Promise<ActionResult<ProviderListing>> {
  return run(async () => {
    const session = await requireProviderSession("/services/new");
    const listing = await createProviderListing(
      session.token,
      session.kind,
      input
    );
    revalidatePath("/services");
    revalidatePath("/dashboard");
    return listing;
  });
}

export async function editService(
  id: string,
  input: ProviderListingInput
): Promise<ActionResult<ProviderListing>> {
  return run(async () => {
    const session = await requireProviderSession(`/services/${id}`);
    const listing = await updateProviderListing(
      session.token,
      session.kind,
      id,
      input
    );
    revalidatePath("/services");
    revalidatePath(`/services/${id}`);
    revalidatePath("/dashboard");
    return listing;
  });
}

export async function removeService(id: string): Promise<ActionResult> {
  return run(async () => {
    const session = await requireProviderSession("/services");
    await deleteProviderListing(session.token, session.kind, id);
    revalidatePath("/services");
    revalidatePath("/dashboard");
    return undefined;
  });
}

/* -------------------------------------------------------------------------- */
/*  Request mutations                                                          */
/* -------------------------------------------------------------------------- */

export async function setRequestStatus(
  id: string,
  status: RequestStatus
): Promise<ActionResult> {
  return run(async () => {
    const session = await requireProviderSession(`/requests/${id}`);
    await updateProviderRequestStatus(session.token, session.kind, id, status);
    revalidatePath("/requests");
    revalidatePath(`/requests/${id}`);
    revalidatePath("/dashboard");
    return undefined;
  });
}

/* -------------------------------------------------------------------------- */
/*  Guards                                                                     */
/* -------------------------------------------------------------------------- */

const VENUE_KINDS: ProviderKind[] = ["hotel", "restaurant"];

export async function requireVenueOwner() {
  const session = await requireProviderSession("/services");
  if (!VENUE_KINDS.includes(session.kind)) {
    throw new Error("Only hotel and restaurant owners manage services here.");
  }
  return session;
}
