import "server-only";

import { cookies } from "next/headers";

import { setServiceSession } from "@/features/auth/api/service-session";
import type { ProviderKind } from "@/features/provider/types";
import {
  googleSigninWithEmail,
  googleSignup,
} from "./provider.server";

/**
 * Guide Google registration needs data Google cannot supply: their phone number,
 * experience, price and languages. Optionally the place(s) the guide covers —
 * a guide may register without one. Those values are captured by the signup
 * form, parked in a short-lived httpOnly cookie and consumed by the Auth.js
 * `jwt` callback once Google returns the verified account. Nothing secret is
 * stored — the identity itself always comes from the Google profile, never from
 * the browser.
 */
const COOKIE = "sp_guide_google";
const MAX_AGE_SECONDS = 10 * 60;

export type PendingGuideSignup = {
  kind: ProviderKind;
  phonenumber: string;
  placeIds: string[];
  experience: number;
  cost: number;
  languages: string[];
};

function encode(value: PendingGuideSignup): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decode(raw: string): PendingGuideSignup | null {
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8")
    ) as PendingGuideSignup;

    if (parsed.kind !== "common_guide" && parsed.kind !== "specific_guide") {
      return null;
    }
    if (!Array.isArray(parsed.placeIds)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Called from the signup server action right before `signIn("google")`. */
export async function setPendingGuideSignup(value: PendingGuideSignup) {
  const store = await cookies();
  store.set(COOKIE, encode(value), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Read-and-clear, so a completed registration is never replayed. */
export async function takePendingGuideSignup(): Promise<PendingGuideSignup | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;

  store.delete(COOKIE);
  return decode(raw);
}

export type GoogleIdentity = {
  email: string;
  fullname: string;
  profilepic?: string;
};

/**
 * Registers the verified Google identity with the guide router and returns a
 * fresh backend session token. An account that already exists is not an error —
 * the same call simply signs the existing guide in.
 */
export async function completeGuideGoogleSignup(
  pending: PendingGuideSignup,
  identity: GoogleIdentity
): Promise<{ token: string; created: boolean }> {
  const status = await googleSignup(pending.kind, {
    email: identity.email,
    fullname: identity.fullname,
    profilepic: identity.profilepic,
    phonenumber: pending.phonenumber,
    placeIds: pending.placeIds,
    experience: pending.experience,
    cost: pending.cost,
    languages: pending.languages,
  });

  if (status !== 201 && status !== 409) {
    throw new Error(
      "The guide account could not be created. Please register with an email address instead."
    );
  }

  const token = await googleSigninWithEmail(pending.kind, identity.email);
  if (!token) {
    throw new Error(
      "The guide account was created but could not be signed in. Please sign in with an email address."
    );
  }

  await setServiceSession(token);

  return { token, created: status === 201 };
}
