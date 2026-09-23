"use server";

import "server-only";

import { backendRequest } from "@/lib/api/server";

export type SignupInput = {
  email: string;
  username: string;
  password: string;
  fullname: string;
  phonenumber: string;
};

type SignupResponse = { message?: string };

/**
 * Customer email/password sign-up. Runs server-side (Server Action) and talks
 * directly to the real backend /users/api/auth/signup endpoint — it never goes
 * through the old /api/proxy authentication layer.
 */
export async function signupWithEmail(input: SignupInput): Promise<void> {
  const res = await backendRequest("/users/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      username: input.username,
      password: input.password,
      fullname: input.fullname,
      phonenumber: input.phonenumber,
      provider: "email",
    }),
  });

  if (!res.ok) {
    let message = "Account creation failed";
    try {
      const data = (await res.json()) as SignupResponse;
      if (data?.message) message = data.message;
    } catch {
      // non-JSON error body
    }
    throw new Error(message);
  }
}