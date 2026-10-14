"use client";

import * as React from "react";
import { toast } from "sonner";
import { patchJSON, postJSON } from "@/lib/api/mutate";
import { useAdminData } from "./use-admin-data";
import type { BrandAdminResponse, BrandConfig } from "@/lib/types";

export function useBrandSettings() {
  const { data, loading, error, refetch } = useAdminData<BrandAdminResponse>("/admin/api/branding");

  const [saving, setSaving] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [discarding, setDiscarding] = React.useState(false);

  const saveDraft = React.useCallback(
    async (patch: Partial<BrandConfig>): Promise<boolean> => {
      setSaving(true);
      try {
        await patchJSON("/admin/api/branding", patch);
        toast.success("Draft saved", {
          description: "Your changes are saved to draft. Publish them when ready.",
        });
        refetch();
        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to save draft";
        toast.error("Save failed", { description: msg });
        return false;
      } finally {
        setSaving(false);
      }
    },
    [refetch]
  );

  const publish = React.useCallback(async (): Promise<boolean> => {
    setPublishing(true);
    try {
      const res = (await postJSON("/admin/api/branding/publish", {})) as {
        message?: string;
        published?: BrandConfig;
      };
      toast.success("Branding published", {
        description: res?.message || "Public sites now reflect the latest published branding.",
      });
      refetch();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to publish branding";
      toast.error("Publish failed", { description: msg });
      return false;
    } finally {
      setPublishing(false);
    }
  }, [refetch]);

  const discard = React.useCallback(async (): Promise<boolean> => {
    setDiscarding(true);
    try {
      await postJSON("/admin/api/branding/discard", {});
      toast.success("Draft discarded", {
        description: "Draft settings reset back to currently published live branding.",
      });
      refetch();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to discard draft";
      toast.error("Discard failed", { description: msg });
      return false;
    } finally {
      setDiscarding(false);
    }
  }, [refetch]);

  return {
    data,
    loading,
    error,
    refetch,
    saveDraft,
    publish,
    discard,
    saving,
    publishing,
    discarding,
    draft: data?.draft,
    published: data?.published,
    hasUnpublishedChanges: data?.hasUnpublishedChanges ?? false,
  };
}
