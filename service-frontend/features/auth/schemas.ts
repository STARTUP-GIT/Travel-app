import { z } from "zod";

import { PROVIDER_KINDS, type ProviderKind } from "@/features/provider/types";

/**
 * Mirrors the four backend signup schemas
 * (backend/src/services/zod.ts) so the forms can validate before a round-trip
 * and the server actions can never send a payload the API would reject.
 */

const email = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Enter a valid email address");

const username = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(40, "Username is too long");

const password = z
  .string()
  .min(6, "Password must be at least 6 characters")
  .max(72, "Password is too long");

/** The backend requires 10–15 digits for both owner and guide phone numbers. */
const phone = z
  .string()
  .trim()
  .regex(/^\d{10,15}$/, "Enter 10 to 15 digits, without + or spaces");

const fullname = z.string().trim().min(1, "Full name is required");

const base = {
  email,
  username,
  password,
  fullname,
  phonenumber: phone,
  // Guide-only fields. They are collected for every kind and then validated per
  // kind below, which keeps the parsed output a single flat shape.
  placeIds: z.array(z.string()).default([]),
  experience: z.coerce
    .number()
    .int("Experience must be a whole number")
    .min(0, "Experience cannot be negative")
    .default(0),
  cost: z.coerce
    .number()
    .int("Your price must be a whole number")
    .min(0, "Your price cannot be negative")
    .default(0),
  languages: z.array(z.string()).default([]),
};

export const signupSchema = z
  .object({ kind: z.enum(PROVIDER_KINDS), ...base })
  .superRefine((value, ctx) => {
    if (value.kind === "hotel" || value.kind === "restaurant") return;

    // Choosing a place is the guide's own decision and can be made later, so no
    // place is a valid registration. A place guide may still never send more
    // than one.
    if (value.kind === "specific_guide" && value.placeIds.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["placeIds"],
        message: "A place guide covers exactly one place",
      });
    }

    if (value.languages.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["languages"],
        message: "Add at least one language",
      });
    }
  })
  .transform((value) => ({
    ...value,
    // The backend stores the whole array for a common guide and a single value
    // for a specific guide, so a place guide must never send more than one.
    placeIds:
      value.kind === "common_guide" ? value.placeIds : value.placeIds.slice(0, 1),
  }));

/**
 * The numeric guide fields are submitted as text from `<input type="number">`
 * and coerced by the schema, which is why they are typed `string | number`
 * here rather than taken from zod's inferred input type.
 */
export type SignupValues = {
  kind: ProviderKind;
  fullname: string;
  username: string;
  email: string;
  phonenumber: string;
  password: string;
  placeIds: string[];
  experience: string | number;
  cost: string | number;
  languages: string[];
};

export type SignupPayload = z.output<typeof signupSchema>;

const loginIdentifier = z
  .string()
  .trim()
  .min(1, "Email or username is required");

export const loginSchema = z.object({
  kind: z.enum(PROVIDER_KINDS),
  email: loginIdentifier,
  password: z.string().min(1, "Password is required"),
});

export type LoginValues = z.infer<typeof loginSchema>;

/**
 * Guide-only. The details the backend needs but Google cannot supply are
 * captured before the OAuth redirect; the same rules apply as for a normal
 * guide registration, except nothing has to be unique yet.
 */
export const googleGuideSchema = z
  .object({
    kind: z.enum(["common_guide", "specific_guide"]),
    phonenumber: phone,
    placeIds: z.array(z.string()).default([]),
    experience: z.coerce
      .number()
      .int("Experience must be a whole number")
      .min(0, "Experience cannot be negative"),
    cost: z.coerce
      .number()
      .int("Your price must be a whole number")
      .min(0, "Your price cannot be negative"),
    languages: z.array(z.string()).min(1, "Add at least one language"),
  })
  .superRefine((value, ctx) => {
    // Same rule as the email signup: a place guide is tied to one attraction, so
    // rejecting extras here keeps the pending cookie from ever carrying a
    // payload the backend would silently narrow to the first place.
    if (value.kind === "specific_guide" && value.placeIds.length > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["placeIds"],
        message: "A place guide covers exactly one place",
      });
    }
  });

export type GoogleGuideValues = {
  kind: "common_guide" | "specific_guide";
  phonenumber: string;
  placeIds: string[];
  experience: string | number;
  cost: string | number;
  languages: string[];
};

export function firstError(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function isProviderKindValue(value: unknown): value is ProviderKind {
  return (
    typeof value === "string" &&
    (PROVIDER_KINDS as readonly string[]).includes(value)
  );
}
