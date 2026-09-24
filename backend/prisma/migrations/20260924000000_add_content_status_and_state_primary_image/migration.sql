-- AlterTable
-- The content approval columns existed in the Prisma schema but were never
-- migrated to the database. Added with a default of PENDING so existing rows
-- stay hidden from the customer app until an admin approves them.
ALTER TABLE "place" ADD COLUMN "status" "placeSubmissionStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "hotel" ADD COLUMN "status" "placeSubmissionStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "restaurent" ADD COLUMN "status" "placeSubmissionStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
-- Hero/banner image for a state, shown on the state's district pages.
ALTER TABLE "state" ADD COLUMN "primaryImage" TEXT;