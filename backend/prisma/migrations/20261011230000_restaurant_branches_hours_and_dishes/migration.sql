-- AlterTable
ALTER TABLE "restaurent" ADD COLUMN "maps_url" TEXT,
ADD COLUMN "opening_time" TEXT,
ADD COLUMN "closing_time" TEXT,
ADD COLUMN "has_branches" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "parent_restaurant_id" TEXT;

-- CreateTable
CREATE TABLE "restaurant_dish" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "foodCategory" "Food_Category" NOT NULL DEFAULT 'VEG_AND_NONVEG',
    "price" DOUBLE PRECISION,
    "image" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_dish_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "restaurant_reservation" ADD COLUMN "reservationTime" TEXT,
ADD COLUMN "notes" TEXT,
ADD COLUMN "reservationSnapshot" JSONB;

-- CreateIndex
CREATE INDEX "restaurant_dish_restaurantId_idx" ON "restaurant_dish"("restaurantId");

-- AddForeignKey
ALTER TABLE "restaurent" ADD CONSTRAINT "restaurent_parent_restaurant_id_fkey" FOREIGN KEY ("parent_restaurant_id") REFERENCES "restaurent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_dish" ADD CONSTRAINT "restaurant_dish_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
