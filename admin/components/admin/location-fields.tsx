"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DistrictAdmin, StateAdmin } from "@/lib/types";

export function LocationFields({
  stateId,
  districtId,
  states,
  districts,
  statesLoading,
  loading,
  disabled = false,
  onChange,
}: {
  stateId: string;
  districtId: string;
  states: StateAdmin[];
  districts: DistrictAdmin[];
  statesLoading: boolean;
  loading: boolean;
  disabled?: boolean;
  onChange: (stateId: string, districtId: string) => void;
}) {
  return (
    <>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">State</label>
        <Select
          value={stateId || undefined}
          disabled={disabled || statesLoading}
          onValueChange={(value) => onChange(value, "")}
        >
          <SelectTrigger aria-label="State" className="w-full">
            <SelectValue placeholder="Select state" />
          </SelectTrigger>
          <SelectContent>
            {states.map((state) => (
              <SelectItem key={state.id} value={state.id}>
                {state.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">District</label>
        <Select
          value={districtId || undefined}
          disabled={disabled || statesLoading || !stateId || loading}
          onValueChange={(value) => onChange(stateId, value)}
        >
          <SelectTrigger aria-label="District" className="w-full">
            <SelectValue
              placeholder={
                statesLoading
                  ? "Loading states…"
                  : !stateId
                  ? "Select a state first"
                  : loading
                    ? "Loading districts…"
                    : "Select district"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {districts.map((district) => (
              <SelectItem key={district.id} value={district.id}>
                {district.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {stateId && !loading && districts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No enabled districts for this state.</p>
        ) : null}
      </div>
    </>
  );
}