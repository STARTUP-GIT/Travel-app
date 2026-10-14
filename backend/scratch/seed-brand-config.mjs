import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const DEFAULTS = {
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
  defaultMetaDescription: "Discover tourist destinations, verified local guides, tour packages, stays and dining across Karnataka and beyond with ATLASWANDERS.",
  openGraphTitle: "ATLASWANDERS — Discover Places. Experience Local.",
  openGraphDescription: "Global travel discovery and local-services marketplace connecting travellers with authentic experiences.",
  openGraphImageUrl: "/brand/atlaswanders_og_banner.jpg",
  canonicalUrl: "https://www.atlaswanders.com",
  brandDescription: "Global travel discovery, local tourism marketplace, and travel-services platform.",
  themePreference: "light",
};

async function seed() {
  const now = new Date();

  // Upsert 'published'
  await pool.query(
    `INSERT INTO "brand_config" (
      "id", "brandName", "tagline", "primaryColor", "secondaryColor", "accentColor",
      "primaryLogoUrl", "symbolLogoUrl", "lightLogoUrl", "darkLogoUrl", "faviconUrl",
      "defaultTitle", "titleFormat", "defaultMetaDescription", "openGraphTitle",
      "openGraphDescription", "openGraphImageUrl", "canonicalUrl", "brandDescription",
      "themePreference", "updatedAt", "publishedAt"
    ) VALUES (
      'published', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $20
    ) ON CONFLICT ("id") DO UPDATE SET
      "brandName" = EXCLUDED."brandName",
      "tagline" = EXCLUDED."tagline",
      "primaryColor" = EXCLUDED."primaryColor",
      "secondaryColor" = EXCLUDED."secondaryColor",
      "accentColor" = EXCLUDED."accentColor",
      "primaryLogoUrl" = EXCLUDED."primaryLogoUrl",
      "symbolLogoUrl" = EXCLUDED."symbolLogoUrl",
      "lightLogoUrl" = EXCLUDED."lightLogoUrl",
      "darkLogoUrl" = EXCLUDED."darkLogoUrl",
      "faviconUrl" = EXCLUDED."faviconUrl",
      "defaultTitle" = EXCLUDED."defaultTitle",
      "titleFormat" = EXCLUDED."titleFormat",
      "defaultMetaDescription" = EXCLUDED."defaultMetaDescription",
      "openGraphTitle" = EXCLUDED."openGraphTitle",
      "openGraphDescription" = EXCLUDED."openGraphDescription",
      "openGraphImageUrl" = EXCLUDED."openGraphImageUrl",
      "canonicalUrl" = EXCLUDED."canonicalUrl",
      "brandDescription" = EXCLUDED."brandDescription",
      "themePreference" = EXCLUDED."themePreference",
      "publishedAt" = COALESCE("brand_config"."publishedAt", EXCLUDED."publishedAt")`,
    [
      DEFAULTS.brandName,
      DEFAULTS.tagline,
      DEFAULTS.primaryColor,
      DEFAULTS.secondaryColor,
      DEFAULTS.accentColor,
      DEFAULTS.primaryLogoUrl,
      DEFAULTS.symbolLogoUrl,
      DEFAULTS.lightLogoUrl,
      DEFAULTS.darkLogoUrl,
      DEFAULTS.faviconUrl,
      DEFAULTS.defaultTitle,
      DEFAULTS.titleFormat,
      DEFAULTS.defaultMetaDescription,
      DEFAULTS.openGraphTitle,
      DEFAULTS.openGraphDescription,
      DEFAULTS.openGraphImageUrl,
      DEFAULTS.canonicalUrl,
      DEFAULTS.brandDescription,
      DEFAULTS.themePreference,
      now,
    ]
  );

  // Upsert 'draft'
  await pool.query(
    `INSERT INTO "brand_config" (
      "id", "brandName", "tagline", "primaryColor", "secondaryColor", "accentColor",
      "primaryLogoUrl", "symbolLogoUrl", "lightLogoUrl", "darkLogoUrl", "faviconUrl",
      "defaultTitle", "titleFormat", "defaultMetaDescription", "openGraphTitle",
      "openGraphDescription", "openGraphImageUrl", "canonicalUrl", "brandDescription",
      "themePreference", "updatedAt"
    ) VALUES (
      'draft', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
    ) ON CONFLICT ("id") DO UPDATE SET
      "brandName" = EXCLUDED."brandName",
      "tagline" = EXCLUDED."tagline",
      "primaryColor" = EXCLUDED."primaryColor",
      "secondaryColor" = EXCLUDED."secondaryColor",
      "accentColor" = EXCLUDED."accentColor",
      "primaryLogoUrl" = EXCLUDED."primaryLogoUrl",
      "symbolLogoUrl" = EXCLUDED."symbolLogoUrl",
      "lightLogoUrl" = EXCLUDED."lightLogoUrl",
      "darkLogoUrl" = EXCLUDED."darkLogoUrl",
      "faviconUrl" = EXCLUDED."faviconUrl",
      "defaultTitle" = EXCLUDED."defaultTitle",
      "titleFormat" = EXCLUDED."titleFormat",
      "defaultMetaDescription" = EXCLUDED."defaultMetaDescription",
      "openGraphTitle" = EXCLUDED."openGraphTitle",
      "openGraphDescription" = EXCLUDED."openGraphDescription",
      "openGraphImageUrl" = EXCLUDED."openGraphImageUrl",
      "canonicalUrl" = EXCLUDED."canonicalUrl",
      "brandDescription" = EXCLUDED."brandDescription",
      "themePreference" = EXCLUDED."themePreference"`,
    [
      DEFAULTS.brandName,
      DEFAULTS.tagline,
      DEFAULTS.primaryColor,
      DEFAULTS.secondaryColor,
      DEFAULTS.accentColor,
      DEFAULTS.primaryLogoUrl,
      DEFAULTS.symbolLogoUrl,
      DEFAULTS.lightLogoUrl,
      DEFAULTS.darkLogoUrl,
      DEFAULTS.faviconUrl,
      DEFAULTS.defaultTitle,
      DEFAULTS.titleFormat,
      DEFAULTS.defaultMetaDescription,
      DEFAULTS.openGraphTitle,
      DEFAULTS.openGraphDescription,
      DEFAULTS.openGraphImageUrl,
      DEFAULTS.canonicalUrl,
      DEFAULTS.brandDescription,
      DEFAULTS.themePreference,
      now,
    ]
  );

  // Sync app_config with official brand name and tagline
  await pool.query(
    `UPDATE "app_config" SET "app_name" = 'ATLASWANDERS', "webTitle" = 'ATLASWANDERS | Discover Places. Experience Local.', "icon" = '/brand/atlaswanders-favicon.svg' WHERE "scope" = 'CLIENT'`
  );
  await pool.query(
    `UPDATE "app_config" SET "app_name" = 'ATLASWANDERS Provider', "webTitle" = 'ATLASWANDERS | Provider Portal', "icon" = '/brand/atlaswanders-favicon.svg' WHERE "scope" = 'SERVICE'`
  );

  console.log("Seeded brand_config ('published' and 'draft') and synchronized app_config!");
  await pool.end();
}

seed().catch(err => {
  console.error("Seed error:", err);
  process.exit(1);
});
