import { SectionHeader } from "@/components/shared/section-header";
import { PackageCard } from "@/features/guides/ui/package-card";
import { listPackagesForDistrict } from "@/features/guides/api/guides.api";

/**
 * "Common Guides" on the district home page: the tour packages local Common
 * Guides sell, as individual cards.
 *
 * Packages, not guides, are the unit here — a traveller is choosing a tour, and
 * a guide with two packages contributes two cards rather than one merged entry.
 *
 * No filtering is done in this file. `listPackagesForDistrict` already scopes the
 * result to the district, because the backend publishes packages only through the
 * places they contain and only for approved guides. Deriving the district from
 * the route slug therefore changes the packages with the district, with nothing
 * to keep in sync here.
 *
 * Every package is listed rather than a first few: the header already links to
 * the district's full guides page, and a package silently missing from a list
 * that looks like the whole set reads as "this tour is not available here".
 *
 * Rendered inside a `<Suspense>` boundary by the page, so the district home page
 * is not held up by these requests, and a failure is contained to this section
 * rather than taking the page down.
 */
export async function DistrictCommonGuides({
  districtId,
  districtSlug,
  stateSlug,
}: {
  districtId: string;
  districtSlug: string;
  stateSlug: string;
}) {
  let packages: Awaited<ReturnType<typeof listPackagesForDistrict>> = [];
  let failed = false;

  try {
    packages = await listPackagesForDistrict(districtId);
  } catch {
    // Section-level failure only. The rest of the district page has already
    // rendered and stays usable, so the guide section just steps aside.
    failed = true;
  }

  return (
    <section aria-labelledby="common-guides-heading">
      <SectionHeader
        title="Common Guides"
        subtitle="Tour packages from local common guides"
        href={`/${stateSlug}/${districtSlug}/guides`}
      />

      {failed ? (
        <p className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Tour packages could not be loaded right now.
        </p>
      ) : packages.length === 0 ? (
        // A district with no published packages is ordinary, not an error, so
        // this stays a compact one-liner instead of a large empty panel.
        <p className="py-3 text-sm text-muted-foreground">
          No tour packages available in this district yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg.id}
              pkg={pkg}
              districtSlug={districtSlug}
              stateSlug={stateSlug}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/** Skeleton matching the section's card grid, so the swap causes no layout jump. */
export function DistrictCommonGuidesFallback() {
  return (
    <div aria-busy="true" role="status">
      <p className="sr-only">Loading tour packages…</p>
      <div className="mb-3.5 space-y-1">
        <div className="h-5 w-40 rounded-md bg-muted" />
        <div className="h-3 w-64 rounded-md bg-muted/70" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="space-y-3 rounded-2xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="size-12 shrink-0 rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded-md bg-muted" />
                <div className="h-3 w-1/2 rounded-md bg-muted/70" />
              </div>
            </div>
            <div className="aspect-[16/9] w-full rounded-xl bg-muted" />
            <div className="h-3 w-full rounded-md bg-muted/70" />
          </div>
        ))}
      </div>
    </div>
  );
}
