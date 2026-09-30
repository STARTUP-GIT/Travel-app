import prisma from "../db/prisma.js";

/**
 * `common_guide_package` and `common_guide_package_places` are created by the
 * migration `20260930120000_common_guide_tour_packages`.
 *
 * Until that migration is deployed the tables do not exist, and Prisma rejects
 * *any* query that includes or writes them. That is a wider blast radius than
 * the guide status column was, because the public place detail route includes
 * the package relation: a missing table would 500 the place page, and since the
 * customer guide list and package list are aggregated from those place
 * responses, both pages would come up empty — a pure schema-lag problem taking
 * working features offline.
 *
 * So both callers check first and fall back to "no packages", the same way
 * `guideStatusColumnExists` does. Nothing is faked: while the tables are absent
 * there are no packages to show, and a guide gets a clear message asking for the
 * migration instead of a Prisma error.
 *
 * Caching follows the same reasoning as the status probe — a short TTL, one
 * query in flight at a time, and failures never cached — so an instance that
 * probed while the migration was still being applied recovers on its own
 * without a redeploy.
 */
const PROBE_TTL_MS = 30_000;

let cached: { value: boolean; expiresAt: number } | null = null;
let inFlight: Promise<boolean> | null = null;

async function probe(): Promise<boolean> {
  // `current_schema()` rather than a hard-coded `public`: Prisma writes the
  // tables into the connection's search path, and a same-named table in some
  // other schema must not be mistaken for this one.
  const rows = await prisma.$queryRaw<{ present: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name = 'common_guide_package'
    ) AS present
  `;

  return rows[0]?.present === true;
}

export async function guidePackageTableExists(): Promise<boolean> {
  const now = Date.now();
  if (cached && cached.expiresAt > now) return cached.value;

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
    // Same as the status probe: a probe that could not reach the database says
    // nothing about the schema, so report `false` (nothing published) and do
    // not cache, so the next request re-checks for real.
    console.error("Guide package table probe failed:", error);
    return false;
  }
}
