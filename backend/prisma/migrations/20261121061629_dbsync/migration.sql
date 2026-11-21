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
ALTER TABLE "common_guide" ADD COLUMN     "agencyAddress" TEXT,
ADD COLUMN     "agencyBanner" TEXT,
ADD COLUMN     "agencyMapsUrl" TEXT;

-- AlterTable
ALTER TABLE "common_guide_booking" ADD COLUMN     "additionalCostsDetails" TEXT,
ADD COLUMN     "allowCustomerPlaceSelection" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "cancellationPolicy" TEXT,
ADD COLUMN     "entryFeeDetails" TEXT,
ADD COLUMN     "entryFeeStatus" TEXT,
ADD COLUMN     "foodDetails" TEXT,
ADD COLUMN     "foodStatus" TEXT,
ADD COLUMN     "numberOfPeople" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "packageId" TEXT,
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'NOT_VERIFIED',
ADD COLUMN     "pickupAddress" TEXT,
ADD COLUMN     "pickupLat" DOUBLE PRECISION,
ADD COLUMN     "pickupLng" DOUBLE PRECISION,
ADD COLUMN     "pickupMapsUrl" TEXT,
ADD COLUMN     "pickupName" TEXT,
ADD COLUMN     "pickupRequestStatus" TEXT NOT NULL DEFAULT 'DEFAULT',
ADD COLUMN     "pricingMode" TEXT NOT NULL DEFAULT 'WHOLE_TOUR',
ADD COLUMN     "pricingUnit" TEXT NOT NULL DEFAULT 'PER_TOUR',
ADD COLUMN     "requestedBookingDate" TIMESTAMP(3),
ADD COLUMN     "requestedBookingTime" TEXT,
ADD COLUMN     "requestedPickupAddress" TEXT,
ADD COLUMN     "requestedPickupLat" DOUBLE PRECISION,
ADD COLUMN     "requestedPickupLng" DOUBLE PRECISION,
ADD COLUMN     "requestedPickupMapsUrl" TEXT,
ADD COLUMN     "requestedPickupName" TEXT,
ADD COLUMN     "rescheduleStatus" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "transportDetails" TEXT,
ADD COLUMN     "transportStatus" TEXT,
ADD COLUMN     "tripStartTime" TEXT,
ALTER COLUMN "numberOfAdults" SET NOT NULL,
ALTER COLUMN "numberOfChildren" SET NOT NULL;

-- AlterTable
ALTER TABLE "common_guide_package" ADD COLUMN     "additionalCostsDetails" TEXT,
ADD COLUMN     "allowCustomerPlaceSelection" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "cancellationPolicy" TEXT,
ADD COLUMN     "childDiscountPercent" DOUBLE PRECISION,
ADD COLUMN     "childDiscountType" TEXT DEFAULT 'NO_DISCOUNT',
ADD COLUMN     "entryFeeDetails" TEXT,
ADD COLUMN     "entryFeeStatus" TEXT NOT NULL DEFAULT 'EXCLUDED',
ADD COLUMN     "foodDetails" TEXT,
ADD COLUMN     "foodStatus" TEXT NOT NULL DEFAULT 'EXCLUDED',
ADD COLUMN     "pickupAddress" TEXT,
ADD COLUMN     "pickupLat" DOUBLE PRECISION,
ADD COLUMN     "pickupLng" DOUBLE PRECISION,
ADD COLUMN     "pickupMapsUrl" TEXT,
ADD COLUMN     "pickupName" TEXT,
ADD COLUMN     "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "pricingMode" TEXT NOT NULL DEFAULT 'WHOLE_TOUR',
ADD COLUMN     "pricingUnit" TEXT NOT NULL DEFAULT 'PER_TOUR',
ADD COLUMN     "transportDetails" TEXT,
ADD COLUMN     "transportStatus" TEXT NOT NULL DEFAULT 'EXCLUDED',
ADD COLUMN     "tripStartTime" TEXT,
ALTER COLUMN "mealsService" SET NOT NULL,
ALTER COLUMN "transportService" SET NOT NULL,
ALTER COLUMN "hasSpecificGuide" SET NOT NULL,
ALTER COLUMN "childrenAllowed" SET NOT NULL,
ALTER COLUMN "childrenCountTowardCapacity" SET NOT NULL;

