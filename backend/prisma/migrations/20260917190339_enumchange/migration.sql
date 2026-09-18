/*
  Warnings:

  - Changed the type of `provider` on the `admin` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `provider` on the `common_guide` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `provider` on the `specific_guide` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `provider` on the `user` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "authProviders" AS ENUM ('GOOGLE', 'EMAIL');

-- AlterTable
ALTER TABLE "admin" DROP COLUMN "provider",
ADD COLUMN     "provider" "authProviders" NOT NULL;

-- AlterTable
ALTER TABLE "common_guide" DROP COLUMN "provider",
ADD COLUMN     "provider" "authProviders" NOT NULL;

-- AlterTable
ALTER TABLE "specific_guide" DROP COLUMN "provider",
ADD COLUMN     "provider" "authProviders" NOT NULL;

-- AlterTable
ALTER TABLE "user" DROP COLUMN "provider",
ADD COLUMN     "provider" "authProviders" NOT NULL;

-- DropEnum
DROP TYPE "Providers";
