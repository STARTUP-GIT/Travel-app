-- Auto-approval policy + guide approval status.
--
-- 1. app_config gains the four global auto-approval flags the admin panel
--    toggles. They default to FALSE so nothing is auto-approved until an admin
--    turns it on.
-- 2. common_guide and specific_guide gain the same
--    placeSubmissionStatus enum the other content types already use, so a guide
--    can sit in the admin queue instead of being live the moment it signs up.
-- 3. common_guide_places.commonGuideId cascades, so deleting a guide removes
--    its coverage rows. The rows are pure join records and carry no data of
--    their own; the admin DELETE handler also clears them inside a transaction,
--    so the delete works whether or not this constraint is in place yet.

-- CreateEnum is intentionally absent: placeSubmissionStatus already exists.

-- AlterTable
ALTER TABLE "app_config"
ADD COLUMN     "placesAutoApproval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "guidesAutoApproval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hotelsAutoApproval" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "restaurantsAutoApproval" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "common_guide"
ADD COLUMN     "status" "placeSubmissionStatus" NOT NULL DEFAULT 'PENDING';

-- Existing guides were already live and visible to travellers, so they start
-- from the approved end of the enum rather than disappearing from the app.
UPDATE "common_guide" SET "status" = 'APPROVED' WHERE "status" = 'PENDING';

-- AlterTable
ALTER TABLE "specific_guide"
ADD COLUMN     "status" "placeSubmissionStatus" NOT NULL DEFAULT 'PENDING';

UPDATE "specific_guide" SET "status" = 'APPROVED' WHERE "status" = 'PENDING';

-- AlterTable: coverage rows are join records, removed with their guide.
ALTER TABLE "common_guide_places"
DROP CONSTRAINT IF EXISTS "common_guide_places_commonGuideId_fkey";

ALTER TABLE "common_guide_places"
ADD CONSTRAINT "common_guide_places_commonGuideId_fkey" FOREIGN KEY ("commonGuideId") REFERENCES "common_guide"("id") ON DELETE CASCADE ON UPDATE CASCADE;
