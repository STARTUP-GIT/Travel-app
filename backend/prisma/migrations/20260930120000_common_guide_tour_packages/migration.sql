-- Common Guide tour packages.
--
-- Two new tables only. No existing row is read, rewritten or deleted, and
-- `common_guide_places` is left exactly as it is: it stays the guide's overall
-- coverage (the union of every package's places, for guides that use packages)
-- so public guide discovery and booking validation keep working untouched.
--
-- The two cascades mirror `common_guide_places.commonGuideId`: a package is
-- part of its guide and a membership row is part of its package, so removing
-- the parent removes them instead of failing on a restricting foreign key.

-- CreateTable
CREATE TABLE "common_guide_package" (
    "id" TEXT NOT NULL,
    "commonGuideId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "common_guide_package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common_guide_package_places" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,

    CONSTRAINT "common_guide_package_places_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "common_guide_package_commonGuideId_idx" ON "common_guide_package"("commonGuideId");

-- CreateIndex
CREATE UNIQUE INDEX "common_guide_package_places_packageId_placeId_key" ON "common_guide_package_places"("packageId", "placeId");

-- CreateIndex
CREATE INDEX "common_guide_package_places_placeId_idx" ON "common_guide_package_places"("placeId");

-- AddForeignKey
ALTER TABLE "common_guide_package" ADD CONSTRAINT "common_guide_package_commonGuideId_fkey" FOREIGN KEY ("commonGuideId") REFERENCES "common_guide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common_guide_package_places" ADD CONSTRAINT "common_guide_package_places_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "common_guide_package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common_guide_package_places" ADD CONSTRAINT "common_guide_package_places_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
