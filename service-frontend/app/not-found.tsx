import { Compass } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="app-container max-w-lg py-16">
      <EmptyState
        icon={Compass}
        title="This page does not exist"
        description="The link may be out of date, or the listing it pointed to has been removed."
        action={
          <Button asChild>
            <Link href="/dashboard">Back to my dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
