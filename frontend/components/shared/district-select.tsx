"use client";

import { ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DistrictSummary } from "@/features/locations/types";

export function DistrictSelect({
  districts,
  placeholder = "Choose a district",
  value,
  className,
}: {
  districts: DistrictSummary[];
  placeholder?: string;
  value?: string;
  className?: string;
}) {
  const router = useRouter();

  function handleChange(slug: string) {
    router.push(`/${slug}`);
  }

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className={className} aria-label={placeholder}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {districts.map((d) => (
          <SelectItem key={d.id} value={d.slug}>
            <span className="flex items-center gap-2">
              {d.name}
              <span className="text-xs text-muted-foreground">
                ({d.hotelCount + d.restaurantCount + d.placeCount} spots)
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function DistrictSelectButton({
  districts,
  value,
  label,
}: {
  districts: DistrictSummary[];
  value?: string;
  label?: string;
}) {
  return (
    <div className="relative">
      <DistrictSelect districts={districts} value={value} placeholder={label} />
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}