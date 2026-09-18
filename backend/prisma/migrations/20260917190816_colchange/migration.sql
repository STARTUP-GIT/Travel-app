/*
  Warnings:

  - You are about to drop the column `provider` on the `admin` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `common_guide` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `specific_guide` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `user` table. All the data in the column will be lost.
  - Added the required column `authprovider` to the `admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `authprovider` to the `common_guide` table without a default value. This is not possible if the table is not empty.
  - Added the required column `authprovider` to the `specific_guide` table without a default value. This is not possible if the table is not empty.
  - Added the required column `authprovider` to the `user` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "admin" DROP COLUMN "provider",
ADD COLUMN     "authprovider" "authProviders" NOT NULL;

-- AlterTable
ALTER TABLE "common_guide" DROP COLUMN "provider",
ADD COLUMN     "authprovider" "authProviders" NOT NULL;

-- AlterTable
ALTER TABLE "specific_guide" DROP COLUMN "provider",
ADD COLUMN     "authprovider" "authProviders" NOT NULL;

-- AlterTable
ALTER TABLE "user" DROP COLUMN "provider",
ADD COLUMN     "authprovider" "authProviders" NOT NULL;
