"use client";

import * as React from "react";

import { EmptyState } from "@/components/shared/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GuideCard } from "@/features/guides/ui/guide-card";
import type { GuideWithContext } from "@/features/guides/types";
import { LoadingState } from "@/components/shared/loading-state";
import { Compass } from "lucide-react";

export function GuidesList({
  guides,
  districtSlug,
  isLoading,
}: {
  guides: GuideWithContext[];
  districtSlug: string;
  isLoading?: boolean;
}) {
  const specific = guides.filter((g) => g.type === "specific");
  const common = guides.filter((g) => g.type === "common");

  if (isLoading) {
    return <LoadingState label="Finding local guides…" />;
  }

  if (guides.length === 0) {
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
      <TabsList className="grid w-full max-w-md grid-cols-3 rounded-2xl bg-muted p-1">
        <TabsTrigger value="all" className="rounded-xl">All ({guides.length})</TabsTrigger>
        <TabsTrigger value="specific" className="rounded-xl">Specific ({specific.length})</TabsTrigger>
        <TabsTrigger value="common" className="rounded-xl">Common ({common.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="all" className="pt-4 animate-fade-in">
        <GuideGrid guides={guides} districtSlug={districtSlug} />
      </TabsContent>
      <TabsContent value="specific" className="pt-4 animate-fade-in">
        <GuideGrid guides={specific} districtSlug={districtSlug} />
      </TabsContent>
      <TabsContent value="common" className="pt-4 animate-fade-in">
        <GuideGrid
          guides={common}
          districtSlug={districtSlug}
          desc="Common guides cover multiple places in one trip."
        />
      </TabsContent>
    </Tabs>
  );
}

function GuideGrid({
  guides,
  districtSlug,
  desc,
}: {
  guides: GuideWithContext[];
  districtSlug: string;
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
        <GuideCard key={guide.guide.id} guide={guide} districtSlug={districtSlug} showFavorite />
      ))}
    </div>
  );
}