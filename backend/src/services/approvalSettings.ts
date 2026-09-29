import prisma from "../db/prisma.js";

/**
 * The four entity types the admin panel can auto-approve. The key is the
 * `app_config` column that stores the flag for that type.
 */
export type AutoApprovalEntity = "places" | "guides" | "hotels" | "restaurants";

export type AutoApprovalSettings = {
  placesAutoApproval: boolean;
  guidesAutoApproval: boolean;
  hotelsAutoApproval: boolean;
  restaurantsAutoApproval: boolean;
};

/**
 * Used when no app_config row exists yet (a fresh database, or before branding
 * has been saved). Everything is off: an unknown policy must never be read as
 * "approve everything".
 */
export const DEFAULT_AUTO_APPROVAL: AutoApprovalSettings = {
  placesAutoApproval: false,
  guidesAutoApproval: false,
  hotelsAutoApproval: false,
  restaurantsAutoApproval: false,
};

const COLUMN_BY_ENTITY: Record<AutoApprovalEntity, keyof AutoApprovalSettings> = {
  places: "placesAutoApproval",
  guides: "guidesAutoApproval",
  hotels: "hotelsAutoApproval",
  restaurants: "restaurantsAutoApproval",
};

/**
 * The status a brand-new record of `entity` should start in.
 *
 * This is the single place the policy is enforced. Creation flows call it
 * instead of hard-coding a status, so the admin toggle governs the backend and
 * a caller cannot skip the approval step by tampering with the frontend.
 */
export type InitialContentStatus = "PENDING" | "APPROVED";

export async function getAutoApprovalSettings(): Promise<AutoApprovalSettings> {
  const config = await prisma.app_config.findFirst({
    orderBy: { id: "asc" },
    select: {
      placesAutoApproval: true,
      guidesAutoApproval: true,
      hotelsAutoApproval: true,
      restaurantsAutoApproval: true,
    },
  });

  if (!config) return { ...DEFAULT_AUTO_APPROVAL };

  return {
    placesAutoApproval: config.placesAutoApproval,
    guidesAutoApproval: config.guidesAutoApproval,
    hotelsAutoApproval: config.hotelsAutoApproval,
    restaurantsAutoApproval: config.restaurantsAutoApproval,
  };
}

/**
 * `APPROVED` when the entity's auto-approval flag is on, otherwise `PENDING`.
 * A database read failure falls back to PENDING, because failing closed means
 * the record lands in the admin queue instead of going live unreviewed.
 */
export async function resolveInitialStatus(
  entity: AutoApprovalEntity
): Promise<InitialContentStatus> {
  try {
    const settings = await getAutoApprovalSettings();
    return settings[COLUMN_BY_ENTITY[entity]] ? "APPROVED" : "PENDING";
  } catch (error) {
    console.error(`Read auto-approval setting for ${entity} failed:`, error);
    return "PENDING";
  }
}
