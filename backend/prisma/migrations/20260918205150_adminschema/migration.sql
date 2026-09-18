-- DropForeignKey
ALTER TABLE "admin" DROP CONSTRAINT "admin_appConfigId_fkey";

-- AlterTable
ALTER TABLE "admin" ALTER COLUMN "appConfigId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "admin" ADD CONSTRAINT "admin_appConfigId_fkey" FOREIGN KEY ("appConfigId") REFERENCES "app_config"("id") ON DELETE SET NULL ON UPDATE CASCADE;
