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

    const clientAppName = config.app_name?.trim() || published.brandName || "ATLASWANDERS";
    const clientTitle = config.webTitle?.trim() || published.defaultTitle || "ATLASWANDERS | Discover Places. Experience Local.";
    const clientTagline = config.text?.trim() || published.tagline || "Discover Places. Experience Local.";
    const clientIcon = config.icon?.trim() || published.faviconUrl || published.symbolLogoUrl || "/brand/atlaswanders-favicon.svg";
    const clientDesc = config.app_description?.trim() || published.brandDescription || "Discover tourist destinations, verified local guides, tour packages, stays and dining across Karnataka and beyond with ATLASWANDERS.";

    return res.status(200).json({
      app_name: clientAppName,
      webTitle: clientTitle,
      tagline: clientTagline,
      icon: clientIcon,
      imageBanners: config.imageBanners ?? [],
      text: clientTagline,
      app_description: clientDesc,
      contacts: config.contacts ?? "",
      termsandconditions: config.termsandconditions ?? "",
      privacy: config.privacy ?? "",
      // Attached brand system metadata
      brandName: clientAppName,
      primaryColor: published.primaryColor || "#0B2545",
      secondaryColor: published.secondaryColor || "#087E8B",
      accentColor: published.accentColor || "#D9A441",
      primaryLogoUrl: clientIcon || published.primaryLogoUrl || "/brand/atlaswanders-primary.svg",
      symbolLogoUrl: clientIcon || published.symbolLogoUrl || "/brand/atlaswanders-symbol.svg",
      lightLogoUrl: published.lightLogoUrl || "/brand/atlaswanders-light.svg",
      darkLogoUrl: published.darkLogoUrl || "/brand/atlaswanders-dark.svg",
      faviconUrl: clientIcon || published.faviconUrl || "/brand/atlaswanders-favicon.svg",
      defaultTitle: clientTitle,
      titleFormat: published.titleFormat || `%s | ${clientAppName}`,
      defaultMetaDescription: clientDesc,
      openGraphTitle: clientTitle,
      openGraphDescription: clientDesc,
      openGraphImageUrl: (config.imageBanners && config.imageBanners.length > 0 ? config.imageBanners[0] : null) || published.openGraphImageUrl || "/brand/atlaswanders-og.jpg",
      canonicalUrl: published.canonicalUrl ?? "",
      brandDescription: clientDesc,
      themePreference: published.themePreference ?? "light",
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
      text: DEFAULT_BRAND_CONFIG.tagline,
      tagline: DEFAULT_BRAND_CONFIG.tagline,
      contacts: "",
      termsandconditions: "",
      privacy: "",
      updatedAt: new Date(),
      publishedAt: new Date(),
    });
  }
};

/**
 * GET /api/service-settings — Scoped endpoint for service provider web and mobile apps.
 * Preserves Service App settings independently from Client App.
 */
export const getServiceSettings = async (_req: Request, res: Response) => {
  try {
    const [published, config] = await Promise.all([
      getOrCreateBrandConfig("published"),
      getOrCreateConfig("SERVICE"),
    ]);

    const serviceDefaultName = `${published.brandName} Provider`;
    const serviceDefaultTitle = `${published.brandName} | Provider Portal`;
    const serviceDefaultTagline = "Partner & Service Provider Portal";
    const serviceDefaultDesc = "Provider portal for hotels, restaurants and tour guides: manage your listings, review stay and reservation requests, and keep your profile up to date.";

    const serviceAppName = config.app_name?.trim() || serviceDefaultName;
    const serviceTitle = config.webTitle?.trim() || serviceDefaultTitle;
    const serviceTagline = config.text?.trim() || serviceDefaultTagline;
    const serviceIcon = config.icon?.trim() || published.faviconUrl || published.symbolLogoUrl || "/brand/atlaswanders-favicon.svg";
    const serviceDesc = config.app_description?.trim() || serviceDefaultDesc;

    return res.status(200).json({
      app_name: serviceAppName,
      webTitle: serviceTitle,
      tagline: serviceTagline,
      icon: serviceIcon,
      imageBanners: config.imageBanners ?? [],
      text: serviceTagline,
      app_description: serviceDesc,
      contacts: config.contacts ?? "",
      termsandconditions: config.termsandconditions ?? "",
      privacy: config.privacy ?? "",
      // Attached brand system metadata
      brandName: serviceAppName,
      primaryColor: published.primaryColor || "#0B2545",
      secondaryColor: published.secondaryColor || "#087E8B",
      accentColor: published.accentColor || "#D9A441",
      primaryLogoUrl: serviceIcon || published.primaryLogoUrl || "/brand/atlaswanders-primary.svg",
      symbolLogoUrl: serviceIcon || published.symbolLogoUrl || "/brand/atlaswanders-symbol.svg",
      lightLogoUrl: published.lightLogoUrl || "/brand/atlaswanders-light.svg",
      darkLogoUrl: published.darkLogoUrl || "/brand/atlaswanders-dark.svg",
      faviconUrl: serviceIcon || published.faviconUrl || "/brand/atlaswanders-favicon.svg",
      defaultTitle: serviceTitle,
      titleFormat: published.titleFormat || `%s | ${serviceAppName}`,
      defaultMetaDescription: serviceDesc,
      openGraphTitle: serviceTitle,
      openGraphDescription: serviceDesc,
      openGraphImageUrl: (config.imageBanners && config.imageBanners.length > 0 ? config.imageBanners[0] : null) || published.openGraphImageUrl || "/brand/atlaswanders-og.jpg",
      canonicalUrl: published.canonicalUrl ?? "",
      brandDescription: serviceDesc,
      themePreference: published.themePreference ?? "light",
      updatedAt: published.updatedAt,
      publishedAt: published.publishedAt,
    });
  } catch (error) {
    console.error("Get service settings error:", error);
    const serviceDefaultName = `${DEFAULT_BRAND_CONFIG.brandName} Provider`;
    return res.status(200).json({
      ...DEFAULT_BRAND_CONFIG,
      app_name: serviceDefaultName,
      webTitle: `${DEFAULT_BRAND_CONFIG.brandName} | Provider Portal`,
      tagline: "Partner & Service Provider Portal",
      text: "Partner & Service Provider Portal",
      icon: DEFAULT_BRAND_CONFIG.faviconUrl,
      imageBanners: [],
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

    // Also ensure baseline app_config records exist without stomping custom scoped settings
    await Promise.all([
      getOrCreateConfig("CLIENT"),
      getOrCreateConfig("SERVICE"),
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
    tagline,
    app_description,
    contacts,
    termsandconditions,
    privacy,
  } = body;

  if (typeof app_name === "string") data.app_name = app_name.trim();
  if (typeof webTitle === "string") data.webTitle = webTitle.trim();
  if (typeof icon === "string") data.icon = icon.trim();
  if (typeof text === "string") data.text = text.trim();
  else if (typeof tagline === "string") data.text = tagline.trim();
  if (typeof app_description === "string") data.app_description = app_description.trim();
  if (typeof contacts === "string") data.contacts = contacts.trim();
  if (typeof termsandconditions === "string") data.termsandconditions = termsandconditions.trim();
  if (typeof privacy === "string") data.privacy = privacy.trim();
  if (Array.isArray(imageBanners)) {
    data.imageBanners = imageBanners.filter((i) => typeof i === "string" && i.trim().length > 0);
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
