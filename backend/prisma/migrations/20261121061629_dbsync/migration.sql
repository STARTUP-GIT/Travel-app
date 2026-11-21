/*
  Warnings:

  - Made the column `numberOfAdults` on table `common_guide_booking` required. This step will fail if there are existing NULL values in that column.
  - Made the column `numberOfChildren` on table `common_guide_booking` required. This step will fail if there are existing NULL values in that column.
  - Made the column `mealsService` on table `common_guide_package` required. This step will fail if there are existing NULL values in that column.
  - Made the column `transportService` on table `common_guide_package` required. This step will fail if there are existing NULL values in that column.
  - Made the column `hasSpecificGuide` on table `common_guide_package` required. This step will fail if there are existing NULL values in that column.
  - Made the column `childrenAllowed` on table `common_guide_package` required. This step will fail if there are existing NULL values in that column.
  - Made the column `childrenCountTowardCapacity` on table `common_guide_package` required. This step will fail if there are existing NULL values in that column.
  - Made the column `itineraryOrder` on table `common_guide_package_places` required. This step will fail if there are existing NULL values in that column.
  - Made the column `visitArrangement` on table `common_guide_package_places` required. This step will fail if there are existing NULL values in that column.
  - Made the column `entryFeeStatus` on table `common_guide_package_places` required. This step will fail if there are existing NULL values in that column.
  - Made the column `paymentStatus` on table `hotel_booking` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "brand_config" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "common_guide" ADD COLUMN IF NOT EXISTS "agencyAddress" TEXT,
ADD COLUMN IF NOT EXISTS "agencyBanner" TEXT,
ADD COLUMN IF NOT EXISTS "agencyMapsUrl" TEXT;

-- AlterTable
ALTER TABLE "common_guide_booking" ADD COLUMN IF NOT EXISTS "additionalCostsDetails" TEXT,
ADD COLUMN IF NOT EXISTS "allowCustomerPlaceSelection" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "cancellationPolicy" TEXT,
ADD COLUMN IF NOT EXISTS "entryFeeDetails" TEXT,
ADD COLUMN IF NOT EXISTS "entryFeeStatus" TEXT,
ADD COLUMN IF NOT EXISTS "foodDetails" TEXT,
ADD COLUMN IF NOT EXISTS "foodStatus" TEXT,
ADD COLUMN IF NOT EXISTS "numberOfPeople" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "packageId" TEXT,
ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'NOT_VERIFIED',
ADD COLUMN IF NOT EXISTS "pickupAddress" TEXT,
ADD COLUMN IF NOT EXISTS "pickupLat" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "pickupLng" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "pickupMapsUrl" TEXT,
ADD COLUMN IF NOT EXISTS "pickupName" TEXT,
ADD COLUMN IF NOT EXISTS "pickupRequestStatus" TEXT NOT NULL DEFAULT 'DEFAULT',
ADD COLUMN IF NOT EXISTS "pricingMode" TEXT NOT NULL DEFAULT 'WHOLE_TOUR',
ADD COLUMN IF NOT EXISTS "pricingUnit" TEXT NOT NULL DEFAULT 'PER_TOUR',
ADD COLUMN IF NOT EXISTS "requestedBookingDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "requestedBookingTime" TEXT,
ADD COLUMN IF NOT EXISTS "requestedPickupAddress" TEXT,
ADD COLUMN IF NOT EXISTS "requestedPickupLat" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "requestedPickupLng" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "requestedPickupMapsUrl" TEXT,
ADD COLUMN IF NOT EXISTS "requestedPickupName" TEXT,
ADD COLUMN IF NOT EXISTS "rescheduleStatus" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN IF NOT EXISTS "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "transportDetails" TEXT,
ADD COLUMN IF NOT EXISTS "transportStatus" TEXT,
ADD COLUMN IF NOT EXISTS "tripStartTime" TEXT,
ALTER COLUMN "numberOfAdults" SET NOT NULL,
ALTER COLUMN "numberOfChildren" SET NOT NULL;

-- AlterTable
ALTER TABLE "common_guide_package" ADD COLUMN IF NOT EXISTS "additionalCostsDetails" TEXT,
ADD COLUMN IF NOT EXISTS "allowCustomerPlaceSelection" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "cancellationPolicy" TEXT,
ADD COLUMN IF NOT EXISTS "childDiscountPercent" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "childDiscountType" TEXT DEFAULT 'NO_DISCOUNT',
ADD COLUMN IF NOT EXISTS "entryFeeDetails" TEXT,
ADD COLUMN IF NOT EXISTS "entryFeeStatus" TEXT NOT NULL DEFAULT 'EXCLUDED',
ADD COLUMN IF NOT EXISTS "foodDetails" TEXT,
ADD COLUMN IF NOT EXISTS "foodStatus" TEXT NOT NULL DEFAULT 'EXCLUDED',
ADD COLUMN IF NOT EXISTS "pickupAddress" TEXT,
ADD COLUMN IF NOT EXISTS "pickupLat" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "pickupLng" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "pickupMapsUrl" TEXT,
ADD COLUMN IF NOT EXISTS "pickupName" TEXT,
ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "pricingMode" TEXT NOT NULL DEFAULT 'WHOLE_TOUR',
ADD COLUMN IF NOT EXISTS "pricingUnit" TEXT NOT NULL DEFAULT 'PER_TOUR',
ADD COLUMN IF NOT EXISTS "transportDetails" TEXT,
ADD COLUMN IF NOT EXISTS "transportStatus" TEXT NOT NULL DEFAULT 'EXCLUDED',
ADD COLUMN IF NOT EXISTS "tripStartTime" TEXT,
ALTER COLUMN "mealsService" SET NOT NULL,
ALTER COLUMN "transportService" SET NOT NULL,
ALTER COLUMN "hasSpecificGuide" SET NOT NULL,
ALTER COLUMN "childrenAllowed" SET NOT NULL,
ALTER COLUMN "childrenCountTowardCapacity" SET NOT NULL;

-- AlterTable
ALTER TABLE "common_guide_package_places" ADD COLUMN IF NOT EXISTS "price" DOUBLE PRECISION,
ALTER COLUMN "itineraryOrder" SET NOT NULL,
ALTER COLUMN "visitArrangement" SET NOT NULL,
ALTER COLUMN "entryFeeStatus" SET NOT NULL;

-- AlterTable
ALTER TABLE "hotel_booking" ALTER COLUMN "paymentStatus" SET NOT NULL;

-- AlterTable
ALTER TABLE "place" ADD COLUMN IF NOT EXISTS "additionalFees" JSONB,
ADD COLUMN IF NOT EXISTS "addressLine" TEXT,
ADD COLUMN IF NOT EXISTS "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "childEntryFee" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "childMaxAge" INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS "entryFeeConditions" TEXT,
ADD COLUMN IF NOT EXISTS "entryFeeType" TEXT DEFAULT 'FREE',
ADD COLUMN IF NOT EXISTS "foreignAdultFee" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "foreignChildFee" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "foreignChildMaxAge" INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS "foreignEntryFeeConditions" TEXT,
ADD COLUMN IF NOT EXISTS "foreignEntryFeeType" TEXT,
ADD COLUMN IF NOT EXISTS "hasAdditionalFees" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "hasForeignPricing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "locality" TEXT,
ADD COLUMN IF NOT EXISTS "mapsUrl" TEXT,
ADD COLUMN IF NOT EXISTS "pincode" TEXT,
ALTER COLUMN "latitude" SET DEFAULT 0,
ALTER COLUMN "longitude" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "place_submission" ADD COLUMN IF NOT EXISTS "additionalFees" JSONB,
ADD COLUMN IF NOT EXISTS "addressLine" TEXT,
ADD COLUMN IF NOT EXISTS "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS "childEntryFee" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "childMaxAge" INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS "entryFeeConditions" TEXT,
ADD COLUMN IF NOT EXISTS "entryFeeType" TEXT DEFAULT 'FREE',
ADD COLUMN IF NOT EXISTS "foreignAdultFee" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "foreignChildFee" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "foreignChildMaxAge" INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS "foreignEntryFeeConditions" TEXT,
ADD COLUMN IF NOT EXISTS "foreignEntryFeeType" TEXT,
ADD COLUMN IF NOT EXISTS "hasAdditionalFees" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "hasForeignPricing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "locality" TEXT,
ADD COLUMN IF NOT EXISTS "mapsUrl" TEXT,
ADD COLUMN IF NOT EXISTS "pincode" TEXT,
ALTER COLUMN "latitude" SET DEFAULT 0,
ALTER COLUMN "longitude" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "specific_guide" ADD COLUMN IF NOT EXISTS "canPurchaseEntryTickets" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "isSharingLocation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "locationUpdatedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "sharedLatitude" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "sharedLongitude" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "ticketPurchasingConditions" TEXT;

-- AlterTable
ALTER TABLE "specific_guide_booking" ADD COLUMN IF NOT EXISTS "cancellationPolicy" TEXT,
ADD COLUMN IF NOT EXISTS "numberOfPeople" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT NOT NULL DEFAULT 'NOT_VERIFIED',
ADD COLUMN IF NOT EXISTS "pickupAddress" TEXT,
ADD COLUMN IF NOT EXISTS "pickupLat" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "pickupLng" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "pickupMapsUrl" TEXT,
ADD COLUMN IF NOT EXISTS "pickupName" TEXT,
ADD COLUMN IF NOT EXISTS "requestTicketAssistance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "requestedBookingDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "requestedBookingTime" TEXT,
ADD COLUMN IF NOT EXISTS "requestedPickupAddress" TEXT,
ADD COLUMN IF NOT EXISTS "requestedPickupMapsUrl" TEXT,
ADD COLUMN IF NOT EXISTS "requestedPickupName" TEXT,
ADD COLUMN IF NOT EXISTS "rescheduleStatus" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN IF NOT EXISTS "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'common_guide_booking_packageId_fkey'
    ) THEN
        ALTER TABLE "common_guide_booking"
            ADD CONSTRAINT "common_guide_booking_packageId_fkey"
            FOREIGN KEY ("packageId") REFERENCES "common_guide_package"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
