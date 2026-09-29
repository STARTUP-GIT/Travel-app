"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PRIMARY_NAV } from "@/components/shared/primary-nav";
import { cn } from "@/lib/utils";

/**
 * Primary navigation on small screens, and the only one there: the account menu
 * in the header hides these four items below `lg`, so the same destination is
 * never offered twice on a phone.
 *
 * Three details keep it reliably tappable rather than merely visible:
 *
 *  - Every entry is a single `<Link>` that wraps the icon *and* the label, so
 *    there is no small inner target to miss and no nested interactive element
 *    for the tap to escape through.
 *  - `touch-manipulation` drops the 300ms click delay and the double-tap zoom
 *    wait. Without it a tap registers late, and a second tap inside that window
 *    is swallowed as a zoom attempt — which is what made these look dead.
 *  - The bar is pinned in its own `z-50` layer, above the `z-40` sticky header
 *    and the `z-30` screen header. `pointer-events-auto` states that the bar
 *    itself is a hit target, so nothing about the page can turn it inert.
 */
export function BottomNavigation({ pending }: { pending: number }) {
  const pathname = usePathname();

  return (
    <nav
      className="safe-bottom pointer-events-auto fixed inset-x-0 bottom-0 z-50 touch-manipulation select-none border-t border-border/80 bg-card/95 pb-[max(env(safe-area-inset-bottom),0.25rem)] shadow-[0_-6px_24px_-12px_rgb(15_30_90_/_0.18)] backdrop-blur-xl lg:hidden"
      aria-label="Primary navigation"
    >
      <ul className="grid grid-cols-4">
        {PRIMARY_NAV.map(({ href, label, icon: Icon, match }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "group relative flex min-h-[3.75rem] w-full cursor-pointer touch-manipulation flex-col items-center justify-center gap-1 px-1 py-2.5 text-[0.65rem] font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={cn(
                    "relative flex h-7 w-12 items-center justify-center rounded-full transition-all",
                    active && "bg-primary/10"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-[21px] transition-transform",
                      active && "scale-105"
                    )}
                    strokeWidth={active ? 2.4 : 2}
                  />
                  {href === "/requests" && pending > 0 ? (
                    <span className="absolute -top-0.5 right-1 flex size-4 items-center justify-center rounded-full bg-amber-500 text-[0.55rem] font-bold text-white">
                      {pending > 9 ? "9+" : pending}
                    </span>
                  ) : null}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
