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
 * The probe runs once per process and is cached. While the column is absent
 * the callers skip the guide-status queries instead of failing on them, which
 * keeps an unapplied migration from taking unrelated pages down. Nothing is
 * faked: where the column is missing there is no approval state to read, so no
 * guide is treated as approved and none is published.
 *
 * The value is re-read on the next cold start, which is the same point at
 * which a redeploy generates the Prisma client that knows about the column.
 */
let cached: Promise<boolean> | null = null;

export function guideStatusColumnExists(): Promise<boolean> {
  cached ??= prisma.$queryRaw<{ present: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name IN ('specific_guide', 'common_guide')
        AND column_name = 'status'
    ) AS present
  `
    .then((rows) => rows[0]?.present === true)
    .catch(() => false);

  return cached;
}
