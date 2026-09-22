import type { Request, Response } from "express";
import prisma from "../../db/prisma.js";

/**
 * Public application-branding payload consumed by the customer frontend.
 * Only non-sensitive fields are exposed. Takes the first app_config row.
 */
export const getPublicAppSettings = async (_req: Request, res: Response) => {
  try {
    const config = await prisma.app_config.findFirst({
      orderBy: { id: "asc" },
    });

    return res.status(200).json({
      app_name: config?.app_name ?? "",
      webTitle: config?.webTitle ?? "",
      icon: config?.icon ?? "",
      imageBanners: config?.imageBanners ?? [],
      text: config?.text ?? "",
      app_description: config?.app_description ?? "",
      contacts: config?.contacts ?? "",
      termsandconditions: config?.termsandconditions ?? "",
      privacy: config?.privacy ?? "",
    });
  } catch (error) {
    console.error("Get public app settings error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};