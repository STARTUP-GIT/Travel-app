/**
 * Centrally Managed Branding Configuration for ATLASWANDERS
 * Single source of truth consumed from the backend /api/branding and /api/service-settings.
 */

export type BrandConfig = {
  brandName: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  primaryLogoUrl: string;
  symbolLogoUrl: string;
  lightLogoUrl: string;
  darkLogoUrl: string;
  faviconUrl: string;
  serviceFaviconUrl?: string;
  serviceHeroImageUrl?: string;
  heroImageUrl?: string;
  defaultTitle: string;
  titleFormat: string;
  defaultMetaDescription: string;
  openGraphTitle: string;
  openGraphDescription: string;
  openGraphImageUrl: string;
  canonicalUrl: string;
  brandDescription: string;
  themePreference: string;
  updatedAt?: string;
  publishedAt?: string | null;
};

export type AppConfig = {
  app_name: string;
  appName?: string;
  webTitle: string;
  icon: string;
  imageBanners: string[];
  heroImageUrl?: string;
  serviceHeroImageUrl?: string;
  text: string;
  app_description: string;
  contacts: string;
  termsandconditions: string;
  privacy: string;
  // Centrally synced brand identity fields
  brandName: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  primaryLogoUrl: string;
  symbolLogoUrl: string;
  lightLogoUrl: string;
  darkLogoUrl: string;
  faviconUrl: string;
  serviceFaviconUrl?: string;
  defaultTitle: string;
  titleFormat: string;
  defaultMetaDescription: string;
  openGraphTitle: string;
  openGraphDescription: string;
  openGraphImageUrl: string;
  canonicalUrl: string;
  brandDescription: string;
  themePreference: string;
  updatedAt?: string;
  publishedAt?: string | null;
};

export const FALLBACK_BRAND: BrandConfig = {
  brandName: "ATLASWANDERS",
  tagline: "Partner & Service Provider Portal",
  primaryColor: "#0B2545",
  secondaryColor: "#087E8B",
  accentColor: "#D9A441",
  primaryLogoUrl: "/brand/atlaswanders-primary.svg",
  symbolLogoUrl: "/brand/atlaswanders-symbol.svg",
  lightLogoUrl: "/brand/atlaswanders-light.svg",
  darkLogoUrl: "/brand/atlaswanders-dark.svg",
  faviconUrl: "/brand/atlaswanders-favicon.svg",
  defaultTitle: "ATLASWANDERS | Partner & Service Provider Portal",
  titleFormat: "%s | ATLASWANDERS",
  defaultMetaDescription:
    "Provider portal for hotels, restaurants and tour guides: manage your listings, review stay and reservation requests, and keep your profile up to date.",
  openGraphTitle: "ATLASWANDERS — Partner & Service Provider Portal",
  openGraphDescription:
    "Global travel discovery and local-services marketplace connecting travellers with authentic experiences.",
  openGraphImageUrl: "/brand/atlaswanders_og_banner.jpg",
  canonicalUrl: "https://service.atlaswanders.com",
  brandDescription:
    "Provider portal for hotels, restaurants and tour guides: manage your listings, review stay and reservation requests, and keep your profile up to date.",
  themePreference: "light",
};

export const FALLBACK_CONFIG: AppConfig = {
  ...FALLBACK_BRAND,
  app_name: "ATLASWANDERS",
  webTitle: "ATLASWANDERS | Partner & Service Provider Portal",
  icon: "/brand/atlaswanders-favicon.svg",
  imageBanners: [],
  tagline: "Partner & Service Provider Portal",
  text: "Partner & Service Provider Portal",
  app_description:
    "Provider portal for hotels, restaurants and tour guides: manage your listings, review stay and reservation requests, and keep your profile up to date.",
  contacts: "",
  termsandconditions: "",
  privacy: "",
};
