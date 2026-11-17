/**
 * District home.
 *
 * Exact replica of frontend/app/[stateSlug]/[districtSlug]/page.tsx & district-hero.tsx.
 * Resolves Hero Image with full Admin precedence:
 *   1) District custom image override (when toggle is enabled)
 *   2) Global default district hero image
 *   3) Safe content fallback (place/hotel/restaurant image, or state primaryImage)
 */

import React, { useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDistrict } from "@/providers/district-provider";
import { useAppShell } from "@/providers/app-shell-provider";
import { useFavorites } from "@/hooks/use-favorites";
import { Section } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RemoteImage } from "@/components/ui/remote-image";
import { PlaceCard } from "@/components/place-card";
import { GuideCard } from "@/components/guide-card";
import { HotelCard, RestaurantCard } from "@/components/listing-card";
import { EmptyState } from "@/components/ui/states";
import { colors, radii, spacing, typography } from "@/theme";
import { formatCurrency } from "@/lib/utils/currency";

const PREVIEW_COUNT = 4;

function firstImage(images: unknown): string | null {
  if (!Array.isArray(images)) return null;
  const image = images.find(
    (candidate): candidate is string =>
      typeof candidate === "string" && candidate.trim().length > 0
  );
  return image?.trim() ?? null;
}

export default function DistrictHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { district, places, guides, hotels, restaurants } = useDistrict();
  const favorites = useFavorites();
  const { config } = useAppShell();

  const params = useLocalSearchParams<{ stateSlug?: string; districtSlug?: string }>();
  const base = `/d/${params.stateSlug ?? ""}/${params.districtSlug ?? ""}`;

  // Resolving Hero Image with full Admin precedence matching web
  const heroImage = useMemo(() => {
    if (!district) return null;

    const customHeroImage =
      district.useCustomHeroImage && district.heroImageUrl
        ? district.heroImageUrl.trim()
        : null;

    const globalDefaultHeroImage =
      (district.effectiveHeroImageUrl && !district.useCustomHeroImage
        ? district.effectiveHeroImageUrl
        : config?.defaultDistrictHeroImageUrl)?.trim() || null;

    const safeContentFallback =
      firstImage(places.flatMap((place) => place.images)) ||
      firstImage(hotels.flatMap((hotel) => hotel.images)) ||
      firstImage(restaurants.flatMap((restaurant) => restaurant.images)) ||
      (typeof district.state?.primaryImage === "string" &&
        district.state.primaryImage.trim()) ||
      null;

    return customHeroImage || globalDefaultHeroImage || safeContentFallback;
  }, [district, places, hotels, restaurants, config?.defaultDistrictHeroImageUrl]);

  if (!district) return null;

  // Resolving Welcome Heading visibility matching web
  let showHeading = true;
  if (district.showWelcomeHeading === "SHOW") {
    showHeading = true;
  } else if (district.showWelcomeHeading === "HIDE") {
    showHeading = false;
  } else if (district.effectiveShowWelcomeHeading !== undefined) {
    showHeading = district.effectiveShowWelcomeHeading;
  } else if (config?.showDistrictHeadingByDefault !== undefined) {
    showHeading = config.showDistrictHeadingByDefault;
  }

  const openPlace = (placeId: string) => router.push(`${base}/place/${placeId}` as any);
  const openGuide = (type: "specific" | "common", guideId: string) =>
    router.push(
      `${base}/${type === "common" ? "tour-guide" : "guide"}/${guideId}` as any
    );
  const openPackage = (packageId: string) =>
    router.push(`${base}/tour-package/${packageId}` as any);

  const cityName = district.name;
  const stateName = district.state?.name || "India";

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={{ paddingBottom: spacing.xxxl + insets.bottom }}
        showsVerticalScrollIndicator={false}
      >
        {/* District Hero Card - Exact replica of web's DistrictHero */}
        <View style={styles.heroWrapper}>
          <View style={styles.heroCard}>
            <RemoteImage
              uri={heroImage}
              style={StyleSheet.absoluteFill}
              fallbackLabel={cityName}
              accessibilityLabel={cityName}
            />

            <LinearGradient
              colors={["rgba(0,0,0,0.85)", "rgba(0,0,0,0.55)", "rgba(0,0,0,0.3)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.heroContent}>
              <Text style={styles.heroEyebrow}>
                {(config?.text || "EXPLORE • EXPERIENCE • BELONG").toUpperCase()}
              </Text>

              {showHeading ? (
                <Text style={styles.heroTitle} numberOfLines={2}>
                  Welcome to {cityName}
                </Text>
              ) : null}

              <Text style={styles.heroDesc} numberOfLines={3}>
                Explore {cityName}, {stateName} — heritage, culture, places and experiences for your journey.
              </Text>

              <View style={styles.heroActionsCol}>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/search" as any,
                      params: {
                        districtId: district.id,
                        stateSlug: params.stateSlug ?? "",
                        districtSlug: params.districtSlug ?? "",
                      },
                    })
                  }
                  style={styles.heroSearchBox}
                  accessibilityRole="search"
                >
                  <Ionicons name="search" size={16} color="rgba(255, 255, 255, 0.7)" />
                  <Text style={styles.heroSearchText}>Search in {cityName}...</Text>
                </Pressable>

                <Pressable
                  onPress={() => router.push("/explore" as any)}
                  style={({ pressed }) => [
                    styles.heroChangeBtn,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Change destination"
                >
                  <Ionicons name="location" size={16} color="#FFFFFF" />
                  <Text style={styles.heroChangeText}>Change destination</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* 2. Explore & Services */}
        <View style={styles.section}>
          <Section title="Explore & Services" subtitle="What would you like to do?">
            <View style={styles.serviceGrid}>
              <Pressable
                onPress={() => router.push(`${base}/path-tracker` as any)}
                style={({ pressed }) => [
                  styles.serviceCard,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Path Tracker"
              >
                <View style={[styles.serviceIconBox, { backgroundColor: "#ECFDF5" }]}>
                  <Ionicons name="navigate" size={22} color="#059669" />
                </View>
                <View style={styles.serviceTextCol}>
                  <Text style={styles.serviceTitle}>Path Tracker</Text>
                  <Text style={styles.serviceSubtitle}>Track your route & distance</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>

              <Pressable
                onPress={() => router.push("/favorites" as any)}
                style={({ pressed }) => [
                  styles.serviceCard,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Saved"
              >
                <View style={[styles.serviceIconBox, { backgroundColor: "#FFF1F2" }]}>
                  <Ionicons name="bookmark" size={22} color="#E11D48" />
                </View>
                <View style={styles.serviceTextCol}>
                  <Text style={styles.serviceTitle}>Saved</Text>
                  <Text style={styles.serviceSubtitle}>Your saved places & guides</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>

              <Pressable
                onPress={() => router.push("/bookings" as any)}
                style={({ pressed }) => [
                  styles.serviceCard,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Bookings"
              >
                <View style={[styles.serviceIconBox, { backgroundColor: "#EFF6FF" }]}>
                  <Ionicons name="calendar" size={22} color="#2563EB" />
                </View>
                <View style={styles.serviceTextCol}>
                  <Text style={styles.serviceTitle}>Bookings</Text>
                  <Text style={styles.serviceSubtitle}>Guides, stays & reservations</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            </View>
          </Section>
        </View>

        {/* 3. Path Tracker Emerald Banner */}
        <View style={styles.section}>
          <View style={styles.emeraldBanner}>
            <View style={styles.bannerContent}>
              <Text style={styles.bannerEyebrow}>PATH TRACKER</Text>
              <Text style={styles.bannerTitle}>Track your route, distance & time</Text>
              <Text style={styles.bannerDesc}>
                Plan a walking route and follow it live with GPS, distance, speed and a full trip report when you finish.
              </Text>
              <Pressable
                onPress={() => router.push(`${base}/path-tracker` as any)}
                style={({ pressed }) => [
                  styles.bannerBtn,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Start a trip"
              >
                <Text style={styles.bannerBtnText}>Start a trip  -&gt;</Text>
              </Pressable>
            </View>
            <Ionicons
              name="navigate-circle"
              size={88}
              color="rgba(255, 255, 255, 0.16)"
              style={styles.bannerWatermark}
            />
          </View>
        </View>

        {/* 4. Popular Destinations */}
        <View style={styles.section}>
          <Section
            title="Popular Destinations"
            subtitle={
              places.length > 0
                ? `Pick a destination in ${cityName} to begin`
                : undefined
            }
            action={
              places.length > PREVIEW_COUNT
                ? { label: "See all", onPress: () => router.push(`${base}/places` as any) }
                : undefined
            }
          >
            {places.length === 0 ? (
              <EmptyState
                title="No places yet"
                description={`Nothing has been published in ${cityName} yet.`}
                icon="map-outline"
              />
            ) : (
              places
                .slice(0, PREVIEW_COUNT)
                .map((place) => (
                  <PlaceCard
                    key={place.id}
                    place={place}
                    districtName={cityName}
                    onPress={() => openPlace(place.id)}
                    saved={favorites.isSaved(place.id, "place")}
                    onToggleSave={() =>
                      void favorites.toggle(place.id, "place", {
                        name: place.name,
                        subtitle: place.category,
                        districtSlug: params.districtSlug,
                      })
                    }
                  />
                ))
            )}
          </Section>
        </View>

        {/* 5. Tour Guides (Packages and Local Guides) */}
        <View style={styles.section}>
          <Section
            title="Tour Guides"
            subtitle="Tour packages from local tour guides"
            action={
              guides.packages.length > 0 || guides.guides.length > 0
                ? { label: "See all", onPress: () => router.push(`${base}/guides` as any) }
                : undefined
            }
          >
            {guides.packages.length > 0 ? (
              guides.packages.slice(0, PREVIEW_COUNT).map((pkg) => {
                const cover = pkg.places.find((p) => p.images?.[0])?.images?.[0];
                return (
                  <Pressable
                    key={pkg.id}
                    onPress={() => openPackage(pkg.id)}
                    style={({ pressed }) => [
                      styles.packageCard,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.packageHeader}>
                      <RemoteImage
                        uri={pkg.guide.profile_pic}
                        fallbackLabel={pkg.guide.full_name}
                        style={styles.pkgAvatar}
                        radius={22}
                      />
                      <View style={styles.pkgTitleWrap}>
                        <View style={styles.pkgNameRow}>
                          <Ionicons name="map-outline" size={15} color={colors.primary} />
                          <Text style={styles.pkgName} numberOfLines={1}>
                            {pkg.name}
                          </Text>
                        </View>
                        <Text style={styles.pkgAgency} numberOfLines={1}>
                          {pkg.guide.agencyName
                            ? `${pkg.guide.agencyName} with ${pkg.guide.full_name}`
                            : `with ${pkg.guide.full_name}`}
                        </Text>
                      </View>
                    </View>

                    {cover ? (
                      <View style={styles.pkgCoverWrap}>
                        <RemoteImage
                          uri={cover}
                          style={styles.pkgCover}
                          fallbackLabel={pkg.name}
                        />
                      </View>
                    ) : null}

                    {pkg.description ? (
                      <Text style={styles.pkgDesc} numberOfLines={2}>
                        {pkg.description}
                      </Text>
                    ) : null}

                    <View style={styles.pkgBadgesRow}>
                      <View style={styles.badgeSuccess}>
                        <Ionicons name="location" size={11} color="#15803d" />
                        <Text style={styles.badgeSuccessText}>
                          {pkg.placeCount} stops
                        </Text>
                      </View>
                      {pkg.places.slice(0, 2).map((p) => (
                        <View key={p.id} style={styles.badgeOutline}>
                          <Text style={styles.badgeOutlineText} numberOfLines={1}>
                            {p.name}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.pkgBottomRow}>
                      <Text style={styles.pkgPrice}>
                        {formatCurrency(pkg.price && pkg.price > 0 ? pkg.price : pkg.guide.cost)}
                        <Text style={styles.pkgPriceUnit}>
                          {pkg.pricingMode === "PLACE_BASED"
                            ? " · Place Based"
                            : pkg.pricingUnit === "PER_PERSON"
                            ? " per person"
                            : " per tour"}
                        </Text>
                      </Text>
                      <View style={styles.viewTourLink}>
                        <Text style={styles.viewTourLinkText}>View tour</Text>
                        <Ionicons name="arrow-forward" size={13} color={colors.primary} />
                      </View>
                    </View>
                  </Pressable>
                );
              })
            ) : guides.guides.length > 0 ? (
              guides.guides.slice(0, PREVIEW_COUNT).map((entry) => (
                <GuideCard
                  key={`${entry.type}-${entry.guide.id}`}
                  entry={entry}
                  onPress={() => openGuide(entry.type, entry.guide.id)}
                  saved={favorites.isSaved(entry.guide.id, "guide")}
                  onToggleSave={() =>
                    void favorites.toggle(entry.guide.id, "guide", {
                      name: entry.guide.full_name,
                      subtitle: entry.guide.tagline ?? undefined,
                      image: entry.guide.profile_pic ?? undefined,
                    })
                  }
                />
              ))
            ) : (
              <EmptyState
                title="No Tour Guide packages available"
                description="No Tour Guide packages published in this district yet."
                icon="people-outline"
              />
            )}
          </Section>
        </View>

        {/* 6. Hotels & Stays */}
        <View style={styles.section}>
          <Section
            title="Hotels & Stays"
            subtitle={`Hotels and Stays in ${cityName}`}
            action={
              hotels.length > PREVIEW_COUNT
                ? { label: "See all", onPress: () => router.push(`${base}/hotels` as any) }
                : undefined
            }
          >
            {hotels.length === 0 ? (
              <EmptyState
                title="No hotels listed"
                description={`Hotels in ${cityName} will show up here.`}
                icon="bed-outline"
              />
            ) : (
              hotels
                .slice(0, PREVIEW_COUNT)
                .map((hotel) => (
                  <HotelCard
                    key={hotel.id}
                    hotel={hotel}
                    onPress={() => router.push(`${base}/hotel-detail/${hotel.id}` as any)}
                  />
                ))
            )}
          </Section>
        </View>

        {/* 7. Restaurants */}
        <View style={styles.section}>
          <Section
            title="Restaurants"
            subtitle={`Restaurants in ${cityName}`}
            action={
              restaurants.length > PREVIEW_COUNT
                ? { label: "See all", onPress: () => router.push(`${base}/restaurants` as any) }
                : undefined
            }
          >
            {restaurants.length === 0 ? (
              <EmptyState
                title="No restaurants listed"
                description={`Restaurants in ${cityName} will show up here.`}
                icon="restaurant-outline"
              />
            ) : (
              restaurants
                .slice(0, PREVIEW_COUNT)
                .map((restaurant) => (
                  <RestaurantCard
                    key={restaurant.id}
                    restaurant={restaurant}
                    onPress={() =>
                      router.push(`${base}/restaurant-detail/${restaurant.id}` as any)
                    }
                  />
                ))
            )}
          </Section>
        </View>

        <View style={styles.footer}>
          <Button
            label="Report a listing"
            variant="ghost"
            size="sm"
            icon="flag-outline"
            onPress={() => router.push("/report" as any)}
          />
          {config?.contacts ? (
            <Text style={styles.footerText}>{config.contacts}</Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  heroWrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  heroCard: {
    minHeight: 260,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  heroContent: {
    padding: 20,
    paddingTop: 24,
    paddingBottom: 22,
    justifyContent: "space-between",
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FDE68A",
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 6,
    letterSpacing: -0.5,
  },
  heroDesc: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 6,
    lineHeight: 18,
  },
  heroActionsCol: {
    marginTop: 18,
    gap: 10,
  },
  heroSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  heroSearchText: {
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.8)",
  },
  heroChangeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#059669",
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 16,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  heroChangeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  section: { paddingHorizontal: spacing.xl, marginTop: spacing.xxl },
  serviceGrid: {
    gap: spacing.sm,
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  serviceIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceTextCol: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  serviceSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  emeraldBanner: {
    backgroundColor: "#059669",
    borderRadius: radii.xl,
    padding: spacing.lg,
    overflow: "hidden",
    position: "relative",
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  bannerContent: {
    zIndex: 2,
    maxWidth: "85%",
  },
  bannerEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.8)",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 4,
    lineHeight: 22,
  },
  bannerDesc: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 4,
    lineHeight: 17,
  },
  bannerBtn: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: radii.pill,
    paddingHorizontal: 16,
    paddingVertical: 9,
    marginTop: 14,
  },
  bannerBtnText: {
    color: "#047857",
    fontSize: 12.5,
    fontWeight: "700",
  },
  bannerWatermark: {
    position: "absolute",
    right: -10,
    bottom: -10,
    zIndex: 1,
  },
  packageCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  packageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pkgAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  pkgTitleWrap: {
    flex: 1,
  },
  pkgNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pkgName: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
  },
  pkgAgency: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  pkgCoverWrap: {
    height: 130,
    borderRadius: 12,
    overflow: "hidden",
  },
  pkgCover: {
    width: "100%",
    height: "100%",
  },
  pkgDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  pkgBadgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  badgeSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeSuccessText: {
    color: "#15803d",
    fontWeight: "600",
    fontSize: 11,
  },
  badgeOutline: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    maxWidth: 120,
  },
  badgeOutlineText: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  pkgBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 2,
  },
  pkgPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },
  pkgPriceUnit: {
    fontSize: 11,
    fontWeight: "400",
    color: colors.textMuted,
  },
  viewTourLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewTourLinkText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  footer: { alignItems: "center", marginTop: spacing.xxl },
  footerText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
