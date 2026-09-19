-- AlterTable
ALTER TABLE "country" ADD COLUMN     "isServiceAvailable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "district" ADD COLUMN     "isServiceAvailable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "state" ADD COLUMN     "isServiceAvailable" BOOLEAN NOT NULL DEFAULT false;
