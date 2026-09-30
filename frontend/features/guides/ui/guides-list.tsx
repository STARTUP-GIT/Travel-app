"use client";

import * as React from "react";

import { EmptyState } from "@/components/shared/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GuideCard } from "@/features/guides/ui/guide-card";
import { PackageCard } from "@/features/guides/ui/package-card";
import type { GuideWithContext, PackageWithContext } from "@/features/guides/types";
import { LoadingState } from "@/components/shared/loading-state";
import { Compass, Route } from "lucide-react";

export function GuidesList({
  guides,
  packages = [],
  districtSlug,
  stateSlug,
  isLoading,
}: {
  guides: GuideWithContext[];
  /** Tour packages discovered in this district. */
  packages?: PackageWithContext[];
  districtSlug: string;
  stateSlug?: string;
  isLoading?: boolean;
}) {
  const specific = guides.filter((g) => g.type === "specific");
  const common = guides.filter((g) => g.type === "common");

  if (isLoading) {
    return <LoadingState label="Finding local guides…" />;
  }

  if (guides.length === 0 && packages.length === 0) {
    return (
      <EmptyState
        icon={Compass}
        title="No guides published yet"
        description="Guides are approved before they appear here. Please check back soon."
      />
    );
  }

  return (
    <Tabs defaultValue="all" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-4 rounded-2xl bg-muted p-1">
        <TabsTrigger value="all" className="rounded-xl">All ({guides.length + packages.length})</TabsTrigger>
        <TabsTrigger value="specific" className="rounded-xl">Specific ({specific.length})</TabsTrigger>
        <TabsTrigger value="common" className="rounded-xl">Common ({common.length})</TabsTrigger>
        <TabsTrigger value="packages" className="rounded-xl">
          <Route className="size-3.5" />
          Tours ({packages.length})
        </TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="pt-4 animate-fade-in">
        <div className="flex flex-col gap-6">
          <PackageGrid
            packages={packages}
            districtSlug={districtSlug}
            stateSlug={stateSlug}
            empty={false}
          />
          <GuideGrid guides={guides} districtSlug={districtSlug} stateSlug={stateSlug} />
        </div>
      </TabsContent>
      <TabsContent value="specific" className="pt-4 animate-fade-in">
        <GuideGrid guides={specific} districtSlug={districtSlug} stateSlug={stateSlug} />
      </TabsContent>
      <TabsContent value="common" className="pt-4 animate-fade-in">
        <GuideGrid
          guides={common}
          districtSlug={districtSlug}
          stateSlug={stateSlug}
          desc="Common guides cover multiple places in one trip."
        />
      </TabsContent>
      <TabsContent value="packages" className="pt-4 animate-fade-in">
        <PackageGrid packages={packages} districtSlug={districtSlug} stateSlug={stateSlug} />
      </TabsContent>
    </Tabs>
  );
}

function PackageGrid({
  packages,
  districtSlug,
  stateSlug,
  empty = true,
}: {
  packages: PackageWithContext[];
  districtSlug: string;
  stateSlug?: string;
  /** The "All" tab always shows guides, so a missing package grid stays silent there. */
  empty?: boolean;
}) {
  if (packages.length === 0) {
    if (!empty) return null;
    return (
      <EmptyState
        icon={Route}
        title="No tours here yet"
        description="Tour guides group the places they cover into named tours. None of those tours touch this district yet."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {packages.map((pkg) => (
        <PackageCard
          key={pkg.id}
          pkg={pkg}
          districtSlug={districtSlug}
          stateSlug={stateSlug}
        />
      ))}
    </div>
  );
}

function GuideGrid({
  guides,
  districtSlug,
  stateSlug,
  desc,
}: {
  guides: GuideWithContext[];
  districtSlug: string;
  stateSlug?: string;
  desc?: string;
}) {
  if (guides.length === 0) {
    return (
      <EmptyState
        title="No guides here yet"
        description={desc ?? "There are no guides of this type in this district right now."}
      />
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {guides.map((guide) => (
        <GuideCard
          key={guide.guide.id}
          guide={guide}
          districtSlug={districtSlug}
          stateSlug={stateSlug}
          showFavorite
        />
      ))}
    </div>
  );
}