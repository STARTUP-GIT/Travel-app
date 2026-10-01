import prisma from "../db/prisma.js";

/**
 * `common_guide.agencyName`, the `place_pricing` table and
 * `place_submission.pricing` are all created by the single migration
 * `20260930180000_agency_and_place_pricing`.
 *
 * Until that migration is deployed the objects do not exist, and Prisma asks the
 * database for them by name — so the database rejects the *whole* statement. That
 * is a much wider blast radius than a missing feature, because these three names
 * are read by the shared provider layer rather than by one screen:
 *
 *  - `getProfile` selects `agencyName`, and provider sign-in confirms the session
 *    with that very read, so a common guide could not sign in at all: the login
 *    answered 500 `Internal Server Error` right after the password was verified;
 *  - every place read includes the `pricing` relation, so the place list, the
 *    place page and the guide's own place picker all answered 500 — and the
 *    provider session, which is built from the profile above, took every other
 *    provider screen down with it;
 *  - `place_submission.pricing` is selected on its own, by the submission reads
 *    and written by the place-submission paths.
 *
 * Exactly as `guideStatusColumnExists` and `guidePackageTableExists` already do
 * for the two migrations before it, callers check first and fall back to the
 * pre-migration shape. Nothing is faked: with no pricing table a place has no
 * bands to return and still prices off its flat `entryfee`, and with no agency
 * column a guide has no trading name to return. A *write* that cannot be stored
 * is refused with a message that names the missing migration rather than silently
 * dropped, because dropping pricing would save a place at a price the guide did
 * not ask for.
 *
 * Caching follows the same reasoning as the other two probes — a short TTL, one
 * query in flight at a time, and failures never cached — so an instance that
 * probed while the migration was still being applied recovers on its own without
 * a redeploy.
 */
export type AgencyAndPricingSchema = {
  /** `common_guide.agencyName` */
  agencyColumn: boolean;
  /** the `place_pricing` table */
  pricingTable: boolean;
  /** `place_submission.pricing` */
  submissionPricingColumn: boolean;
};

const PROBE_TTL_MS = 30_000;

/** What an unreadable schema is treated as: every optional object absent. */
const UNKNOWN: AgencyAndPricingSchema = {
  agencyColumn: false,
  pricingTable: false,
  submissionPricingColumn: false,
};

let cached: { value: AgencyAndPricingSchema; expiresAt: number } | null = null;
let inFlight: Promise<AgencyAndPricingSchema> | null = null;

async function probe(): Promise<AgencyAndPricingSchema> {
  // `current_schema()` rather than a hard-coded `public`: Prisma writes into the
  // connection's search path, and a same-named object in another schema must not
  // be mistaken for this one.
  const rows = await prisma.$queryRaw<
    {
      agency_column: boolean;
      pricing_table: boolean;
      submission_pricing_column: boolean;
    }[]
  >`
    SELECT
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'common_guide'
          AND column_name = 'agencyName'
      ) AS agency_column,
      EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = current_schema()
          AND table_name = 'place_pricing'
      ) AS pricing_table,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name = 'place_submission'
          AND column_name = 'pricing'
      ) AS submission_pricing_column
  `;

  const row = rows[0];

  return {
    agencyColumn: row?.agency_column === true,
    pricingTable: row?.pricing_table === true,
    submissionPricingColumn: row?.submission_pricing_column === true,
  };
}

export async function agencyAndPricingSchema(): Promise<AgencyAndPricingSchema> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;

  // One query in flight at a time, so a burst of requests on a cold instance
  // does not open a connection per caller.
  inFlight ??= probe()
    .then((value) => {
      cached = { value, expiresAt: Date.now() + PROBE_TTL_MS };
      return value;
    })
    .finally(() => {
      inFlight = null;
    });

  try {
    return await inFlight;
  } catch (error) {
    // Same as the other two probes: a probe that could not reach the database
    // says nothing about the schema, so report the objects as absent and do not
    // cache, so the next request re-checks for real.
    console.error("Agency and pricing schema probe failed:", error);
    return UNKNOWN;
  }
}

/**
 * The one message a caller gives when it was *asked* to write pricing while the
 * table is not there. Reads degrade silently because there is genuinely nothing
 * to show; a write cannot, so the request is refused with the cause in it.
 */
export const PRICING_SCHEMA_PENDING =
  "Pricing bands cannot be saved yet: the database is missing the place pricing " +
  "tables. Ask an administrator to run the pending migration " +
  "20260930180000_agency_and_place_pricing.";
