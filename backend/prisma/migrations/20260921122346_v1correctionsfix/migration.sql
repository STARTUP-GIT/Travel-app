-- CreateEnum
CREATE TYPE "placeSubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "bookingStatus" ADD VALUE 'REJECTED';

-- AlterTable
ALTER TABLE "district" ADD COLUMN     "autoApprovePlaces" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "place_submission" (
    "id" TEXT NOT NULL,
    "placeId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "images" TEXT[],
    "entryfee" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "status" "placeSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "specificGuideId" TEXT,
    "commonGuideId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "place_submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specific_guide_booking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "specificGuideId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "bookingDate" TIMESTAMP(3) NOT NULL,
    "bookingTime" TEXT,
    "status" "bookingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specific_guide_booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common_guide_booking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "commonGuideId" TEXT NOT NULL,
    "bookingDate" TIMESTAMP(3) NOT NULL,
    "bookingTime" TEXT,
    "status" "bookingStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "common_guide_booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common_guide_booking_places" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,

    CONSTRAINT "common_guide_booking_places_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "common_guide_booking_places_bookingId_placeId_key" ON "common_guide_booking_places"("bookingId", "placeId");

-- AddForeignKey
ALTER TABLE "place_submission" ADD CONSTRAINT "place_submission_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_submission" ADD CONSTRAINT "place_submission_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "district"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_submission" ADD CONSTRAINT "place_submission_specificGuideId_fkey" FOREIGN KEY ("specificGuideId") REFERENCES "specific_guide"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_submission" ADD CONSTRAINT "place_submission_commonGuideId_fkey" FOREIGN KEY ("commonGuideId") REFERENCES "common_guide"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specific_guide_booking" ADD CONSTRAINT "specific_guide_booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specific_guide_booking" ADD CONSTRAINT "specific_guide_booking_specificGuideId_fkey" FOREIGN KEY ("specificGuideId") REFERENCES "specific_guide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specific_guide_booking" ADD CONSTRAINT "specific_guide_booking_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common_guide_booking" ADD CONSTRAINT "common_guide_booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common_guide_booking" ADD CONSTRAINT "common_guide_booking_commonGuideId_fkey" FOREIGN KEY ("commonGuideId") REFERENCES "common_guide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common_guide_booking_places" ADD CONSTRAINT "common_guide_booking_places_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "common_guide_booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common_guide_booking_places" ADD CONSTRAINT "common_guide_booking_places_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
