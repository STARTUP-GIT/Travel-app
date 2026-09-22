import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function SkeletonThumbnail({ className }: { className?: string }) {
  return (
    <div className="space-y-3">
      <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3 rounded-2xl border border-border bg-card p-4", className)}>
      <Skeleton className="aspect-[4/3] w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonGrid({
  count = 6,
  columns = "grid-cols-2 lg:grid-cols-4",
  className,
}: {
  count?: number;
  columns?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4", columns, className)}
      aria-label="Loading"
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3" aria-label="Loading" role="status">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
          <Skeleton className="size-14 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LoadingState({
  label = "Loading…",
  skeleton,
}: {
  label?: string;
  skeleton?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" role="status">
      <p className="sr-only">{label}</p>
      {skeleton ?? <SkeletonGrid />}
    </div>
  );
}