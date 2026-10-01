import type { Prisma } from "../generated/client/client.js";
import prisma from "../db/prisma.js";

/**
 * The ticket bands a place was saved with, as they arrive on a create / submit /
 * edit body.
 *
 * Shaped this way — a list of `{ visitor, ageGroup, amount }` — rather than a
 * map or a packed string, because a real attraction can charge a different
 * amount for any combination of visitor type and age band, and the set of bands
 * is not the same for every place.
 */
export type PlacePricingInput = {
  visitor: "DOMESTIC" | "FOREIGN";
  ageGroup: string;
  amount: number;
};

const MAX_BANDS = 24;
const AGE_GROUP_MAX = 60;

/**
 * Validates the pricing bands on a place body.
 *
 * Returns either the rows to write, or the message to reject the request with —
 * the caller decides. Bands are optional in every sense: a place with none is a
 * perfectly good place and falls back to the flat `entryfee`, which is also what
 * every place created before this table existed uses.
 *
 * Validation is deliberately strict here rather than trusting the client:
 * `visitor` is an enum, `amount` must be a real non-negative number, and the
 * (visitor, ageGroup) pair is unique, because a duplicate would otherwise be
 * turned into a constraint error and surface as an opaque 500.
 */
export function parsePlacePricing(
  value: unknown
): { ok: true; rows: PlacePricingInput[] } | { ok: false; message: string } {
  if (value === undefined || value === null) return { ok: true, rows: [] };

  if (!Array.isArray(value)) {
    return { ok: false, message: "Pricing must be a list of visitor prices" };
  }

  if (value.length > MAX_BANDS) {
    return { ok: false, message: `A place can have at most ${MAX_BANDS} pricing rows` };
  }

  const rows: PlacePricingInput[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      return { ok: false, message: "Each pricing row needs a visitor type, an age group and a price" };
    }

    const { visitor, ageGroup, amount } = entry as Record<string, unknown>;

    if (visitor !== "DOMESTIC" && visitor !== "FOREIGN") {
      return { ok: false, message: "A pricing row must be for domestic or foreign visitors" };
    }

    if (typeof ageGroup !== "string" || !ageGroup.trim()) {
      return { ok: false, message: "A pricing row needs an age group, such as Adult or Child" };
    }

    if (ageGroup.trim().length > AGE_GROUP_MAX) {
      return { ok: false, message: "An age group label is too long" };
    }

    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
      return { ok: false, message: "A pricing amount must be zero or greater" };
    }

    const band = ageGroup.trim().toLowerCase();
    if (seen.has(`${visitor}:${band}`)) {
      return { ok: false, message: "The same age group cannot be listed twice for the same visitor type" };
    }
    seen.add(`${visitor}:${band}`);

    rows.push({ visitor, ageGroup: ageGroup.trim(), amount });
  }

  return { ok: true, rows };
}

/**
 * Replaces a place's pricing bands with exactly the supplied set.
 *
 * Delete-then-insert rather than a diff, so what the client saved is what the
 * place has: a band removed in the form really leaves the place. Done in a
 * transaction with its caller so a place is never left with half its bands.
 */
export async function replacePlacePricing(
  tx: Pick<typeof prisma, "place_pricing">,
  placeId: string,
  rows: PlacePricingInput[]
): Promise<void> {
  await tx.place_pricing.deleteMany({ where: { placeId } });
  if (rows.length === 0) return;
  await tx.place_pricing.createMany({ data: rows.map((row) => ({ ...row, placeId })) });
}

/** The bands as the clients read them: a stable, UI-friendly order. */
export const placePricingOrderBy: Prisma.place_pricingOrderByWithRelationInput[] = [
  { visitor: "asc" },
  { ageGroup: "asc" },
];

/** Every place read that feeds a customer or provider screen carries its bands. */
export const placePricingInclude = {
  pricing: { orderBy: placePricingOrderBy },
} as const;

/**
 * `common_guide_package.placePlace` style reads are not affected by this, but the
 * guide's own place list is: a guide has to see the price bands they entered, so
 * the same relation is reused rather than re-declared per controller.
 */
export type PlacePricingRow = {
  id: string;
  visitor: "DOMESTIC" | "FOREIGN";
  ageGroup: string;
  amount: number;
};

/** Narrows an unvalidated request body to the pricing field. */
export function pricingFromBody(body: unknown): unknown {
  if (!body || typeof body !== "object") return undefined;
  return (body as { pricing?: unknown }).pricing;
}

/**
 * Writes a reviewed submission's pricing snapshot onto its place.
 *
 * Called when an admin approves a submission, so the bands the admin actually
 * saw are the bands the place ends up with.
 *
 * The snapshot is re-validated rather than trusted: it is `JSONB`, so it can
 * only have arrived through this codebase, but a bad row must never turn an
 * approval into a 500 and leave the place stuck. A snapshot that no longer
 * parses is logged and skipped, which leaves the place on its existing bands —
 * the flat `entryfee` still prices it, so the place is never left unpriceable.
 *
 * A null snapshot is not an error: it is every submission created before the
 * column existed, and it means the submission changes no pricing.
 */
export async function applySubmittedPricing(
  tx: Pick<typeof prisma, "place_pricing">,
  placeId: string,
  snapshot: unknown
): Promise<void> {
  if (snapshot === null || snapshot === undefined) return;

  const parsed = parsePlacePricing(snapshot);
  if (!parsed.ok) {
    console.error("Submitted place pricing could not be applied:", parsed.message);
    return;
  }

  await replacePlacePricing(tx, placeId, parsed.rows);
}
