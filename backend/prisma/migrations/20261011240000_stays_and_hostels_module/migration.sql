-- AlterTable hotel: Additive columns for Stays & Backpacker Hostels module
ALTER TABLE "hotel" ADD COLUMN IF NOT EXISTS "property_type" TEXT NOT NULL DEFAULT 'HOTEL';
ALTER TABLE "hotel" ADD COLUMN IF NOT EXISTS "stay_category" TEXT;
ALTER TABLE "hotel" ADD COLUMN IF NOT EXISTS "accommodation_rules" TEXT;
ALTER TABLE "hotel" ADD COLUMN IF NOT EXISTS "cancellation_policy" TEXT;
ALTER TABLE "hotel" ADD COLUMN IF NOT EXISTS "activities" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "hotel" ADD COLUMN IF NOT EXISTS "facilities" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable hotel_room_type: Additive columns for Dormitories & Bed Inventory in Stays
ALTER TABLE "hotel_room_type" ADD COLUMN IF NOT EXISTS "roomCategory" TEXT DEFAULT 'PRIVATE';
ALTER TABLE "hotel_room_type" ADD COLUMN IF NOT EXISTS "bedType" TEXT;
ALTER TABLE "hotel_room_type" ADD COLUMN IF NOT EXISTS "dormGender" TEXT;
ALTER TABLE "hotel_room_type" ADD COLUMN IF NOT EXISTS "bedCapacity" INTEGER;
ALTER TABLE "hotel_room_type" ADD COLUMN IF NOT EXISTS "pricingUnit" TEXT DEFAULT 'PER_ROOM';
