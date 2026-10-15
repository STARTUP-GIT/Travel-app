/**
 * Centrally Managed Branding Configuration for ATLASWANDERS
 * Single source of truth consumed from the backend /api/branding and /api/settings.
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
  clientFaviconUrl?: string;
  clientHeroImageUrl?: string;
  heroImageUrl?: string;
  defaultDistrictHeroImageUrl?: string;
  showDistrictHeadingByDefault?: boolean;
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
  clientHeroImageUrl?: string;
  defaultDistrictHeroImageUrl?: string;
  showDistrictHeadingByDefault?: boolean;
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
  clientFaviconUrl?: string;
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
    "Global travel discovery, local tourism marketplace, and travel-services platform connecting travellers with authentic experiences.",
  themePreference: "light",
};

export const FALLBACK_CONFIG: AppConfig = {
  app_name: "ATLASWANDERS",
  webTitle: "ATLASWANDERS | Discover Places. Experience Local.",
  icon: "/brand/atlaswanders-favicon.svg",
  imageBanners: [],
  text: "",
  app_description:
    "Global travel discovery, local tourism marketplace, and travel-services platform connecting travellers with authentic experiences.",
  contacts: "",
  termsandconditions: "",
  privacy: "",
  ...FALLBACK_BRAND,
};