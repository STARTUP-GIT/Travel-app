"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Input } from "@/components/ui/input";

/** District-scoped search that always searches within the selected district. */
export function DistrictSearchForm({
  stateSlug,
  districtSlug,
}: {
  stateSlug?: string;
  districtSlug: string;
}) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    const base = stateSlug ? `/${stateSlug}/${districtSlug}` : "/explore";
    router.push(`${base}/places?q=${encodeURIComponent(query.trim())}`);
  }

  return (
    <form onSubmit={submit} className="w-full sm:max-w-sm">
      <label className="sr-only" htmlFor={`search-${districtSlug}`}>
        Search places in this district
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-white/75" />
        <Input
          id={`search-${districtSlug}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search places in this district…"
          className="h-10 rounded-xl border-white/20 bg-white/15 pl-11 text-white placeholder:text-white/70 backdrop-blur-md focus-visible:border-white/30 focus-visible:ring-2 focus-visible:ring-white/40"
        />
      </div>
    </form>
  );
}