-- AlterTable
ALTER TABLE "common_guide_package_places" ADD COLUMN     "price" DOUBLE PRECISION,
ALTER COLUMN "itineraryOrder" SET NOT NULL,
ALTER COLUMN "visitArrangement" SET NOT NULL,
ALTER COLUMN "entryFeeStatus" SET NOT NULL;

-- AlterTable
ALTER TABLE "hotel_booking" ALTER COLUMN "paymentStatus" SET NOT NULL;

-- AlterTable
ALTER TABLE "place" ADD COLUMN     "additionalFees" JSONB,
ADD COLUMN     "addressLine" TEXT,
ADD COLUMN     "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "childEntryFee" DOUBLE PRECISION,
ADD COLUMN     "childMaxAge" INTEGER DEFAULT 12,
ADD COLUMN     "entryFeeConditions" TEXT,
ADD COLUMN     "entryFeeType" TEXT DEFAULT 'FREE',
ADD COLUMN     "foreignAdultFee" DOUBLE PRECISION,
ADD COLUMN     "foreignChildFee" DOUBLE PRECISION,
ADD COLUMN     "foreignChildMaxAge" INTEGER DEFAULT 12,
ADD COLUMN     "foreignEntryFeeConditions" TEXT,
ADD COLUMN     "foreignEntryFeeType" TEXT,
ADD COLUMN     "hasAdditionalFees" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasForeignPricing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "locality" TEXT,
ADD COLUMN     "mapsUrl" TEXT,
ADD COLUMN     "pincode" TEXT,
ALTER COLUMN "latitude" SET DEFAULT 0,
ALTER COLUMN "longitude" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "place_submission" ADD COLUMN     "additionalFees" JSONB,
ADD COLUMN     "addressLine" TEXT,
ADD COLUMN     "categories" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "childEntryFee" DOUBLE PRECISION,
ADD COLUMN     "childMaxAge" INTEGER DEFAULT 12,
ADD COLUMN     "entryFeeConditions" TEXT,
ADD COLUMN     "entryFeeType" TEXT DEFAULT 'FREE',
ADD COLUMN     "foreignAdultFee" DOUBLE PRECISION,
ADD COLUMN     "foreignChildFee" DOUBLE PRECISION,
ADD COLUMN     "foreignChildMaxAge" INTEGER DEFAULT 12,
ADD COLUMN     "foreignEntryFeeConditions" TEXT,
ADD COLUMN     "foreignEntryFeeType" TEXT,
ADD COLUMN     "hasAdditionalFees" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasForeignPricing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "locality" TEXT,
ADD COLUMN     "mapsUrl" TEXT,
ADD COLUMN     "pincode" TEXT,
ALTER COLUMN "latitude" SET DEFAULT 0,
ALTER COLUMN "longitude" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "specific_guide" ADD COLUMN     "canPurchaseEntryTickets" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSharingLocation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "locationUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "sharedLatitude" DOUBLE PRECISION,
ADD COLUMN     "sharedLongitude" DOUBLE PRECISION,
ADD COLUMN     "ticketPurchasingConditions" TEXT;

-- AlterTable
ALTER TABLE "specific_guide_booking" ADD COLUMN     "cancellationPolicy" TEXT,
ADD COLUMN     "numberOfPeople" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'NOT_VERIFIED',
ADD COLUMN     "pickupAddress" TEXT,
ADD COLUMN     "pickupLat" DOUBLE PRECISION,
ADD COLUMN     "pickupLng" DOUBLE PRECISION,
ADD COLUMN     "pickupMapsUrl" TEXT,
ADD COLUMN     "pickupName" TEXT,
ADD COLUMN     "requestTicketAssistance" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requestedBookingDate" TIMESTAMP(3),
ADD COLUMN     "requestedBookingTime" TEXT,
ADD COLUMN     "requestedPickupAddress" TEXT,
ADD COLUMN     "requestedPickupMapsUrl" TEXT,
ADD COLUMN     "requestedPickupName" TEXT,
ADD COLUMN     "rescheduleStatus" TEXT NOT NULL DEFAULT 'NONE',
ADD COLUMN     "totalPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "common_guide_booking" ADD CONSTRAINT "common_guide_booking_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "common_guide_package"("id") ON DELETE SET NULL ON UPDATE CASCADE;
