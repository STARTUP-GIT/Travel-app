"use client";

import {
  Compass,
  Edit2,
  Eye,
  Filter,
  Image as ImageIcon,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Tag,
  Ticket,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/states";
import { CreatePlaceDialog } from "@/features/places/components/create-place-dialog";
import { EditPlaceDialog } from "@/features/places/components/edit-place-dialog";
import { PlaceDetailModal } from "@/features/places/components/place-detail-modal";
import type { ManageablePlace } from "@/features/provider/types";
import { formatCurrency, cn } from "@/lib/utils";

export function PlacesManager({
  initialPlaces,
  districts,
}: {
  initialPlaces: ManageablePlace[];
  districts: { id: string; name: string }[];
}) {
  const [places, setPlaces] = React.useState<ManageablePlace[]>(initialPlaces);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [districtFilter, setDistrictFilter] = React.useState<string>("ALL");
  const [statusFilter, setStatusFilter] = React.useState<string>("ALL");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingPlace, setEditingPlace] = React.useState<ManageablePlace | null>(null);
  const [detailPlace, setDetailPlace] = React.useState<ManageablePlace | null>(null);

  // Sync initialPlaces if server revalidates
  React.useEffect(() => {
    setPlaces(initialPlaces);
  }, [initialPlaces]);

  const filteredPlaces = React.useMemo(() => {
    return places.filter((place) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = place.name.toLowerCase().includes(query);
        const matchesCat = place.category?.toLowerCase().includes(query);
        const matchesDesc = place.description?.toLowerCase().includes(query);
        const matchesDistrict = place.district?.name.toLowerCase().includes(query);
        if (!matchesName && !matchesCat && !matchesDesc && !matchesDistrict) {
          return false;
        }
      }

      if (districtFilter !== "ALL" && place.district?.id !== districtFilter) {
        return false;
      }

      if (statusFilter !== "ALL" && place.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [places, searchQuery, districtFilter, statusFilter]);

  function handleCreated(newPlace: ManageablePlace) {
    setPlaces((prev) => [newPlace, ...prev]);
  }

  function handleUpdated(updatedPlace: ManageablePlace) {
    setPlaces((prev) =>
      prev.map((p) => (p.id === updatedPlace.id ? updatedPlace : p))
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Controls Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search places by name, category, or keyword…"
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={districtFilter} onValueChange={setDistrictFilter}>
              <SelectTrigger className="w-[180px]">
                <MapPin className="mr-1.5 size-3.5 text-muted-foreground" />
                <SelectValue placeholder="All districts" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                <SelectItem value="ALL">All districts</SelectItem>
                {districts.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="mr-1.5 size-3.5 text-muted-foreground" />
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PENDING">Pending Review</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={() => setCreateOpen(true)}
          className="shrink-0 gap-1.5 rounded-xl shadow-sm"
        >
          <Plus className="size-4" />
          Add place
        </Button>
      </div>

      {/* Places Grid */}
      {filteredPlaces.length === 0 ? (
        <EmptyState
          icon={Compass}
          title={
            places.length === 0
              ? "No places created yet"
              : "No places match your filter"
          }
          description={
            places.length === 0
              ? "Add independent places that can be selected in any of your tour packages. Places you add are reusable and don't automatically create a package."
              : "Try adjusting your search query, district filter, or status filter."
          }
          action={
            places.length === 0 ? (
              <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
                <Plus className="size-4" />
                Add your first place
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery("");
                  setDistrictFilter("ALL");
                  setStatusFilter("ALL");
                }}
              >
                Clear all filters
              </Button>
            )
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlaces.map((place) => {
            const thumbnail = place.images?.[0];
            const statusVariant =
              place.status === "APPROVED"
                ? "default"
                : place.status === "PENDING"
                ? "secondary"
                : "destructive";
            const statusLabel =
              place.status === "APPROVED"
                ? "Approved"
                : place.status === "PENDING"
                ? "Pending review"
                : "Rejected";

            const priceDisplay =
              place.pricing && place.pricing.length > 0
                ? "Pricing bands"
                : typeof place.entryfee === "number" && place.entryfee > 0
                ? formatCurrency(place.entryfee)
                : "Free entry";

            return (
              <div
                key={place.id}
                className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:border-primary/40 hover:shadow-md"
              >
                <div>
                  {/* Image Header */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted">
                    {thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbnail}
                        alt={place.name}
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center text-muted-foreground/60">
                        <ImageIcon className="size-8" />
                      </div>
                    )}
                    <div className="absolute right-2 top-2">
                      <Badge variant={statusVariant} className="shadow-sm">
                        {statusLabel}
                      </Badge>
                    </div>
                    {place.category && (
                      <div className="absolute bottom-2 left-2">
                        <Badge
                          variant="secondary"
                          className="bg-black/60 text-white backdrop-blur-md"
                        >
                          <Tag className="mr-1 size-3" />
                          {place.category}
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="line-clamp-1 font-semibold text-foreground group-hover:text-primary">
                        {place.name}
                      </h3>
                    </div>

                    {place.district?.name && (
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="size-3 text-primary" />
                        {place.district.name}
                      </p>
                    )}

                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {place.description || "No description provided."}
                    </p>

                    <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                      <Ticket className="size-3.5 text-primary" />
                      <span>{priceDisplay}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-4 py-2.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDetailPlace(place)}
                    className="gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Eye className="size-3.5" />
                    Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingPlace(place)}
                    className="gap-1 rounded-lg text-xs font-medium"
                  >
                    <Edit2 className="size-3.5" />
                    Edit
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Standalone Create Place Dialog */}
      <CreatePlaceDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        districts={districts}
        onCreated={handleCreated}
      />

      {/* Standalone Edit Place Dialog */}
      <EditPlaceDialog
        place={editingPlace}
        open={!!editingPlace}
        onOpenChange={(open) => !open && setEditingPlace(null)}
        onUpdated={handleUpdated}
      />

      {/* Standalone Place Detail Modal */}
      <PlaceDetailModal
        place={detailPlace}
        open={!!detailPlace}
        onOpenChange={(open) => !open && setDetailPlace(null)}
        onEdit={(place) => setEditingPlace(place)}
      />
    </div>
  );
}
