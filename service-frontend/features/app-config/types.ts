/**
 * Application branding/configuration consumed from the backend app_config
 * table. One source of truth for the app name, icon and legal text, shared
 * with the customer frontend so both surfaces carry the same identity.
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
