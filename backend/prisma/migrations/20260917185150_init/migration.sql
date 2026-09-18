-- CreateEnum
CREATE TYPE "Food_Category" AS ENUM ('PUREVEG', 'NONVEG', 'VEG_AND_NONVEG');

-- CreateEnum
CREATE TYPE "Providers" AS ENUM ('GOOGLE', 'EMAIL');

-- CreateTable
CREATE TABLE "app_config" (
    "id" TEXT NOT NULL,
    "app_name" TEXT NOT NULL,
    "imageBanners" TEXT[],
    "icon" TEXT NOT NULL,
    "webTitle" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "contacts" TEXT NOT NULL,
    "termsandconditions" TEXT NOT NULL,
    "privacy" TEXT NOT NULL,
    "app_description" TEXT NOT NULL,

    CONSTRAINT "app_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appConfigId" TEXT NOT NULL,
    "specificguideId" TEXT,
    "commonGuideId" TEXT,
    "text" TEXT NOT NULL,
    "image" TEXT,
    "rating" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "appConfigId" TEXT NOT NULL,
    "provider" "Providers" NOT NULL,
    "profilepic" TEXT,

    CONSTRAINT "admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phonenumber" TEXT NOT NULL,
    "profilepic" TEXT,
    "provider" "Providers" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_fav_place" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,

    CONSTRAINT "user_fav_place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "country" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "state" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryId" TEXT NOT NULL,

    CONSTRAINT "state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "district" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,

    CONSTRAINT "district_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "images" TEXT[],
    "entryfee" DOUBLE PRECISION NOT NULL,
    "category" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specific_guide" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phonenumber" TEXT NOT NULL,
    "profile_pic" TEXT NOT NULL,
    "tagline" TEXT,
    "provider" "Providers" NOT NULL,
    "review" TEXT[],
    "rating" DOUBLE PRECISION,
    "description" TEXT,
    "placeid" TEXT NOT NULL,
    "isReported" BOOLEAN NOT NULL DEFAULT false,
    "experience" INTEGER NOT NULL,
    "cost" INTEGER NOT NULL,
    "language" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "specific_guide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common_guide" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phonenumber" TEXT NOT NULL,
    "profile_pic" TEXT NOT NULL,
    "tagline" TEXT,
    "provider" "Providers" NOT NULL,
    "review" TEXT[],
    "rating" DOUBLE PRECISION,
    "description" TEXT,
    "isReported" BOOLEAN NOT NULL DEFAULT false,
    "experience" INTEGER NOT NULL,
    "cost" INTEGER NOT NULL,
    "language" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "common_guide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "common_guide_places" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "commonGuideId" TEXT NOT NULL,

    CONSTRAINT "common_guide_places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "profile_logo" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "description" TEXT,
    "rating" DOUBLE PRECISION NOT NULL,
    "review" TEXT[],
    "cost_per_night" INTEGER NOT NULL,
    "images" TEXT[],
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "restaurent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "districtId" TEXT NOT NULL,
    "description" TEXT,
    "rating" DOUBLE PRECISION NOT NULL,
    "review" TEXT[],
    "menu" TEXT[],
    "food_category" "Food_Category" NOT NULL DEFAULT 'VEG_AND_NONVEG',
    "images" TEXT[],
    "profile_logo" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_username_key" ON "admin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admin_email_key" ON "admin"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_fav_place_userId_placeId_key" ON "user_fav_place"("userId", "placeId");

-- CreateIndex
CREATE UNIQUE INDEX "specific_guide_username_key" ON "specific_guide"("username");

-- CreateIndex
CREATE UNIQUE INDEX "specific_guide_email_key" ON "specific_guide"("email");

-- CreateIndex
CREATE UNIQUE INDEX "specific_guide_placeid_key" ON "specific_guide"("placeid");

-- CreateIndex
CREATE UNIQUE INDEX "common_guide_username_key" ON "common_guide"("username");

-- CreateIndex
CREATE UNIQUE INDEX "common_guide_email_key" ON "common_guide"("email");

-- CreateIndex
CREATE UNIQUE INDEX "common_guide_places_placeId_commonGuideId_key" ON "common_guide_places"("placeId", "commonGuideId");

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_specificguideId_fkey" FOREIGN KEY ("specificguideId") REFERENCES "specific_guide"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_commonGuideId_fkey" FOREIGN KEY ("commonGuideId") REFERENCES "common_guide"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_appConfigId_fkey" FOREIGN KEY ("appConfigId") REFERENCES "app_config"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin" ADD CONSTRAINT "admin_appConfigId_fkey" FOREIGN KEY ("appConfigId") REFERENCES "app_config"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_fav_place" ADD CONSTRAINT "user_fav_place_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_fav_place" ADD CONSTRAINT "user_fav_place_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "state" ADD CONSTRAINT "state_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "district" ADD CONSTRAINT "district_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "state"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place" ADD CONSTRAINT "place_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "district"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "specific_guide" ADD CONSTRAINT "specific_guide_placeid_fkey" FOREIGN KEY ("placeid") REFERENCES "place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common_guide_places" ADD CONSTRAINT "common_guide_places_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "place"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "common_guide_places" ADD CONSTRAINT "common_guide_places_commonGuideId_fkey" FOREIGN KEY ("commonGuideId") REFERENCES "common_guide"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel" ADD CONSTRAINT "hotel_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "district"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restaurent" ADD CONSTRAINT "restaurent_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "district"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
