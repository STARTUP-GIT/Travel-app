export type ReviewTargetType = "place" | "guide" | "hotel" | "restaurant";

export type Review = {
  id: string;
  targetId: string;
  targetType: ReviewTargetType;
  rating: number;
  text: string;
  reviewer: string;
  createdAt: string;
};

export type ReviewTarget = {
  /** Displayable overall rating (from the resource). */
  rating: number | null | undefined;
  /** How many ratings were aggregated. */
  ratingCount?: number | null | undefined;
  /** Ratings distribution: index 0 → 1 star … index 4 → 5 stars. */
  distribution?: number[] | null;
  published: string[];
};