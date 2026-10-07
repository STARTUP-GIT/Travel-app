/**
 * Reviews.
 *
 * The listings store a legacy free-text `review: string[]` array that the
 * backend only reads, and there is no public create-review endpoint. The web
 * frontend therefore persists submitted reviews locally, and this module
 * reproduces that behaviour for the same reason — the user ruled out a
 * mobile-only API.
 *
 * A submitted review is always returned to the caller (so the UI can render it
 * optimistically) even when storage is unavailable; it simply will not be there
 * next launch.
 *
 * The single seam for a future server-backed implementation.
 */

import { KEYS, storage } from "@/lib/storage/local-store";
import { slugify } from "@/lib/utils/slug";

export type ReviewTargetType = "place" | "hotel" | "restaurant" | "guide";

export type Review = {
  id: string;
  targetId: string;
  targetType: ReviewTargetType;
  rating: number;
  text: string;
  reviewer: string;
  createdAt: string;
};

export type CreateReviewInput = {
  targetId: string;
  targetType: ReviewTargetType;
  rating: number;
  text: string;
  reviewer: string;
};

export async function listReviewsForTarget(targetId: string): Promise<Review[]> {
  const all = await storage.readJson<Review[]>(KEYS.reviews, []);
  if (!Array.isArray(all)) return [];
  return all.filter((review) => review?.targetId === targetId);
}

export async function createReview(input: CreateReviewInput): Promise<Review> {
  const review: Review = {
    id: `${slugify(input.targetType)}-${input.targetId}-${Date.now()}`,
    targetId: input.targetId,
    targetType: input.targetType,
    rating: input.rating,
    text: input.text,
    reviewer: input.reviewer,
    createdAt: new Date().toISOString(),
  };

  const all = await storage.readJson<Review[]>(KEYS.reviews, []);
  await storage.writeJson(KEYS.reviews, [review, ...(Array.isArray(all) ? all : [])]);

  return review;
}

/** Mean of submitted reviews, or null when there are none. */
export async function averageRatingForTarget(
  targetId: string,
): Promise<number | null> {
  const reviews = await listReviewsForTarget(targetId);
  if (reviews.length === 0) return null;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  return total / reviews.length;
}