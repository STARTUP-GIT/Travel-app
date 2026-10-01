import type { Response } from "express";

/**
 * Turning a failed write into something a person can be shown.
 *
 * A database failure used to travel to the browser as the error's own text, which
 * for Prisma means the driver message: table and column names, SQL, and often the
 * Prisma error code. None of that helps the guide who pressed "Save changes", and
 * a name like `common_guide.agencyName` in a 500 body is worse than useless — it
 * says the deployment is broken rather than that their save did not happen.
 *
 * So the detail goes one way only: the whole error is logged with the operation
 * that produced it, and the caller gets a fixed sentence. The status stays 500,
 * because from the caller's side the save genuinely did not happen.
 */
export const PROFILE_SAVE_FAILED_MESSAGE =
  "Unable to save your profile right now. Please try again.";

/**
 * Logs `error` in full, then responds with `message`.
 *
 * Validation and not-found answers are still the caller's to give, because those
 * are cases the person can act on; this is for everything else.
 */
export function failSafely(
  res: Response,
  error: unknown,
  context: string,
  message: string,
  status = 500
): Response {
  // `console.error` keeps the error object, so the stack and the Prisma metadata
  // are available to whoever reads the deployment logs.
  console.error(`[${context}] failed:`, error);

  return res.status(status).json({ message });
}

/** The profile save's failure: no reason to distinguish causes for the caller. */
export function profileSaveFailed(
  res: Response,
  error: unknown,
  context: string
): Response {
  return failSafely(res, error, context, PROFILE_SAVE_FAILED_MESSAGE);
}

/**
 * A place write that did not happen.
 *
 * A guide who cannot save their place needs to be told the save failed, not why:
 * the causes reaching here are database faults, and spelling one out would put
 * table and column names in the response.
 */
export const PLACE_SAVE_FAILED_MESSAGE =
  "Unable to save this place right now. Please try again.";

export function placeSaveFailed(
  res: Response,
  error: unknown,
  context: string
): Response {
  return failSafely(res, error, context, PLACE_SAVE_FAILED_MESSAGE);
}

/**
 * A pricing write that did not happen.
 *
 * Separate wording from the place save because the guide can act on it: what they
 * entered is still on screen, and retrying is the useful next step.
 */
export const PRICING_SAVE_FAILED_MESSAGE =
  "Unable to save the prices for this place right now. Please try again.";

export function placePricingWriteFailed(
  res: Response,
  error: unknown,
  context: string
): Response {
  return failSafely(res, error, context, PRICING_SAVE_FAILED_MESSAGE);
}
