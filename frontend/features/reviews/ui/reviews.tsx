"use client";

import { Quote, Star, User } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import * as React from "react";

import { Rating } from "@/components/shared/rating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { createReview, listReviewsForTarget } from "@/features/reviews/api/reviews.api";
import type {
  Review,
  ReviewTarget,
  ReviewTargetType,
} from "@/features/reviews/types";
import { cn } from "@/lib/utils";

export function RatingSummary({
  target,
  className,
}: {
  target: ReviewTarget;
  className?: string;
}) {
  const distribution = target.distribution;
  const hasDistribution =
    Array.isArray(distribution) &&
    distribution.length === 5 &&
    distribution.some((n) => n > 0);

  const totalRatings =
    (hasDistribution
      ? distribution?.reduce((a, b) => a + b, 0) ?? 0
      : target.ratingCount ?? target.published.length) || 0;

  return (
    <section className={cn("grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center", className)}>
      <div className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-card px-6 py-5 text-center">
        <span className="text-4xl font-bold tracking-tight text-foreground">
          {typeof target.rating === "number" && target.rating > 0
            ? target.rating.toFixed(1)
            : "—"}
        </span>
        <Rating value={target.rating} showValue={false} size="md" />
        <span className="text-xs text-muted-foreground">{totalRatings} ratings</span>
      </div>

      {hasDistribution ? (
        <div className="space-y-2">
          {distribution!.map((count, i) => {
            const ratio = totalRatings > 0 ? count / totalRatings : 0;
            const star = i + 1;
            return (
              <div key={star} className="flex items-center gap-2 text-xs">
                <span className="w-8 shrink-0 font-medium">
                  {star}
                  <Star className="ml-0.5 inline size-3 fill-amber-400 text-amber-400" />
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-amber-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${ratio * 100}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
                <span className="w-8 text-right text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Ratings are gathered as a single overall score. Once ratings are added per
          category, the distribution will appear here.
        </p>
      )}
    </section>
  );
}

export function ReviewCard({ review }: { review: Review }) {
  const initials = review.reviewer.slice(0, 2).toUpperCase();
  return (
    <article className="card-surface rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <Avatar className="size-10">
          <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold">{review.reviewer}</p>
            <p className="shrink-0 text-xs text-muted-foreground">
              {new Date(review.createdAt).toLocaleDateString(undefined, {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
          <Rating value={review.rating} size="xs" className="mt-0.5" />
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">
            <Quote className="mr-1 inline size-3.5 -translate-y-0.5 text-muted-foreground/60" />
            {review.text}
          </p>
        </div>
      </div>
    </article>
  );
}

export function PublishedReviews({ texts }: { texts: string[] }) {
  if (texts.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No written reviews yet. Be the first to share your experience!
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {texts.map((text, i) => (
        <article key={i} className="card-surface rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-9">
              <AvatarFallback className="bg-secondary">
                <User className="size-4 text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <p className="text-sm font-semibold">Verified traveller</p>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-foreground/90">{text}</p>
        </article>
      ))}
    </div>
  );
}

export function ReviewsSection({
  target,
  targetId,
  targetType,
}: {
  target: ReviewTarget;
  targetId: string;
  targetType: ReviewTargetType;
}) {
  const [localReviews, setLocalReviews] = React.useState<Review[]>([]);

  React.useEffect(() => {
    setLocalReviews(listReviewsForTarget(targetId));
  }, [targetId]);

  const targetForWrite = {
    targetId,
    targetType,
    rating: target.rating,
    ratingCount: target.ratingCount,
    distribution: target.distribution,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">Ratings &amp; reviews</h3>
        <WriteReviewSheet
          target={targetForWrite}
          onSubmitted={(review) => setLocalReviews((r) => [review, ...r])}
        />
      </div>

      <RatingSummary target={target} />

      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Written reviews
        </p>
        {localReviews.length > 0 ? (
          <div className="space-y-3">
            {localReviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        ) : (
          <PublishedReviews texts={target.published} />
        )}
      </div>
    </div>
  );
}

function WriteReviewSheet({
  target,
  onSubmitted,
}: {
  target: {
    targetId: string;
    targetType: ReviewTargetType;
    rating: ReviewTarget["rating"];
    ratingCount: ReviewTarget["ratingCount"];
    distribution: ReviewTarget["distribution"];
  };
  onSubmitted: (review: Review) => void;
}) {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [rating, setRating] = React.useState(0);
  const [hover, setHover] = React.useState(0);
  const [text, setText] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  function submit() {
    if (rating < 1) {
      toast.error("Please pick a star rating");
      return;
    }
    setSubmitting(true);
    const review = createReview({
      targetId: target.targetId,
      targetType: target.targetType,
      rating,
      text: text.trim() || "Great experience!",
      reviewer: user?.name ?? "You",
    });
    setSubmitting(false);
    toast.success("Review submitted", {
      description: "Thanks for sharing your experience!",
    });
    setOpen(false);
    setRating(0);
    setText("");
    onSubmitted(review);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-xl">
          Write Review
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="mx-auto w-full max-w-lg rounded-t-3xl border-border"
      >
        <SheetHeader className="text-left">
          <SheetTitle>Write a review</SheetTitle>
          <SheetDescription>
            {isAuthenticated
              ? `Sharing as ${user?.name ?? "you"}`
              : "You'll be asked to sign in when we enable account-based reviews."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          <div className="flex items-center justify-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                aria-label={`${star} star${star > 1 ? "s" : ""}`}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                className="transition-transform active:scale-90"
              >
                <Star
                  className={cn(
                    "size-9 transition-colors",
                    (hover || rating) >= star
                      ? "fill-amber-400 text-amber-400"
                      : "text-muted"
                  )}
                />
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-text">Your experience</Label>
            <Textarea
              id="review-text"
              rows={4}
              placeholder="Tell others about this place…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        </div>

        <SheetFooter className="sm:justify-center">
          <Button
            variant="action"
            className="w-full rounded-xl"
            disabled={submitting}
            onClick={submit}
          >
            Submit review
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}