/*
  Warnings:

  - Added the required column `hotelOwnerId` to the `hotel` table without a default value. This is not possible if the table is not empty.
  - Added the required column `restaurentOwnerId` to the `restaurent` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "bookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- AlterTable
ALTER TABLE "hotel" ADD COLUMN     "booking_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "hotelOwnerId" TEXT NOT NULL,
ADD COLUMN     "phone_number" TEXT,
ADD COLUMN     "website" TEXT,
ADD COLUMN     "whatsapp_number" TEXT;

-- AlterTable
ALTER TABLE "restaurent" ADD COLUMN     "booking_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone_number" TEXT,
ADD COLUMN     "restaurentOwnerId" TEXT NOT NULL,
ADD COLUMN     "website" TEXT,
ADD COLUMN     "whatsapp_number" TEXT;

-- CreateTable
CREATE TABLE "hotel_owner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "profile_pic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_owner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurent_owner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "profile_pic" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurent_owner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_booking" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "guests" INTEGER NOT NULL,
    "rooms" INTEGER NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "status" "bookingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurant_reservation" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reservationDate" TIMESTAMP(3) NOT NULL,
    "guests" INTEGER NOT NULL,
    "status" "bookingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurant_reservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hotel_owner_username_key" ON "hotel_owner"("username");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_owner_email_key" ON "hotel_owner"("email");

-- CreateIndex
CREATE UNIQUE INDEX "restaurent_owner_username_key" ON "restaurent_owner"("username");

-- CreateIndex
CREATE UNIQUE INDEX "restaurent_owner_email_key" ON "restaurent_owner"("email");

-- AddForeignKey
ALTER TABLE "hotel" ADD CONSTRAINT "hotel_hotelOwnerId_fkey" FOREIGN KEY ("hotelOwnerId") REFERENCES "hotel_owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurent" ADD CONSTRAINT "restaurent_restaurentOwnerId_fkey" FOREIGN KEY ("restaurentOwnerId") REFERENCES "restaurent_owner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_booking" ADD CONSTRAINT "hotel_booking_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_booking" ADD CONSTRAINT "hotel_booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_reservation" ADD CONSTRAINT "restaurant_reservation_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurant_reservation" ADD CONSTRAINT "restaurant_reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
