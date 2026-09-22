import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Report a problem · Karnataka Tourism Guide",
  description: "Tell us about a problem with a place, guide, hotel or restaurant.",
};

import ReportScreen from "./report-screen";

export default function ReportPage() {
  return (
    <Suspense fallback={null}>
      <ReportScreen />
    </Suspense>
  );
}