/**
 * Application branding/configuration consumed from the backend app_config
 * table. One source of truth for the app name, icon, landing slideshow
 * images and legal text.
 */
export type AppConfig = {
  app_name: string;
  webTitle: string;
  icon: string;
  imageBanners: string[];
  text: string;
  app_description: string;
  contacts: string;
  termsandconditions: string;
  privacy: string;
};

export const FALLBACK_CONFIG: AppConfig = {
  app_name: "Karnataka Tourism Guide",
  webTitle: "Explore • Experience • Belong",
  icon: "",
  imageBanners: [],
  text: "",
  app_description: "",
  contacts: "",
  termsandconditions: "",
  privacy: "",
};