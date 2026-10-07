import type { Request, Response } from "express";
import prisma from "../../db/prisma.js";

/**
 * Branding is now scoped: CLIENT branding controls the customer web/mobile
 * apps and SERVICE branding controls the service web/mobile apps.
 *
 * The original `app_config` table now has a `scope` column (default CLIENT)
 * so the existing row becomes CLIENT branding automatically, and a second row
 * is created for SERVICE branding on first access.
 *
 * PUBLIC endpoints (no auth):
 *   GET /api/settings           → CLIENT branding (backwards-compatible)
 *   GET /api/service-settings   → SERVICE branding
 *
 * ADMIN endpoints (adminAuthMiddleware required, handled in admin.routes.ts):
 *   GET  /api/admin/settings/client   → client branding for admin form
 *   GET  /api/admin/settings/service  → service branding for admin form
 *   PATCH /api/admin/settings/client  → update client branding
 *   PATCH /api/admin/settings/service → update service branding
 */

const PUBLIC_FIELDS = {
  app_name: true,
  webTitle: true,
  icon: true,
  imageBanners: true,
  text: true,
  app_description: true,
  contacts: true,
  termsandconditions: true,
  privacy: true,
} as const;

const DEFAULT_CLIENT = {
  app_name: "Karnataka Tourism Guide",
  icon: "",
  webTitle: "",
  text: "",
  contacts: "",
  termsandconditions: "",
  privacy: "",
  app_description: "",
  imageBanners: [] as string[],
};

const DEFAULT_SERVICE = {
  app_name: "Guide Partner Portal",
  icon: "",
  webTitle: "",
  text: "",
  contacts: "",
  termsandconditions: "",
  privacy: "",
  app_description: "",
  imageBanners: [] as string[],
};

async function getOrCreateConfig(scope: "CLIENT" | "SERVICE") {
  const existing = await prisma.app_config.findFirst({
    where: { scope },
    orderBy: { id: "asc" },
  });
  if (existing) return existing;

  // First time SERVICE is requested — create a row using the defaults.
  // CLIENT rows already exist from before the scope column was added.
  const defaults = scope === "CLIENT" ? DEFAULT_CLIENT : DEFAULT_SERVICE;
  return prisma.app_config.create({
    data: { scope, ...defaults },
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// PUBLIC
// ──────────────────────────────────────────────────────────────────────────────

/** GET /api/settings — CLIENT branding (backwards-compatible public endpoint) */
export const getClientSettings = async (_req: Request, res: Response) => {
  try {
    const config = await getOrCreateConfig("CLIENT");
    return res.status(200).json({
      app_name: config.app_name,
      webTitle: config.webTitle,
      icon: config.icon,
      imageBanners: config.imageBanners ?? [],
      text: config.text,
      app_description: config.app_description,
      contacts: config.contacts,
      termsandconditions: config.termsandconditions,
      privacy: config.privacy,
    });
  } catch (error) {
    console.error("Get client settings error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/** GET /api/service-settings — SERVICE branding (service web + mobile) */
export const getServiceSettings = async (_req: Request, res: Response) => {
  try {
    const config = await getOrCreateConfig("SERVICE");
    return res.status(200).json({
      app_name: config.app_name,
      webTitle: config.webTitle,
      icon: config.icon,
      imageBanners: config.imageBanners ?? [],
      text: config.text,
      app_description: config.app_description,
      contacts: config.contacts,
      termsandconditions: config.termsandconditions,
      privacy: config.privacy,
    });
  } catch (error) {
    console.error("Get service settings error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// ──────────────────────────────────────────────────────────────────────────────
// ADMIN (auth required — used by admin panel)
// ──────────────────────────────────────────────────────────────────────────────

function buildUpdateData(body: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  const {
    app_name, webTitle, icon, imageBanners, text,
    app_description, contacts, termsandconditions, privacy,
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

/** GET /api/admin/settings/client — full admin branding record (CLIENT) */
export const getAdminClientSettings = async (_req: Request, res: Response) => {
  try {
    const config = await getOrCreateConfig("CLIENT");
    return res.status(200).json({ settings: config });
  } catch (error) {
    console.error("Get admin client settings error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/** GET /api/admin/settings/service — full admin branding record (SERVICE) */
export const getAdminServiceSettings = async (_req: Request, res: Response) => {
  try {
    const config = await getOrCreateConfig("SERVICE");
    return res.status(200).json({ settings: config });
  } catch (error) {
    console.error("Get admin service settings error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/** PATCH /api/admin/settings/client — update CLIENT branding */
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

/** PATCH /api/admin/settings/service — update SERVICE branding */
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
