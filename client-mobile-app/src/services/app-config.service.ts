/**
 * Admin-controlled public app configuration.
 *
 * `GET /api/settings` supplies the app name, icon, landing slideshow images and
 * the legal text, all of which the customer web frontend renders from. The mobile
 * app does the same, so rebranding is an admin action rather than a code change.
 *
 * On failure a neutral in-app fallback is used: a missing branding endpoint
 * should degrade the presentation, never take the whole app down.
 */

import { api } from "@/lib/api/client";
import { FALLBACK_APP_NAME, FALLBACK_TAGLINE } from "@/config";
import type { AppConfig } from "@/types/api";

export const FALLBACK_CONFIG: AppConfig = {
  app_name: FALLBACK_APP_NAME,
  webTitle: FALLBACK_APP_NAME,
  icon: "",
  imageBanners: [],
  text: FALLBACK_TAGLINE,
  app_description: "Discover destinations, places, guides, hotels and restaurants.",
  contacts: "",
  termsandconditions: "",
  privacy: "",
};

/** Drops empty strings and non-URLs so a partial config cannot break the shell. */
function usableImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (url): url is string => typeof url === "string" && /^https?:\/\//i.test(url.trim()),
  );
}

function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export async function getAppConfig(): Promise<AppConfig> {
  try {
    const raw = await api.get<Partial<AppConfig>>("/api/settings");

    return {
      app_name: text(raw?.app_name, FALLBACK_CONFIG.app_name),
      webTitle: text(raw?.webTitle, FALLBACK_CONFIG.webTitle),
      icon: text(raw?.icon, ""),
      imageBanners: usableImages(raw?.imageBanners),
      text: text(raw?.text, FALLBACK_CONFIG.text),
      app_description: text(raw?.app_description, FALLBACK_CONFIG.app_description),
      contacts: text(raw?.contacts, ""),
      termsandconditions: text(raw?.termsandconditions, ""),
      privacy: text(raw?.privacy, ""),
    };
  } catch {
    return FALLBACK_CONFIG;
  }
}