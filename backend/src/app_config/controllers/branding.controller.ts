import type { Request, Response } from "express";
import prisma from "../../db/prisma.js";

/**
 * Centrally Managed Branding System for ATLASWANDERS
 *
 * Single Source of Truth for:
 * - Brand Name, Tagline, Category, Brand Description
 * - Color Palette (Deep Navy, Travel Teal, Warm Gold, White)
 * - Logo Variants (Primary, Symbol, Light, Dark, Favicon)
 * - SEO Metadata (Title, Description, Open Graph, Canonical)
 * - Browser Title & Page Formatting
 *
 * Workflow:
 * 1. Admin reads /api/admin/branding (returns draft and published)
 * 2. Admin edits draft -> PATCH /api/admin/branding (persisted to DB draft)
 * 3. Live preview displays draft changes in real time
 * 4. Admin publishes -> POST /api/admin/branding/publish (copies draft to published)
 * 5. Public apps consume GET /api/branding (or /api/settings)
 */

export const DEFAULT_BRAND_CONFIG = {
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

export async function getOrCreateBrandConfig(id: "published" | "draft") {
  const existing = await prisma.brand_config.findUnique({
    where: { id },
  });
  if (existing) return existing;

  const initialPublishedAt = id === "published" ? new Date() : null;
  return prisma.brand_config.create({
    data: {
      id,
      ...DEFAULT_BRAND_CONFIG,
      publishedAt: initialPublishedAt,
    },
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// PUBLIC ENDPOINTS (No authentication required)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/branding
 * Public endpoint returning the approved published ATLASWANDERS configuration.
 */
export const getPublicBranding = async (_req: Request, res: Response) => {
  try {
    const published = await getOrCreateBrandConfig("published");
    return res.status(200).json({
      brandName: published.brandName,
      tagline: published.tagline,
      primaryColor: published.primaryColor,
      secondaryColor: published.secondaryColor,
      accentColor: published.accentColor,
      primaryLogoUrl: published.primaryLogoUrl,
      symbolLogoUrl: published.symbolLogoUrl,
      lightLogoUrl: published.lightLogoUrl,
      darkLogoUrl: published.darkLogoUrl,
      faviconUrl: published.faviconUrl,
      defaultTitle: published.defaultTitle,
      titleFormat: published.titleFormat,
      defaultMetaDescription: published.defaultMetaDescription,
      openGraphTitle: published.openGraphTitle,
      openGraphDescription: published.openGraphDescription,
      openGraphImageUrl: published.openGraphImageUrl,
      canonicalUrl: published.canonicalUrl,
      brandDescription: published.brandDescription,
      themePreference: published.themePreference,
      updatedAt: published.updatedAt,
      publishedAt: published.publishedAt,
    });
  } catch (error) {
    console.error("Get public branding error:", error);
    // Safe graceful fallback to official ATLASWANDERS defaults without raw server traces
    return res.status(200).json({
      ...DEFAULT_BRAND_CONFIG,
      updatedAt: new Date(),
      publishedAt: new Date(),
    });
  }
};

/**
 * GET /api/settings — Backward-compatible endpoint for customer web & mobile apps.
 * Merges app_config legacy fields with published ATLASWANDERS brand values.
 */
export const getClientSettings = async (_req: Request, res: Response) => {
  try {
    const [published, config] = await Promise.all([
      getOrCreateBrandConfig("published"),
      getOrCreateConfig("CLIENT"),
    ]);

    return res.status(200).json({
      app_name: published.brandName,
      webTitle: published.defaultTitle,
      tagline: published.tagline,
      icon: published.faviconUrl || published.symbolLogoUrl || config.icon,
      imageBanners: config.imageBanners ?? [],
      text: config.text,
      app_description: published.brandDescription || config.app_description,
      contacts: config.contacts,
      termsandconditions: config.termsandconditions,
      privacy: config.privacy,
      // Attached brand system metadata
      brandName: published.brandName,
      primaryColor: published.primaryColor,
      secondaryColor: published.secondaryColor,
      accentColor: published.accentColor,
      primaryLogoUrl: published.primaryLogoUrl,
      symbolLogoUrl: published.symbolLogoUrl,
      lightLogoUrl: published.lightLogoUrl,
      darkLogoUrl: published.darkLogoUrl,
      faviconUrl: published.faviconUrl,
      defaultTitle: published.defaultTitle,
      titleFormat: published.titleFormat,
      defaultMetaDescription: published.defaultMetaDescription,
      openGraphTitle: published.openGraphTitle,
      openGraphDescription: published.openGraphDescription,
      openGraphImageUrl: published.openGraphImageUrl,
      canonicalUrl: published.canonicalUrl,
      brandDescription: published.brandDescription,
      themePreference: published.themePreference,
      updatedAt: published.updatedAt,
      publishedAt: published.publishedAt,
    });
  } catch (error) {
    console.error("Get client settings error:", error);
    return res.status(200).json({
      ...DEFAULT_BRAND_CONFIG,
      app_name: DEFAULT_BRAND_CONFIG.brandName,
      webTitle: DEFAULT_BRAND_CONFIG.defaultTitle,
      icon: DEFAULT_BRAND_CONFIG.faviconUrl,
      imageBanners: [],
      text: "",
      contacts: "",
      termsandconditions: "",
      privacy: "",
      updatedAt: new Date(),
      publishedAt: new Date(),
    });
  }
};

/**
 * GET /api/service-settings — Backward-compatible endpoint for service provider apps.
 * Merges service app_config with published ATLASWANDERS brand values.
 */
export const getServiceSettings = async (_req: Request, res: Response) => {
  try {
    const [published, config] = await Promise.all([
      getOrCreateBrandConfig("published"),
      getOrCreateConfig("SERVICE"),
    ]);

    return res.status(200).json({
      app_name: `${published.brandName} Provider`,
      webTitle: `${published.brandName} | Provider Portal`,
      tagline: published.tagline,
      icon: published.faviconUrl || published.symbolLogoUrl || config.icon,
      imageBanners: config.imageBanners ?? [],
      text: config.text,
      app_description: published.brandDescription || config.app_description,
      contacts: config.contacts,
      termsandconditions: config.termsandconditions,
      privacy: config.privacy,
      // Attached brand system metadata
      brandName: published.brandName,
      primaryColor: published.primaryColor,
      secondaryColor: published.secondaryColor,
      accentColor: published.accentColor,
      primaryLogoUrl: published.primaryLogoUrl,
      symbolLogoUrl: published.symbolLogoUrl,
      lightLogoUrl: published.lightLogoUrl,
      darkLogoUrl: published.darkLogoUrl,
      faviconUrl: published.faviconUrl,
      defaultTitle: `${published.brandName} | Provider Portal`,
      titleFormat: published.titleFormat,
      defaultMetaDescription: published.defaultMetaDescription,
      openGraphTitle: published.openGraphTitle,
      openGraphDescription: published.openGraphDescription,
      openGraphImageUrl: published.openGraphImageUrl,
      canonicalUrl: published.canonicalUrl,
      brandDescription: published.brandDescription,
      themePreference: published.themePreference,
      updatedAt: published.updatedAt,
      publishedAt: published.publishedAt,
    });
  } catch (error) {
    console.error("Get service settings error:", error);
    return res.status(200).json({
      ...DEFAULT_BRAND_CONFIG,
      app_name: `${DEFAULT_BRAND_CONFIG.brandName} Provider`,
      webTitle: `${DEFAULT_BRAND_CONFIG.brandName} | Provider Portal`,
      icon: DEFAULT_BRAND_CONFIG.faviconUrl,
      imageBanners: [],
      text: "",
      contacts: "",
      termsandconditions: "",
      privacy: "",
      updatedAt: new Date(),
      publishedAt: new Date(),
    });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// ADMIN BRANDING ENDPOINTS (Auth required: adminAuthMiddleware)
// ──────────────────────────────────────────────────────────────────────────────

function checkHasUnpublishedChanges(
  draft: Record<string, any>,
  published: Record<string, any>
): boolean {
  const comparableKeys = [
    "brandName",
    "tagline",
    "primaryColor",
    "secondaryColor",
    "accentColor",
    "primaryLogoUrl",
    "symbolLogoUrl",
    "lightLogoUrl",
    "darkLogoUrl",
    "faviconUrl",
    "defaultTitle",
    "titleFormat",
    "defaultMetaDescription",
    "openGraphTitle",
    "openGraphDescription",
    "openGraphImageUrl",
    "canonicalUrl",
    "brandDescription",
    "themePreference",
  ];
  return comparableKeys.some((k) => (draft[k] ?? "") !== (published[k] ?? ""));
}

/**
 * GET /api/admin/branding
 * Returns current draft settings, live published settings, and change status.
 */
export const getAdminBranding = async (_req: Request, res: Response) => {
  try {
    const [draft, published] = await Promise.all([
      getOrCreateBrandConfig("draft"),
      getOrCreateBrandConfig("published"),
    ]);

    const hasUnpublishedChanges = checkHasUnpublishedChanges(draft, published);

    return res.status(200).json({
      draft,
      published,
      hasUnpublishedChanges,
    });
  } catch (error) {
    console.error("Get admin branding error:", error);
    return res.status(500).json({ message: "Unable to load branding settings" });
  }
};

/**
 * PATCH /api/admin/branding
 * Saves draft branding changes. Does not affect published configuration.
 */
export const updateDraftBranding = async (req: Request, res: Response) => {
  try {
    const body = req.body ?? {};
    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return res.status(400).json({ message: "Invalid request payload: expected JSON object" });
    }

    const data: Record<string, any> = {};

    const stringFields = [
      "brandName",
      "tagline",
      "primaryColor",
      "secondaryColor",
      "accentColor",
      "primaryLogoUrl",
      "symbolLogoUrl",
      "lightLogoUrl",
      "darkLogoUrl",
      "faviconUrl",
      "defaultTitle",
      "titleFormat",
      "defaultMetaDescription",
      "openGraphTitle",
      "openGraphDescription",
      "openGraphImageUrl",
      "canonicalUrl",
      "brandDescription",
      "themePreference",
    ];

    const hexColorRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

    for (const key of Object.keys(body)) {
      if (stringFields.includes(key)) {
        if (typeof body[key] !== "string") {
          return res.status(400).json({
            message: `Invalid format for '${key}': expected string, received ${typeof body[key]}`,
          });
        }
        const trimmed = body[key].trim();
        if (["primaryColor", "secondaryColor", "accentColor"].includes(key) && trimmed) {
          if (!hexColorRegex.test(trimmed)) {
            return res.status(400).json({
              message: `Invalid color format for '${key}': '${trimmed}' is not a valid hex color code (e.g. #0B2545)`,
            });
          }
        }
        data[key] = trimmed;
      }
    }

    // Ensure draft row exists
    await getOrCreateBrandConfig("draft");

    const updatedDraft = await prisma.brand_config.update({
      where: { id: "draft" },
      data,
    });

    const published = await getOrCreateBrandConfig("published");
    const hasUnpublishedChanges = checkHasUnpublishedChanges(updatedDraft, published);

    return res.status(200).json({
      message: "Branding settings saved to draft",
      draft: updatedDraft,
      hasUnpublishedChanges,
    });
  } catch (error) {
    console.error("Update draft branding error:", error);
    return res.status(500).json({ message: "Failed to save draft branding" });
  }
};

/**
 * POST /api/admin/branding/publish
 * Publishes the approved draft configuration to production.
 * Live public sites immediately reflect the published changes.
 */
export const publishBranding = async (_req: Request, res: Response) => {
  try {
    const draft = await getOrCreateBrandConfig("draft");
    const now = new Date();

    const publishData = {
      brandName: draft.brandName,
      tagline: draft.tagline,
      primaryColor: draft.primaryColor,
      secondaryColor: draft.secondaryColor,
      accentColor: draft.accentColor,
      primaryLogoUrl: draft.primaryLogoUrl,
      symbolLogoUrl: draft.symbolLogoUrl,
      lightLogoUrl: draft.lightLogoUrl,
      darkLogoUrl: draft.darkLogoUrl,
      faviconUrl: draft.faviconUrl,
      defaultTitle: draft.defaultTitle,
      titleFormat: draft.titleFormat,
      defaultMetaDescription: draft.defaultMetaDescription,
      openGraphTitle: draft.openGraphTitle,
      openGraphDescription: draft.openGraphDescription,
      openGraphImageUrl: draft.openGraphImageUrl,
      canonicalUrl: draft.canonicalUrl,
      brandDescription: draft.brandDescription,
      themePreference: draft.themePreference,
      publishedAt: now,
    };

    // Update published row
    const published = await prisma.brand_config.upsert({
      where: { id: "published" },
      update: publishData,
      create: { id: "published", ...publishData },
    });

    // Also synchronize app_config rows for backwards-compatibility
    await Promise.all([
      prisma.app_config.updateMany({
        where: { scope: "CLIENT" },
        data: {
          app_name: draft.brandName,
          webTitle: draft.defaultTitle,
          icon: draft.faviconUrl || draft.symbolLogoUrl,
          app_description: draft.brandDescription,
        },
      }),
      prisma.app_config.updateMany({
        where: { scope: "SERVICE" },
        data: {
          app_name: `${draft.brandName} Provider`,
          webTitle: `${draft.brandName} | Provider Portal`,
          icon: draft.faviconUrl || draft.symbolLogoUrl,
          app_description: draft.brandDescription,
        },
      }),
    ]);

    return res.status(200).json({
      message: "Branding published successfully to live websites",
      published,
      hasUnpublishedChanges: false,
    });
  } catch (error) {
    console.error("Publish branding error:", error);
    return res.status(500).json({ message: "Failed to publish branding" });
  }
};

/**
 * POST /api/admin/branding/discard
 * Discards uncommitted draft changes and resets draft to current published state.
 */
export const discardDraftBranding = async (_req: Request, res: Response) => {
  try {
    const published = await getOrCreateBrandConfig("published");

    const resetData = {
      brandName: published.brandName,
      tagline: published.tagline,
      primaryColor: published.primaryColor,
      secondaryColor: published.secondaryColor,
      accentColor: published.accentColor,
      primaryLogoUrl: published.primaryLogoUrl,
      symbolLogoUrl: published.symbolLogoUrl,
      lightLogoUrl: published.lightLogoUrl,
      darkLogoUrl: published.darkLogoUrl,
      faviconUrl: published.faviconUrl,
      defaultTitle: published.defaultTitle,
      titleFormat: published.titleFormat,
      defaultMetaDescription: published.defaultMetaDescription,
      openGraphTitle: published.openGraphTitle,
      openGraphDescription: published.openGraphDescription,
      openGraphImageUrl: published.openGraphImageUrl,
      canonicalUrl: published.canonicalUrl,
      brandDescription: published.brandDescription,
      themePreference: published.themePreference,
    };

    const draft = await prisma.brand_config.upsert({
      where: { id: "draft" },
      update: resetData,
      create: { id: "draft", ...resetData },
    });

    return res.status(200).json({
      message: "Draft changes discarded. Reset to published configuration.",
      draft,
      hasUnpublishedChanges: false,
    });
  } catch (error) {
    console.error("Discard draft error:", error);
    return res.status(500).json({ message: "Failed to discard draft changes" });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// LEGACY APP_CONFIG HELPERS (Kept for existing tab backwards-compatibility)
// ──────────────────────────────────────────────────────────────────────────────

const DEFAULT_CLIENT = {
  app_name: "ATLASWANDERS",
  icon: "/brand/atlaswanders-favicon.svg",
  webTitle: "ATLASWANDERS | Discover Places. Experience Local.",
  text: "",
  contacts: "",
  termsandconditions: "",
  privacy: "",
  app_description: "Global travel discovery, local tourism marketplace, and travel-services platform.",
  imageBanners: [] as string[],
};

const DEFAULT_SERVICE = {
  app_name: "ATLASWANDERS Provider",
  icon: "/brand/atlaswanders-favicon.svg",
  webTitle: "ATLASWANDERS | Provider Portal",
  text: "",
  contacts: "",
  termsandconditions: "",
  privacy: "",
  app_description: "Global travel discovery, local tourism marketplace, and travel-services platform.",
  imageBanners: [] as string[],
};

async function getOrCreateConfig(scope: "CLIENT" | "SERVICE") {
  const existing = await prisma.app_config.findFirst({
    where: { scope },
    orderBy: { id: "asc" },
  });
  if (existing) return existing;

  const defaults = scope === "CLIENT" ? DEFAULT_CLIENT : DEFAULT_SERVICE;
  return prisma.app_config.create({
    data: { scope, ...defaults },
  });
}

function buildUpdateData(body: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const {
    app_name,
    webTitle,
    icon,
    imageBanners,
    text,
    app_description,
    contacts,
    termsandconditions,
    privacy,
  } = body;

  if (typeof app_name === "string") data.app_name = app_name;
  if (typeof webTitle === "string") data.webTitle = webTitle;
  if (typeof icon === "string") data.icon = icon;
  if (typeof text === "string") data.text = text;
  if (typeof app_description === "string") data.app_description = app_description;
  if (typeof contacts === "string") data.contacts = contacts;
  if (typeof termsandconditions === "string") data.termsandconditions = termsandconditions;
  if (typeof privacy === "string") data.privacy = privacy;
  if (Array.isArray(imageBanners) && imageBanners.every((i) => typeof i === "string")) {
    data.imageBanners = imageBanners;
  }
  return data;
}

export const getAdminClientSettings = async (_req: Request, res: Response) => {
  try {
    const config = await getOrCreateConfig("CLIENT");
    return res.status(200).json({ settings: config });
  } catch (error) {
    console.error("Get admin client settings error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAdminServiceSettings = async (_req: Request, res: Response) => {
  try {
    const config = await getOrCreateConfig("SERVICE");
    return res.status(200).json({ settings: config });
  } catch (error) {
    console.error("Get admin service settings error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateClientSettings = async (req: Request, res: Response) => {
  try {
    const data = buildUpdateData(req.body ?? {});
    const config = await getOrCreateConfig("CLIENT");
    const updated = await prisma.app_config.update({ where: { id: config.id }, data });
    return res.status(200).json({ message: "Client settings updated", settings: updated });
  } catch (error) {
    console.error("Update client settings error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateServiceSettings = async (req: Request, res: Response) => {
  try {
    const data = buildUpdateData(req.body ?? {});
    const config = await getOrCreateConfig("SERVICE");
    const updated = await prisma.app_config.update({ where: { id: config.id }, data });
    return res.status(200).json({ message: "Service settings updated", settings: updated });
  } catch (error) {
    console.error("Update service settings error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
