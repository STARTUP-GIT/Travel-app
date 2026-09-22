import type {
  Review,
  ReviewTargetType,
} from "@/features/reviews/types";
import { slugify } from "@/features/locations/utils/slug";

const STORAGE_KEY = "kt-reviews";

/**
 * Review submission service.
 *
 * The backend stores legacy free-text reviews but exposes no public
 * "create review" endpoint, so submitted reviews are persisted locally for
 * now. UI must go through this module — the seam where a server-backed
 * implementation replaces local persistence without changing components.
 */
export function createReview(input: {
  targetId: string;
  targetType: ReviewTargetType;
  rating: number;
  text: string;
  reviewer: string;
}): Review {
  const review: Review = {
    id: `${slugify(input.targetType)}-${input.targetId}-${Date.now()}`,
    targetId: input.targetId,
    targetType: input.targetType,
    rating: input.rating,
    text: input.text,
    reviewer: input.reviewer,
    createdAt: new Date().toISOString(),
  };

  try {
    const all = readAll();
    all.unshift(review);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // storage unavailable — review still returned for optimistic UI
  }
  return review;
}

function readAll(): Review[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Review[]) : [];
  } catch {
    return [];
  }
}

export function listReviewsForTarget(targetId: string): Review[] {
  return readAll().filter((r) => r.targetId === targetId);
}