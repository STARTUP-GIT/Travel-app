import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "brand_config" (
      "id" TEXT NOT NULL,
      "brandName" TEXT NOT NULL DEFAULT 'ATLASWANDERS',
      "tagline" TEXT NOT NULL DEFAULT 'Discover Places. Experience Local.',
      "primaryColor" TEXT NOT NULL DEFAULT '#0B2545',
      "secondaryColor" TEXT NOT NULL DEFAULT '#087E8B',
      "accentColor" TEXT NOT NULL DEFAULT '#D9A441',
      "primaryLogoUrl" TEXT NOT NULL DEFAULT '',
      "symbolLogoUrl" TEXT NOT NULL DEFAULT '',
      "lightLogoUrl" TEXT NOT NULL DEFAULT '',
      "darkLogoUrl" TEXT NOT NULL DEFAULT '',
      "faviconUrl" TEXT NOT NULL DEFAULT '',
      "defaultTitle" TEXT NOT NULL DEFAULT 'ATLASWANDERS | Discover Places. Experience Local.',
      "titleFormat" TEXT NOT NULL DEFAULT '%s | ATLASWANDERS',
      "defaultMetaDescription" TEXT NOT NULL DEFAULT 'Discover tourist destinations, verified local guides, tour packages, stays and dining across Karnataka and beyond with ATLASWANDERS.',
      "openGraphTitle" TEXT NOT NULL DEFAULT 'ATLASWANDERS — Discover Places. Experience Local.',
      "openGraphDescription" TEXT NOT NULL DEFAULT 'Global travel discovery and local-services marketplace connecting travellers with authentic experiences.',
      "openGraphImageUrl" TEXT NOT NULL DEFAULT '',
      "canonicalUrl" TEXT NOT NULL DEFAULT '',
      "brandDescription" TEXT NOT NULL DEFAULT 'Global travel discovery, local tourism marketplace, and travel-services platform.',
      "themePreference" TEXT NOT NULL DEFAULT 'light',
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "publishedAt" TIMESTAMP(3),
      CONSTRAINT "brand_config_pkey" PRIMARY KEY ("id")
    );
  `);
  console.log("brand_config table verified in Postgres!");
  await pool.end();
}

run().catch(err => {
  console.error("Migration error:", err);
  process.exit(1);
});
