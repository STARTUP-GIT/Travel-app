-- AlterTable district
ALTER TABLE "district" ADD COLUMN IF NOT EXISTS "heroImageUrl" TEXT;
ALTER TABLE "district" ADD COLUMN IF NOT EXISTS "useCustomHeroImage" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "district" ADD COLUMN IF NOT EXISTS "showWelcomeHeading" TEXT;

-- AlterTable app_config
ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "heroImageUrl" TEXT;
ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "defaultDistrictHeroImageUrl" TEXT;
ALTER TABLE "app_config" ADD COLUMN IF NOT EXISTS "showDistrictHeadingByDefault" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable brand_config
ALTER TABLE "brand_config" ADD COLUMN IF NOT EXISTS "clientHeroImageUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "brand_config" ADD COLUMN IF NOT EXISTS "serviceHeroImageUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "brand_config" ADD COLUMN IF NOT EXISTS "clientFaviconUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "brand_config" ADD COLUMN IF NOT EXISTS "serviceFaviconUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "brand_config" ADD COLUMN IF NOT EXISTS "adminFaviconUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "brand_config" ADD COLUMN IF NOT EXISTS "defaultDistrictHeroImageUrl" TEXT NOT NULL DEFAULT '';
ALTER TABLE "brand_config" ADD COLUMN IF NOT EXISTS "showDistrictHeadingByDefault" BOOLEAN NOT NULL DEFAULT true;
