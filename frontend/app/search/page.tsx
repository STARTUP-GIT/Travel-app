import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Search · Karnataka Tourism Guide",
  description: "Search places, guides, hotels and restaurants.",
};

import SearchScreen from "./search-screen";

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchScreen />
    </Suspense>
  );
}