import pg from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  console.log("Applying additive database migrations for ATLASWANDERS admin branding, hero images, and district overrides...");

  // 1. Columns for district
  await pool.query(`
    ALTER TABLE "district" ADD COLUMN IF NOT EXISTS "heroImageUrl" TEXT;
    ALTER TABLE "district" ADD COLUMN IF NOT EXISTS "useCustomHeroImage" BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE "district" ADD COLUMN IF NOT EXISTS "showWelcomeHeading" TEXT;
  `);
  console.log("✓ district columns verified / added.");

  // 2. Columns for app_config
  await pool.query(`
    ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "heroImageUrl" TEXT;
    ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "defaultDistrictHeroImageUrl" TEXT;
    ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "showDistrictHeadingByDefault" BOOLEAN NOT NULL DEFAULT true;
  `);
  console.log("✓ app_config columns verified / added.");

  // 3. Columns for brand_config
  await pool.query(`
    ALTER TABLE "brand_config" ADD COLUMN IF NOT EXISTS "clientHeroImageUrl" TEXT NOT NULL DEFAULT '';
    ALTER TABLE "brand_config" ADD COLUMN IF NOT EXISTS "serviceHeroImageUrl" TEXT NOT NULL DEFAULT '';
    ALTER TABLE "brand_config" ADD COLUMN IF NOT EXISTS "clientFaviconUrl" TEXT NOT NULL DEFAULT '';
    ALTER TABLE "brand_config" ADD COLUMN IF NOT EXISTS "serviceFaviconUrl" TEXT NOT NULL DEFAULT '';
    ALTER TABLE "brand_config" ADD COLUMN IF NOT EXISTS "adminFaviconUrl" TEXT NOT NULL DEFAULT '';
    ALTER TABLE "brand_config" ADD COLUMN IF NOT EXISTS "defaultDistrictHeroImageUrl" TEXT NOT NULL DEFAULT '';
    ALTER TABLE "brand_config" ADD COLUMN IF NOT EXISTS "showDistrictHeadingByDefault" BOOLEAN NOT NULL DEFAULT true;
  `);
  console.log("✓ brand_config columns verified / added.");

  // Verify columns
  const res = await pool.query(`
    SELECT table_name, column_name 
    FROM information_schema.columns 
    WHERE table_name IN ('district', 'app_config', 'brand_config')
      AND column_name IN (
        'heroImageUrl', 'useCustomHeroImage', 'showWelcomeHeading',
        'defaultDistrictHeroImageUrl', 'showDistrictHeadingByDefault',
        'clientHeroImageUrl', 'serviceHeroImageUrl', 'clientFaviconUrl', 'serviceFaviconUrl', 'adminFaviconUrl'
      )
    ORDER BY table_name, column_name;
  `);
  console.log("Verified new columns:", res.rows);

  await pool.end();
  console.log("Migration successfully executed!");
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
