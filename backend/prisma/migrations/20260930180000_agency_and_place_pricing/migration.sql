-- Common Guide agency name + structured place ticket pricing.
--
-- Strictly additive. No existing column is altered, dropped or retyped, and no
-- existing row is read, rewritten or deleted:
--
--  * `common_guide.agencyName` is a new nullable column, so every existing guide
--    reads back as NULL — i.e. "no agency", which is exactly the state the
--    customer surfaces already handle by hiding the agency block.
--
--  * `place_pricing` is a new table. `place.entryfee` is deliberately left in
--    place and untouched: it remains the single flat price, so a free place
--    (NULL), a one-price place and every place created before this table existed
--    all keep reading exactly as they do now. A place only has pricing rows when
--    it genuinely charges different amounts per band.
--
--  * `place_submission.pricing` is a new nullable column holding the *pending*
--    bands awaiting review, exactly as the row already holds the pending name,
--    description and fee. `place_pricing` stays the only live source of truth;
--    approving a submission copies this snapshot across. NULL means the
--    submission changes no pricing, which is what every existing submission row
--    means, so nothing is back-filled.
--
-- The cascade mirrors the other place-owned tables: a price band has no meaning
-- without its place, so removing the place removes the bands.

-- AlterTable
ALTER TABLE "common_guide" ADD COLUMN "agencyName" TEXT;

-- AlterTable
ALTER TABLE "place_submission" ADD COLUMN "pricing" JSONB;

-- CreateEnum
CREATE TYPE "placeVisitorType" AS ENUM ('DOMESTIC', 'FOREIGN');

-- CreateTable
CREATE TABLE "place_pricing" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "visitor" "placeVisitorType" NOT NULL,
    "ageGroup" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "place_pricing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "place_pricing_placeId_idx" ON "place_pricing"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "place_pricing_placeId_visitor_ageGroup_key" ON "place_pricing"("placeId", "visitor", "ageGroup");

-- AddForeignKey
ALTER TABLE "place_pricing" ADD CONSTRAINT "place_pricing_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
