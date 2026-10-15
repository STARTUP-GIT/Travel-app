"use client";

import * as React from "react";
import { toast } from "sonner";
import { patchJSON, postJSON } from "@/lib/api/mutate";
import { useAdminData } from "./use-admin-data";
import type { BrandAdminResponse, BrandConfig } from "@/lib/types";

export const DEFAULT_BRAND_CONFIG: BrandConfig = {
  brandName: "ATLASWANDERS",
  tagline: "Discover Places. Experience Local.",
  primaryColor: "#0B2545",
  secondaryColor: "#087E8B",
  accentColor: "#D9A441",
  primaryLogoUrl: "/brand/atlaswanders-primary.svg",
  symbolLogoUrl: "/brand/atlaswanders-symbol.svg",
  lightLogoUrl: "/brand/atlaswanders-light.svg",
  darkLogoUrl: "/brand/atlaswanders-dark.svg",
  faviconUrl: "/brand/atlaswanders-favicon.svg",
  clientFaviconUrl: "/brand/atlaswanders-favicon.svg",
  serviceFaviconUrl: "/brand/atlaswanders-favicon.svg",
  adminFaviconUrl: "/brand/atlaswanders-favicon.svg",
  clientHeroImageUrl: "",
  serviceHeroImageUrl: "",
  defaultDistrictHeroImageUrl: "",
  showDistrictHeadingByDefault: true,
  defaultTitle: "ATLASWANDERS | Discover Places. Experience Local.",
  titleFormat: "%s | ATLASWANDERS",
  defaultMetaDescription:
    "Discover tourist destinations, verified local guides, tour packages, stays and dining across Karnataka and beyond with ATLASWANDERS.",
  openGraphTitle: "ATLASWANDERS — Discover Places. Experience Local.",
  openGraphDescription:
    "Global travel discovery and local-services marketplace connecting travellers with authentic experiences.",
  openGraphImageUrl: "/brand/atlaswanders_og_banner.jpg",
  canonicalUrl: "https://www.atlaswanders.com",
  brandDescription:
    "Global travel discovery, local tourism marketplace, and travel-services platform.",
  themePreference: "light",
};

export interface BrandSettingsContextValue {
  data: BrandAdminResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  // Three clear tiers of state
  draft: BrandConfig | undefined; // Persisted backend draft
  published: BrandConfig | undefined; // Currently published live configuration
  draftForm: BrandConfig; // Working in-memory draft across all platform pages
  dirtyFields: Set<keyof BrandConfig>;
  isDirty: boolean;
  hasUnpublishedChanges: boolean;
  saving: boolean;
  publishing: boolean;
  discarding: boolean;
  updateField: (field: keyof BrandConfig, value: string) => void;
  updateFields: (partial: Partial<BrandConfig>) => void;
  resetToDefaults: (fields: Partial<BrandConfig>) => void;
  saveDraft: (specificPatch?: Partial<BrandConfig>) => Promise<boolean>;
  publish: () => Promise<boolean>;
  discard: () => Promise<boolean>;
}

const BrandSettingsContext = React.createContext<BrandSettingsContextValue | null>(null);

