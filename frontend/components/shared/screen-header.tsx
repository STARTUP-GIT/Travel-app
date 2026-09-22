"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { cn } from "@/lib/utils";

type ScreenHeaderProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  backHref?: string;
  onBack?: () => void;
  /** Items rendered on the right of the bar (favorite button, share, etc.). */
  action?: React.ReactNode;
  className?: string;
};

/**
 * Sticky in-app screen header used on secondary screens (district, place,
 * guides, …). Gives the mobile-app feel with a compact back affordance.
 */
export function ScreenHeader({
  title,
  subtitle,
  backHref,
  onBack,
  action,
  className,
}: ScreenHeaderProps) {
  const router = useRouter();

  function handleBack() {
    if (onBack) {
      onBack();
      return;
    }
    if (backHref) {
      router.push(backHref);
      return;
    }
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  return (
    <div
      className={cn(
        "sticky top-14 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl lg:top-16",
        className
      )}
    >
      <div className="flex h-14 items-center gap-2 px-4 w-full">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back"
          className="flex size-9 shrink-0 -translate-x-1 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent active:scale-95"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[1.05rem] font-semibold tracking-tight">
            {title}
          </h1>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="flex shrink-0 items-center gap-1.5">{action}</div> : null}
      </div>
    </div>
  );
}

export function BackLink({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="flex size-9 shrink-0 -translate-x-1 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent active:scale-95"
      aria-label="Go back"
    >
      <ChevronLeft className="size-5" />
    </Link>
  );
}