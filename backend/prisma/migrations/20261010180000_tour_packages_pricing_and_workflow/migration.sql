-- AlterTable common_guide_package: Additive fields for package details, meals, transport, specific guide, and child rules
ALTER TABLE "common_guide_package" ADD COLUMN IF NOT EXISTS "duration" TEXT;
ALTER TABLE "common_guide_package" ADD COLUMN IF NOT EXISTS "maxGroupSize" INTEGER DEFAULT 10;
ALTER TABLE "common_guide_package" ADD COLUMN IF NOT EXISTS "packageImages" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "common_guide_package" ADD COLUMN IF NOT EXISTS "mealsService" TEXT DEFAULT 'NO_SERVICE';
ALTER TABLE "common_guide_package" ADD COLUMN IF NOT EXISTS "includedMeals" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "common_guide_package" ADD COLUMN IF NOT EXISTS "mealDetails" TEXT;
ALTER TABLE "common_guide_package" ADD COLUMN IF NOT EXISTS "transportService" TEXT DEFAULT 'NO_SERVICE';
ALTER TABLE "common_guide_package" ADD COLUMN IF NOT EXISTS "transportVehicles" JSONB;
ALTER TABLE "common_guide_package" ADD COLUMN IF NOT EXISTS "hasSpecificGuide" BOOLEAN DEFAULT false;
ALTER TABLE "common_guide_package" ADD COLUMN IF NOT EXISTS "specificGuideId" TEXT;
ALTER TABLE "common_guide_package" ADD COLUMN IF NOT EXISTS "childrenAllowed" BOOLEAN DEFAULT true;
ALTER TABLE "common_guide_package" ADD COLUMN IF NOT EXISTS "childMaxAge" INTEGER DEFAULT 11;
ALTER TABLE "common_guide_package" ADD COLUMN IF NOT EXISTS "maxChildren" INTEGER;
ALTER TABLE "common_guide_package" ADD COLUMN IF NOT EXISTS "childrenCountTowardCapacity" BOOLEAN DEFAULT true;
ALTER TABLE "common_guide_package" ADD COLUMN IF NOT EXISTS "childPrice" DOUBLE PRECISION;
ALTER TABLE "common_guide_package" ADD COLUMN IF NOT EXISTS "childConditions" TEXT;

-- Foreign key for common_guide_package.specificGuideId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'common_guide_package_specificGuideId_fkey'
  ) THEN
    ALTER TABLE "common_guide_package" 
      ADD CONSTRAINT "common_guide_package_specificGuideId_fkey" 
      FOREIGN KEY ("specificGuideId") REFERENCES "specific_guide"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- AlterTable common_guide_package_places: Additive fields for place itinerary order, visit arrangement, and entry fees
ALTER TABLE "common_guide_package_places" ADD COLUMN IF NOT EXISTS "itineraryOrder" INTEGER DEFAULT 1;
ALTER TABLE "common_guide_package_places" ADD COLUMN IF NOT EXISTS "visitArrangement" TEXT DEFAULT 'GUIDED';
ALTER TABLE "common_guide_package_places" ADD COLUMN IF NOT EXISTS "expectedDuration" TEXT;
ALTER TABLE "common_guide_package_places" ADD COLUMN IF NOT EXISTS "entryFeeStatus" TEXT DEFAULT 'EXCLUDED';
ALTER TABLE "common_guide_package_places" ADD COLUMN IF NOT EXISTS "entryFeeAmount" DOUBLE PRECISION;

-- AlterTable common_guide_booking: Additive fields for adults, children, specific guide participation, and snapshot
ALTER TABLE "common_guide_booking" ADD COLUMN IF NOT EXISTS "numberOfAdults" INTEGER DEFAULT 1;
ALTER TABLE "common_guide_booking" ADD COLUMN IF NOT EXISTS "numberOfChildren" INTEGER DEFAULT 0;
ALTER TABLE "common_guide_booking" ADD COLUMN IF NOT EXISTS "specificGuideId" TEXT;
ALTER TABLE "common_guide_booking" ADD COLUMN IF NOT EXISTS "specificGuideStatus" TEXT DEFAULT 'PENDING';
ALTER TABLE "common_guide_booking" ADD COLUMN IF NOT EXISTS "bookingSnapshot" JSONB;

-- Foreign key for common_guide_booking.specificGuideId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'common_guide_booking_specificGuideId_fkey'
  ) THEN
    ALTER TABLE "common_guide_booking" 
      ADD CONSTRAINT "common_guide_booking_specificGuideId_fkey" 
      FOREIGN KEY ("specificGuideId") REFERENCES "specific_guide"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
