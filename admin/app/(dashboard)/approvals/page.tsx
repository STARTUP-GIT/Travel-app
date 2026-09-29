"use client";

import * as React from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { ToggleField } from "@/components/admin/toggle-field";
import { patchJSON } from "@/lib/api/mutate";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import type { AutoApprovalSettings } from "@/lib/types";

const FIELDS: {
  key: keyof AutoApprovalSettings;
  label: string;
  description: string;
}[] = [
  {
    key: "placesAutoApproval",
    label: "Places",
    description:
      "Newly submitted places go live immediately instead of waiting in Place Requests.",
  },
  {
    key: "guidesAutoApproval",
    label: "Guides",
    description:
      "Guides who sign up are approved immediately and become visible to travellers.",
  },
  {
    key: "hotelsAutoApproval",
    label: "Hotels",
    description: "New hotels skip the approval queue and are listed right away.",
  },
  {
    key: "restaurantsAutoApproval",
    label: "Restaurants",
    description: "New restaurants skip the approval queue and are listed right away.",
  },
];

export default function ApprovalsPage() {
  const { data, loading, error, refetch } = useAdminData<{
    settings: AutoApprovalSettings;
  }>("/admin/api/auto-approval");

  const [settings, setSettings] = React.useState<AutoApprovalSettings | null>(null);
  const [saving, setSaving] = React.useState<keyof AutoApprovalSettings | null>(null);

  React.useEffect(() => {
    if (data?.settings) setSettings(data.settings);
  }, [data]);

  async function update(key: keyof AutoApprovalSettings, next: boolean) {
    if (!settings) return;
    const previous = settings[key];

    // Optimistic: the switch should not lag behind the tap. The server value is
    // re-read below, and a failure rolls the single flag back.
    setSaving(key);
    setSettings({ ...settings, [key]: next });
    try {
      const response = await patchJSON("/admin/api/auto-approval", { [key]: next });
      const saved = (response as { settings?: AutoApprovalSettings } | undefined)?.settings;
      if (saved) setSettings(saved);
      toast.success(
        next ? "Auto approval turned on" : "Auto approval turned off",
        { description: FIELDS.find((f) => f.key === key)?.label }
      );
    } catch (err) {
      setSettings((current) => (current ? { ...current, [key]: previous } : current));
      const message = err instanceof Error ? err.message : undefined;
      toast.error("Could not update setting", {
        description: message || "Please try again.",
      });
    } finally {
      setSaving(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Approvals"
        subtitle="Choose which kinds of new content are published automatically. Anything left off waits for review."
      />

      {loading ? (
        <LoadingState rows={4} />
      ) : error || !settings ? (
        <ErrorState
          message={
            error ??
            "Approval settings are unavailable. Save Branding & Landing once, then try again."
          }
          onRetry={refetch}
        />
      ) : (
        <div className="mono-card max-w-2xl divide-y divide-border p-2">
          {FIELDS.map((field) => (
            <div key={field.key} className="p-4">
              <ToggleField
                label={field.label}
                description={field.description}
                checked={settings[field.key]}
                busy={saving === field.key}
                onChange={(next) => update(field.key, next)}
              />
            </div>
          ))}
          <p className="px-4 py-3 text-xs text-muted-foreground">
            Approved content is visible immediately. Everything else starts as{" "}
            <span className="font-mono">PENDING</span> and appears in that section for
            review.
          </p>
        </div>
      )}
    </div>
  );
}