export function BrandSettingsProvider({ children }: { children: React.ReactNode }) {
  const { data, loading, error, refetch } = useAdminData<BrandAdminResponse>("/admin/api/branding");

  const [saving, setSaving] = React.useState(false);
  const [publishing, setPublishing] = React.useState(false);
  const [discarding, setDiscarding] = React.useState(false);

  // In-memory working draft state shared across all platform branding pages
  const [draftForm, setDraftForm] = React.useState<BrandConfig>(DEFAULT_BRAND_CONFIG);
  const [dirtyFields, setDirtyFields] = React.useState<Set<keyof BrandConfig>>(new Set());
  const initializedRef = React.useRef(false);

  // Synchronize persisted draft from backend ONLY when not dirty or on initial load
  React.useEffect(() => {
    if (data?.draft) {
      setDraftForm((prev) => {
        const d = data.draft;
        return {
          brandName: dirtyFields.has("brandName") ? prev.brandName : (d.brandName ?? DEFAULT_BRAND_CONFIG.brandName),
          tagline: dirtyFields.has("tagline") ? prev.tagline : (d.tagline ?? ""),
          primaryColor: dirtyFields.has("primaryColor") ? prev.primaryColor : (d.primaryColor || DEFAULT_BRAND_CONFIG.primaryColor),
          secondaryColor: dirtyFields.has("secondaryColor") ? prev.secondaryColor : (d.secondaryColor || DEFAULT_BRAND_CONFIG.secondaryColor),
          accentColor: dirtyFields.has("accentColor") ? prev.accentColor : (d.accentColor || DEFAULT_BRAND_CONFIG.accentColor),
          primaryLogoUrl: dirtyFields.has("primaryLogoUrl") ? prev.primaryLogoUrl : (d.primaryLogoUrl ?? ""),
          symbolLogoUrl: dirtyFields.has("symbolLogoUrl") ? prev.symbolLogoUrl : (d.symbolLogoUrl ?? ""),
          lightLogoUrl: dirtyFields.has("lightLogoUrl") ? prev.lightLogoUrl : (d.lightLogoUrl ?? ""),
          darkLogoUrl: dirtyFields.has("darkLogoUrl") ? prev.darkLogoUrl : (d.darkLogoUrl ?? ""),
          faviconUrl: dirtyFields.has("faviconUrl") ? prev.faviconUrl : (d.faviconUrl ?? ""),
          clientFaviconUrl: dirtyFields.has("clientFaviconUrl") ? prev.clientFaviconUrl : (d.clientFaviconUrl ?? d.faviconUrl ?? DEFAULT_BRAND_CONFIG.faviconUrl),
          serviceFaviconUrl: dirtyFields.has("serviceFaviconUrl") ? prev.serviceFaviconUrl : (d.serviceFaviconUrl ?? d.faviconUrl ?? DEFAULT_BRAND_CONFIG.faviconUrl),
          adminFaviconUrl: dirtyFields.has("adminFaviconUrl") ? prev.adminFaviconUrl : (d.adminFaviconUrl ?? d.faviconUrl ?? DEFAULT_BRAND_CONFIG.faviconUrl),
          clientHeroImageUrl: dirtyFields.has("clientHeroImageUrl") ? prev.clientHeroImageUrl : (d.clientHeroImageUrl ?? ""),
          serviceHeroImageUrl: dirtyFields.has("serviceHeroImageUrl") ? prev.serviceHeroImageUrl : (d.serviceHeroImageUrl ?? ""),
          defaultDistrictHeroImageUrl: dirtyFields.has("defaultDistrictHeroImageUrl") ? prev.defaultDistrictHeroImageUrl : (d.defaultDistrictHeroImageUrl ?? ""),
          showDistrictHeadingByDefault: dirtyFields.has("showDistrictHeadingByDefault") ? prev.showDistrictHeadingByDefault : (d.showDistrictHeadingByDefault ?? true),
          defaultTitle: dirtyFields.has("defaultTitle") ? prev.defaultTitle : (d.defaultTitle ?? ""),
          titleFormat: dirtyFields.has("titleFormat") ? prev.titleFormat : (d.titleFormat ?? DEFAULT_BRAND_CONFIG.titleFormat),
          defaultMetaDescription: dirtyFields.has("defaultMetaDescription") ? prev.defaultMetaDescription : (d.defaultMetaDescription ?? ""),
          openGraphTitle: dirtyFields.has("openGraphTitle") ? prev.openGraphTitle : (d.openGraphTitle ?? ""),
          openGraphDescription: dirtyFields.has("openGraphDescription") ? prev.openGraphDescription : (d.openGraphDescription ?? ""),
          openGraphImageUrl: dirtyFields.has("openGraphImageUrl") ? prev.openGraphImageUrl : (d.openGraphImageUrl ?? ""),
          canonicalUrl: dirtyFields.has("canonicalUrl") ? prev.canonicalUrl : (d.canonicalUrl ?? ""),
          brandDescription: dirtyFields.has("brandDescription") ? prev.brandDescription : (d.brandDescription ?? ""),
          themePreference: dirtyFields.has("themePreference") ? prev.themePreference : (d.themePreference || "light"),
        };
      });
      initializedRef.current = true;
    }
  }, [data?.draft, dirtyFields]);

  const updateField = React.useCallback((field: keyof BrandConfig, value: string) => {
    setDraftForm((prev) => ({ ...prev, [field]: value }));
    setDirtyFields((prev) => {
      const next = new Set(prev);
      next.add(field);
      return next;
    });
  }, []);

  const updateFields = React.useCallback((partial: Partial<BrandConfig>) => {
    setDraftForm((prev) => ({ ...prev, ...partial }));
    setDirtyFields((prev) => {
      const next = new Set(prev);
      (Object.keys(partial) as (keyof BrandConfig)[]).forEach((k) => next.add(k));
      return next;
    });
  }, []);

  const resetToDefaults = React.useCallback((fields: Partial<BrandConfig>) => {
    setDraftForm((prev) => ({ ...prev, ...fields }));
    setDirtyFields((prev) => {
      const next = new Set(prev);
      (Object.keys(fields) as (keyof BrandConfig)[]).forEach((k) => next.add(k));
      return next;
    });
  }, []);

  const isDirty = dirtyFields.size > 0;
  const hasUnpublishedChanges = (data?.hasUnpublishedChanges ?? false) || isDirty;

  const saveDraft = React.useCallback(
    async (specificPatch?: Partial<BrandConfig>): Promise<boolean> => {
      const toSave = specificPatch ? { ...draftForm, ...specificPatch } : draftForm;

      if (!toSave.brandName || !toSave.brandName.trim()) {
        toast.error("Validation error", { description: "Brand name cannot be empty." });
        return false;
      }

      setSaving(true);
      try {
        await patchJSON("/admin/api/branding", toSave);
        toast.success("Draft saved", {
          description: "Your changes are saved to draft. Publish them when ready.",
        });
        if (specificPatch) {
          setDraftForm((prev) => ({ ...prev, ...specificPatch }));
        }
        setDirtyFields(new Set());
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
    [draftForm, refetch]
  );

  const publish = React.useCallback(async (): Promise<boolean> => {
    setPublishing(true);
    try {
      if (dirtyFields.size > 0) {
        const saved = await saveDraft();
        if (!saved) return false;
      }
      const res = (await postJSON("/admin/api/branding/publish", {})) as {
        message?: string;
        published?: BrandConfig;
      };
      toast.success("Branding published", {
        description: res?.message || "Public sites now reflect the latest published branding.",
      });
      setDirtyFields(new Set());
      refetch();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to publish branding";
      toast.error("Publish failed", { description: msg });
      return false;
    } finally {
      setPublishing(false);
    }
  }, [dirtyFields, saveDraft, refetch]);

  const discard = React.useCallback(async (): Promise<boolean> => {
    setDiscarding(true);
    try {
      await postJSON("/admin/api/branding/discard", {});
      toast.success("Draft discarded", {
        description: "Draft settings reset back to currently published live branding.",
      });
      setDirtyFields(new Set());
      if (data?.published) {
        setDraftForm({ ...DEFAULT_BRAND_CONFIG, ...data.published });
      }
      refetch();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to discard draft";
      toast.error("Discard failed", { description: msg });
      return false;
    } finally {
      setDiscarding(false);
    }
  }, [data?.published, refetch]);

  const value: BrandSettingsContextValue = {
    data,
    loading,
    error,
    refetch,
    draft: data?.draft,
    published: data?.published,
    draftForm,
    dirtyFields,
    isDirty,
    hasUnpublishedChanges,
    saving,
    publishing,
    discarding,
    updateField,
    updateFields,
    resetToDefaults,
    saveDraft,
    publish,
    discard,
  };

  return <BrandSettingsContext.Provider value={value}>{children}</BrandSettingsContext.Provider>;
}

export function useBrandSettings(): BrandSettingsContextValue {
  const context = React.useContext(BrandSettingsContext);
  if (context) {
    return context;
  }
  // Safe standalone fallback
  throw new Error("useBrandSettings must be used within a BrandSettingsProvider");
}
