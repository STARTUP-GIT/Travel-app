import type { Request, Response } from "express";
import prisma from "../../db/prisma.js";

const handleError = (res: Response, error: unknown) => {
  console.error("Version config error:", error);
  return res.status(500).json({ message: "Internal Server Error" });
};

/**
 * GET /api/app-version?app=CLIENT  (or SERVICE)
 * Public endpoint consumed by mobile apps on launch.
 * Returns the version policy for that app without requiring auth.
 * Creates a default row if none exists yet.
 */
export const getAppVersion = async (req: Request, res: Response) => {
  try {
    const rawAppParam = req.query.app;
    const rawApp = typeof rawAppParam === "string" ? rawAppParam.toUpperCase() : "CLIENT";
    const app = rawApp === "SERVICE" ? "SERVICE" : "CLIENT";

    let config = await prisma.app_version_config.findUnique({ where: { app } });
    if (!config) {
      config = await prisma.app_version_config.create({ data: { app } });
    }

    return res.status(200).json({
      app,
      minVersion: config.minVersion,
      latestVersion: config.latestVersion,
      forceUpdate: config.forceUpdate,
      updateMessage: config.updateMessage,
      storeUrl: config.storeUrl,
    });
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * GET /api/admin/version-config
 * Admin: returns both CLIENT and SERVICE version configs.
 */
export const listVersionConfigs = async (_req: Request, res: Response) => {
  try {
    const [clientCfg, serviceCfg] = await Promise.all([
      prisma.app_version_config.upsert({
        where: { app: "CLIENT" },
        create: { app: "CLIENT" },
        update: {},
      }),
      prisma.app_version_config.upsert({
        where: { app: "SERVICE" },
        create: { app: "SERVICE" },
        update: {},
      }),
    ]);
    return res.status(200).json({ client: clientCfg, service: serviceCfg });
  } catch (error) {
    return handleError(res, error);
  }
};

/**
 * PATCH /api/admin/version-config/:app  (CLIENT or SERVICE)
 * Admin: update version policy for one app.
 */
export const updateVersionConfig = async (req: Request, res: Response) => {
  try {
    const { app: rawParam } = req.params as { app: string };
    const rawApp = (rawParam ?? "").toUpperCase();
    if (rawApp !== "CLIENT" && rawApp !== "SERVICE") {
      return res.status(400).json({ message: "app must be CLIENT or SERVICE" });
    }
    const app = rawApp as "CLIENT" | "SERVICE";

    const { minVersion, latestVersion, forceUpdate, updateMessage, storeUrl } = req.body ?? {};
    const data: Record<string, unknown> = {};
    if (typeof minVersion === "string" && minVersion.trim()) data.minVersion = minVersion.trim();
    if (typeof latestVersion === "string" && latestVersion.trim()) data.latestVersion = latestVersion.trim();
    if (typeof forceUpdate === "boolean") data.forceUpdate = forceUpdate;
    if (typeof updateMessage === "string") data.updateMessage = updateMessage;
    if (typeof storeUrl === "string") data.storeUrl = storeUrl;

    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const config = await prisma.app_version_config.upsert({
      where: { app },
      create: { app, ...data },
      update: data,
    });

    return res.status(200).json({ message: "Version config updated", config });
  } catch (error) {
    return handleError(res, error);
  }
};
