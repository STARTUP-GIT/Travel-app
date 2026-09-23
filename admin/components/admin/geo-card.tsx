import { type LucideIcon } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ServiceStatusBadge({ active }: { active: boolean }) {
  return active ? (
    <Badge variant="success" className="shrink-0">
      Active
    </Badge>
  ) : (
    <Badge variant="outline" className="shrink-0">
      Offline
    </Badge>
  );
}

export function CardDot({ className }: { className?: string }) {
  return <span aria-hidden className={cn("size-1 shrink-0 rounded-full bg-muted", className)} />;
}

export function GeoCardSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="flex h-full flex-col gap-0">
          <CardHeader className="gap-2 p-5 pb-0">
            <Skeleton className="h-5 w-2/3 rounded-md" />
            <Skeleton className="h-4 w-1/3 rounded-md" />
          </CardHeader>
          <Separator className="mt-4" />
          <CardContent className="flex flex-1 flex-col justify-center gap-3 p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28 rounded-md" />
                <Skeleton className="h-3 w-20 rounded-md" />
              </div>
              <Skeleton className="h-6 w-10 rounded-full" />
            </div>
          </CardContent>
          <CardFooter className="p-5 pt-4">
            <Skeleton className="h-3 w-40 rounded-md" />
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

export function GeoMessageCard({
  icon: Icon,
  title,
  description,
  action,
  tone = "neutral",
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  tone?: "neutral" | "danger";
}) {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 rounded-xl p-12 text-center">
      <span
        className={cn(
          "flex size-14 items-center justify-center rounded-xl bg-muted text-muted-foreground",
          tone === "danger" && "bg-red-50 text-red-600"
        )}
      >
        <Icon className="size-7" />
      </span>
      <h3 className="text-base font-semibold">{title}</h3>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </Card>
  );
}

export function GeoRetryButton({ onRetry }: { onRetry: () => void }) {
  return (
    <Button variant="outline" onClick={onRetry}>
      Try again
    </Button>
  );
}