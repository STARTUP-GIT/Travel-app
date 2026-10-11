-- AlterTable hotel: Additive columns for star rating, maps link, and check-in/out policies
ALTER TABLE "hotel" ADD COLUMN IF NOT EXISTS "star_rating" INTEGER;
ALTER TABLE "hotel" ADD COLUMN IF NOT EXISTS "maps_url" TEXT;
ALTER TABLE "hotel" ADD COLUMN IF NOT EXISTS "check_in_time_type" TEXT;
ALTER TABLE "hotel" ADD COLUMN IF NOT EXISTS "check_in_time" TEXT;
ALTER TABLE "hotel" ADD COLUMN IF NOT EXISTS "check_in_start_time" TEXT;
ALTER TABLE "hotel" ADD COLUMN IF NOT EXISTS "check_in_end_time" TEXT;
ALTER TABLE "hotel" ADD COLUMN IF NOT EXISTS "check_out_time_type" TEXT;
ALTER TABLE "hotel" ADD COLUMN IF NOT EXISTS "check_out_time" TEXT;
ALTER TABLE "hotel" ADD COLUMN IF NOT EXISTS "check_out_start_time" TEXT;
ALTER TABLE "hotel" ADD COLUMN IF NOT EXISTS "check_out_end_time" TEXT;

-- CreateTable hotel_room_type
CREATE TABLE IF NOT EXISTS "hotel_room_type" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "roomType" TEXT NOT NULL DEFAULT 'AC',
    "maxOccupancy" INTEGER NOT NULL DEFAULT 2,
    "availableRooms" INTEGER NOT NULL DEFAULT 1,
    "pricePerNight" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roomOverviewPhoto" TEXT NOT NULL,
    "bathroomPhoto" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "hasHotWater" BOOLEAN NOT NULL DEFAULT true,
    "hotWaterCharge" DOUBLE PRECISION,
    "hasTv" BOOLEAN NOT NULL DEFAULT true,
    "hasAttachedBathroom" BOOLEAN NOT NULL DEFAULT true,
    "hasWifi" BOOLEAN NOT NULL DEFAULT true,
    "facilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "additionalServices" JSONB,
    "conditions" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_room_type_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "hotel_room_type_hotelId_idx" ON "hotel_room_type"("hotelId");

-- AddForeignKey for hotel_room_type.hotelId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hotel_room_type_hotelId_fkey'
  ) THEN
    ALTER TABLE "hotel_room_type" 
      ADD CONSTRAINT "hotel_room_type_hotelId_fkey" 
      FOREIGN KEY ("hotelId") REFERENCES "hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AlterTable hotel_booking: Additive columns for roomTypeId, bookingSnapshot, notes, paymentStatus
ALTER TABLE "hotel_booking" ADD COLUMN IF NOT EXISTS "roomTypeId" TEXT;
ALTER TABLE "hotel_booking" ADD COLUMN IF NOT EXISTS "bookingSnapshot" JSONB;
ALTER TABLE "hotel_booking" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "hotel_booking" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT DEFAULT 'NOT_VERIFIED';

-- AddForeignKey for hotel_booking.roomTypeId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'hotel_booking_roomTypeId_fkey'
  ) THEN
    ALTER TABLE "hotel_booking" 
      ADD CONSTRAINT "hotel_booking_roomTypeId_fkey" 
      FOREIGN KEY ("roomTypeId") REFERENCES "hotel_room_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
