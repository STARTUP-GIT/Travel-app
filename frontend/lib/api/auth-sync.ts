import "server-only";

import { backendRequest, backendSigninWithEmail } from "@/lib/api/server";

export type GoogleAccountInput = {
  email: string;
  fullname: string;
  profilepic?: string;
};

/**
 * Synchronizes a Google user account with the backend:
 * 1. Attempt Google signup; if the account already exists (409) that is fine.
 * 2. Sign in to obtain the backend user session token.
 */
export async function syncGoogleAccount(
  input: GoogleAccountInput
): Promise<string | null> {
  try {
    const res = await backendRequest("/users/api/auth/google-signup", {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        fullname: input.fullname,
        profilepic: input.profilepic,
      }),
    });

    if (res.ok || res.status === 409) {
      return await backendSigninWithEmail(input.email);
    }

    return null;
  } catch {
    return null;
  }
}