import Link from "next/link";

import { Logo } from "@/components/shared/logo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DistrictSummary } from "@/features/locations/types";

export function Footer({
  districts,
}: {
  districts: DistrictSummary[];
}) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-white/10 bg-black/20 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Discover the land of palaces, beaches, hills and heritage with a
              curated travel experience across Karnataka.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Explore
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link className="transition-colors hover:text-foreground" href="/districts">
                  Districts
                </Link>
              </li>
              <li>
                <Link className="transition-colors hover:text-foreground" href="/bookings">
                  My Bookings
                </Link>
              </li>
              <li>
                <Link className="transition-colors hover:text-foreground" href="/profile">
                  Profile
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Popular Districts
            </h3>
            <ul className="space-y-2 text-sm">
              {districts.slice(0, 5).map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/${d.slug}`}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {d.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Links
            </h3>
            <Select aria-label="Jump to district">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a district" />
              </SelectTrigger>
              <SelectContent>
                {districts.map((d) => (
                  <SelectItem key={d.id} value={d.slug}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-3 text-xs text-muted-foreground">
              Karnataka Tourism · {currentYear}
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}