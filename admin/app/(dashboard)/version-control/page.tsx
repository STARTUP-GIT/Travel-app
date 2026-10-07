"use client";

import * as React from "react";
import { PageHeader } from "@/components/admin/page-header";
import { ErrorState, LoadingState } from "@/components/admin/state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAdminData } from "@/lib/hooks/use-admin-data";
import { patchJSON } from "@/lib/api/mutate";
import { formatDate } from "@/lib/utils";
import type { AppVersionConfig } from "@/lib/types";
import { Smartphone, Store, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

type VersionResponse = {
  client: AppVersionConfig;
  service: AppVersionConfig;
};

export default function VersionControlPage() {
  const { data, loading, error, refetch } = useAdminData<VersionResponse>("/admin/api/version-config");

  if (loading) return <LoadingState rows={4} />;
  if (error || !data) return <ErrorState message={error ?? "Failed to load"} onRetry={refetch} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="App Version Control & Force Update"
        subtitle="Control mobile app version checks, minimum required build numbers, and force update prompts."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <VersionCard appType="CLIENT" config={data.client} onSaved={refetch} />
        <VersionCard appType="SERVICE" config={data.service} onSaved={refetch} />
      </div>
    </div>
  );
}

function VersionCard({
  appType,
  config,
  onSaved,
}: {
  appType: "CLIENT" | "SERVICE";
  config: AppVersionConfig;
  onSaved: () => void;
}) {
  const [minVersion, setMinVersion] = React.useState(config?.minVersion ?? "1.0.0");
  const [latestVersion, setLatestVersion] = React.useState(config?.latestVersion ?? "1.0.0");
  const [forceUpdate, setForceUpdate] = React.useState(config?.forceUpdate ?? false);
  const [updateMessage, setUpdateMessage] = React.useState(
    config?.updateMessage ?? "A new version of the app is available. Please update to continue."
  );
  const [storeUrl, setStoreUrl] = React.useState(config?.storeUrl ?? "");
  const [submitting, setSubmitting] = React.useState(false);

  const title = appType === "CLIENT" ? "Customer Mobile & Web App" : "Service Mobile & Web App";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await patchJSON(`/admin/api/version-config/${appType}`, {
        minVersion,
        latestVersion,
        forceUpdate,
        updateMessage,
        storeUrl,
      });
      toast.success(`${appType} version configuration saved`);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save version config");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mono-card p-6">
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          {appType === "CLIENT" ? (
            <Smartphone className="h-5 w-5 text-primary" />
          ) : (
            <Store className="h-5 w-5 text-primary" />
          )}
          <h2 className="font-semibold">{title}</h2>
        </div>
        <span className="rounded bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {appType}
        </span>
      </div>

      <form onSubmit={handleSave} className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`${appType}-min`}>Minimum Version (Required)</Label>
            <Input
              id={`${appType}-min`}
              value={minVersion}
              onChange={(e) => setMinVersion(e.target.value)}
              placeholder="e.g. 1.0.0"
              className="mt-1 font-mono text-sm"
              required
            />
          </div>
          <div>
            <Label htmlFor={`${appType}-latest`}>Latest Version (Available)</Label>
            <Input
              id={`${appType}-latest`}
              value={latestVersion}
              onChange={(e) => setLatestVersion(e.target.value)}
              placeholder="e.g. 1.2.0"
              className="mt-1 font-mono text-sm"
              required
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <span className="font-medium text-sm">Force Update Block</span>
            <p className="text-xs text-muted-foreground">
              Block app usage if app version is less than minimum version.
            </p>
          </div>
          <Switch checked={forceUpdate} onCheckedChange={setForceUpdate} />
        </div>

        <div>
          <Label htmlFor={`${appType}-msg`}>Update Prompt Message</Label>
          <Textarea
            id={`${appType}-msg`}
            value={updateMessage}
            onChange={(e) => setUpdateMessage(e.target.value)}
            rows={3}
            className="mt-1 text-sm"
          />
        </div>

        <div>
          <Label htmlFor={`${appType}-url`}>Store / Download URL</Label>
          <Input
            id={`${appType}-url`}
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
            placeholder="https://play.google.com/store/apps/details?id=..."
            className="mt-1 text-sm"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            Last updated: {formatDate(config?.updatedAt)}
          </span>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : "Save Version Policy"}
          </Button>
        </div>
      </form>
    </div>
  );
}
