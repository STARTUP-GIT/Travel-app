import prisma from "../db/prisma.js";

/**
 * `specific_guide.status` and `common_guide.status` are added by the
 * auto-approval migration `20260928000000_auto_approval_and_guide_status`.
 *
 * Until that migration is deployed the columns do not exist, and Prisma
 * rejects *any* query that filters on them. That mattered in two places,
 * because neither of them is really about guide approval:
 *
 *  - the admin dashboard counts pending guides inside one `Promise.all`, so
 *    those two counts failed the whole batch and `/api/admin/stats` answered
 *    500, taking the dashboard down with it;
 *  - the public place detail route includes `specificguide`, and Prisma
 *    selects every scalar of a related model, so the place page 500ed and the
 *    customer guide list — which is aggregated from those place responses —
 *    came up empty.
 *
 * While the column is absent the callers skip the guide-status queries instead
 * of failing on them, which keeps an unapplied migration from taking unrelated
 * pages down. Nothing is faked: where the column is missing there is no
 * approval state to read, so no guide is treated as approved and none is
 * published.
 *
 * The answer is cached only briefly, and a *failed* probe is never cached.
 * Caching the first result for the whole process lifetime was what turned one
 * bad moment into a permanently broken instance: a long-lived serverless
 * instance that probed while the database was briefly unreachable, or while the
 * migration was still being applied, kept answering `false` forever and
 * returned 503 for every guide approval long after the column had arrived —
 * while a freshly started instance served the same request correctly. A short
 * TTL plus not caching failures means the instance re-reads the real schema on
 * its own and recovers without a redeploy.
 */
const PROBE_TTL_MS = 30_000;

let cached: { value: boolean; expiresAt: number } | null = null;
let inFlight: Promise<boolean> | null = null;

async function probe(): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ present: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name IN ('specific_guide', 'common_guide')
        AND column_name = 'status'
    ) AS present
  `;

  return rows[0]?.present === true;
}

export async function guideStatusColumnExists(): Promise<boolean> {
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
    // A probe that could not reach the database tells us nothing about the
    // schema. Reporting `false` is the safe direction (nothing is published and
    // approval is refused rather than silently granted), and because the
    // failure is not cached the next request re-checks for real.
    console.error("Guide status column probe failed:", error);
    return false;
  }
}
