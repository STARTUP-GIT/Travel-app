import Link from "next/link";
import { CloudOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/states";

/**
 * Rendered by district-scoped pages when the backend cannot be reached, so a
 * backend outage shows a recoverable message instead of a 500.
 */
export function DistrictUnavailable({ message }: { message: string }) {
  return (
    <div className="app-container py-10">
      <EmptyState
        icon={CloudOff}
        title="Couldn't load this destination"
        description={`${message} Please check your connection and try again.`}
        action={
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/explore">Choose another destination</Link>
          </Button>
        }
      />
    </div>
  );
}
