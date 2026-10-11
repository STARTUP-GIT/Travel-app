"use client";

import { Compass, MapPin, Plus, Route } from "lucide-react";
import * as React from "react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlacesManager } from "@/features/places/components/places-manager";
import { TourPackageManager } from "@/features/provider/components/tour-package-manager";
import type { ManageablePlace, TourPackage } from "@/features/provider/types";

export function CommonGuideServices({
  packages,
  packagesError,
  places,
  placesError,
  districts,
}: {
  packages: TourPackage[];
  packagesError: string | null;
  places: ManageablePlace[];
  placesError: string | null;
  districts: { id: string; name: string }[];
}) {
  const [activeTab, setActiveTab] = React.useState<"packages" | "places">("packages");

  return (
    <div className="app-container flex flex-col gap-6">
      <PageHeader
        icon={
          activeTab === "packages" ? (
            <Route className="size-6 text-primary" />
          ) : (
            <MapPin className="size-6 text-primary" />
          )
        }
        title={activeTab === "packages" ? "Tour Packages" : "Places Management"}
        description={
          activeTab === "packages"
            ? "Create, configure, and manage your tour packages, pricing rules, itineraries, meals, transport, and specific guide services."
            : "Manage independent tourist attractions and places. Add and update places independently so they are reusable across all your packages."
        }
      />

      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "packages" | "places")}
        className="w-full"
      >
        <div className="flex items-center justify-between border-b border-border pb-4">
          <TabsList className="h-12 rounded-2xl border border-border/80 bg-muted/70 p-1.5 shadow-sm">
            <TabsTrigger
              value="packages"
              className="gap-2 rounded-xl px-4 py-2 font-semibold text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-border/80 data-[state=active]:shadow-sm"
            >
              <Route className="size-4" />
              Tour Packages
              <Badge variant="secondary" className="ml-1 text-xs">
                {packages.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="places"
              className="gap-2 rounded-xl px-4 py-2 font-semibold text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:border data-[state=active]:border-border/80 data-[state=active]:shadow-sm"
            >
              <Compass className="size-4" />
              Places
              <Badge variant="secondary" className="ml-1 text-xs">
                {places.length}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="packages" className="mt-6 focus-visible:outline-none">
          <TourPackageManager
            packages={packages}
            error={packagesError}
          />
        </TabsContent>

        <TabsContent value="places" className="mt-6 focus-visible:outline-none">
          {placesError ? (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              {placesError}
            </div>
          ) : (
            <PlacesManager initialPlaces={places} districts={districts} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
