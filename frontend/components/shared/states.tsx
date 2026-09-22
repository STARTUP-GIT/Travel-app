import { SearchX, Compass, Bookmark, type LucideIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  icon: Icon = Compass,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-border bg-card/60 p-10 text-center",
        className
      )}
    >
      <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/8 text-primary">
        <Icon className="size-8" />
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = "Unable to load",
  description = "Something went wrong while loading this content. Please try again.",
  action,
  retry,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  retry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-3xl border border-border bg-card p-10 text-center",
        className
      )}
      role="alert"
    >
      <span className="flex size-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <SearchX className="size-8" />
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {(action || retry) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {retry ? (
            <Button variant="outline" onClick={retry}>
              Try again
            </Button>
          ) : null}
          {action}
        </div>
      )}
    </div>
  );
}

export function NoSavedState({
  title = "Nothing saved yet",
  description = "Tap the heart on any place or guide to keep it here for later.",
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return <EmptyState icon={Bookmark} title={title} description={description} action={action} />;
}