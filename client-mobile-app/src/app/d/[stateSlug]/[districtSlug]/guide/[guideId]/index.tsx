/**
 * Place-specific guide profile.
 *
 * Faithfully mirrors `frontend/features/guides/ui/guide-profile.tsx`:
 *   - Gradient Hero card with avatar, verified badge, "Specific Guide" badge,
 *     credentials, rating, and cost per booking
 *   - "Guide for" place card
 *   - About section
 *   - Enquire Now section (Call & Email)
 *   - Customer Reviews & Ratings
 *   - "Book this guide" action
 */

import React from "react";
import {
  Alert,
  Image,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Touchable } from "@/components/ui/pressable";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { useDistrict } from "@/providers/district-provider";
import { useFavorites } from "@/hooks/use-favorites";
import { useQuery } from "@/hooks/use-query";
import { findGuideInDistrict } from "@/services/guides.service";
import { formatCurrency } from "@/lib/utils/currency";
import { colors, radius, spacing, typography } from "@/theme";
import { TopBar } from "@/components/shared/TopBar";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { DistrictBottomNav } from "@/components/shared/DistrictBottomNav";

export default function GuideProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { district } = useDistrict();
  const favorites = useFavorites();

  const params = useLocalSearchParams<{
    guideId?: string;
    stateSlug?: string;
    districtSlug?: string;
  }>();

  const guideId = params.guideId ?? "";
  const base = `/d/${params.stateSlug ?? ""}/${params.districtSlug ?? ""}`;

  const { data, loading } = useQuery(
    () => findGuideInDistrict(district!.id, guideId, "specific"),
    [guideId, district?.id],
    { enabled: Boolean(district?.id && guideId) }
  );

  if (loading) return <LoadingState label="Loading guide…" />;

  if (!data || data.type !== "specific") {
    return (
      <EmptyState
        title="Guide not found"
        description="This guide is not listed in this district."
        icon="person-outline"
        action={{ label: "Go back", onPress: () => router.back() }}
      />
    );
  }

  const { guide, place } = data;
  const saved = favorites.isSaved(guide.id, "guide");

  return (
    <View style={styles.root}>
      {/* 1. Universal TopBar matching Web */}
      <TopBar />

      {/* 2. Web ScreenHeader */}
      <ScreenHeader
        title={guide.full_name}
        subtitle={`Specific Guide · ${place.name}`}
        backHref={`${base}/guides`}
        action={
          <Touchable
            onPress={() =>
              void favorites.toggle(guide.id, "guide", {
                name: guide.full_name,
                subtitle: place.name,
                image: guide.profile_pic ?? undefined,
              })
            }
            style={styles.favBtn}
          >
            <Ionicons
              name={saved ? "bookmark" : "bookmark-outline"}
              size={22}
              color={saved ? colors.primary : colors.textMuted}
            />
          </Touchable>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Gradient Hero Card matching web */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeaderRow}>
            {guide.profile_pic ? (
              <Image source={{ uri: guide.profile_pic }} style={styles.heroAvatar} />
            ) : (
              <View style={styles.heroAvatarFallback}>
                <Text style={styles.heroAvatarInitial}>
                  {guide.full_name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.heroMeta}>
              <View style={styles.heroTitleRow}>
                <Text style={styles.heroName} numberOfLines={1}>
                  {guide.full_name}
                </Text>
                <Ionicons name="checkmark-circle" size={18} color="#6ee7b7" />
              </View>

              <View style={styles.heroBadgesRow}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>Specific Guide</Text>
                </View>
              </View>

              <Text style={styles.heroTagline} numberOfLines={2}>
                {guide.tagline ?? `Expert guide at ${place.name}`}
              </Text>
            </View>
          </View>

          {/* Hero Credentials */}
          <View style={styles.heroCredRow}>
            {typeof guide.rating === "number" && guide.rating > 0 ? (
              <View style={styles.heroCredItem}>
                <Ionicons name="star" size={13} color="#fcd34d" />
                <Text style={styles.heroCredTextBold}>{guide.rating.toFixed(1)}</Text>
              </View>
            ) : null}
            <View style={styles.heroCredItem}>
              <Ionicons name="ribbon-outline" size={13} color="#dbeafe" />
              <Text style={styles.heroCredText}>{guide.experience} yrs exp</Text>
            </View>
            <View style={styles.heroCredItem}>
              <Ionicons name="language-outline" size={13} color="#dbeafe" />
              <Text style={styles.heroCredText}>
                {guide.language?.join(", ") ?? "English"}
              </Text>
            </View>
          </View>

          {/* Hero Bottom: Price & Book / Report buttons */}
          <View style={styles.heroBottomRow}>
            <View>
              <Text style={styles.heroPriceText}>{formatCurrency(guide.cost)}</Text>
              <Text style={styles.heroPriceSub}>per booking</Text>
            </View>

            <View style={styles.heroActionBtns}>
              <Touchable
                onPress={() => router.push(`${base}/guide/${guide.id}/book`)}
                style={styles.heroBookBtn}
              >
                <Text style={styles.heroBookBtnText}>Book this guide</Text>
              </Touchable>
              <Touchable
                onPress={() =>
                  router.push({
                    pathname: "/report",
                    params: { type: "guide", id: guide.id },
                  })
                }
                style={styles.heroReportBtn}
              >
                <Ionicons name="flag-outline" size={14} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.heroReportBtnText}>Report</Text>
              </Touchable>
            </View>
          </View>
        </View>

        {/* Guide for Place */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Guide for</Text>
          <Text style={styles.sectionSubtitle}>
            This guide specialises exclusively at this place
          </Text>

          <Touchable
            onPress={() => router.push(`${base}/place/${place.id}`)}
            style={styles.mediaRowCard}
          >
            <View style={styles.mediaRowLetterBox}>
              <Text style={styles.mediaRowLetter}>
                {place.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.mediaRowMeta}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="location-sharp" size={13} color={colors.primary} />
                <Text style={styles.mediaRowTitle} numberOfLines={1}>
                  {place.name.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.mediaRowSubtitle}>
                {place.districtName} · {params.districtSlug ?? "district"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Touchable>
        </View>

        {/* About Section */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <Text style={styles.aboutText}>
              {guide.description ?? "A local expert guide ready to make your trip memorable."}
            </Text>
          </View>
        </View>

        {/* Enquire Now matching Web */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionTitle}>Enquire now</Text>
          <Text style={styles.sectionSubtitle}>Reach the guide directly</Text>

          <View style={styles.enquireGrid3}>
            <Touchable
              onPress={() => {
                if (guide.email) Linking.openURL(`mailto:${guide.email}`);
              }}
              style={styles.enquireTile}
            >
              <View style={[styles.enquireIconCircle, { backgroundColor: "rgba(37, 99, 235, 0.1)" }]}>
                <Ionicons name="mail" size={18} color="#2563eb" />
              </View>
              <Text style={styles.enquireTileLabel}>Email</Text>
            </Touchable>

            <Touchable
              onPress={() => {
                const num = (guide.phonenumber || "").replace(/\D/g, "");
                if (num) Linking.openURL(`https://wa.me/${num.length === 10 ? `91${num}` : num}`);
              }}
              style={styles.enquireTile}
            >
              <View style={[styles.enquireIconCircle, { backgroundColor: "rgba(16, 185, 129, 0.12)" }]}>
                <Ionicons name="chatbubble-ellipses" size={18} color="#059669" />
              </View>
              <Text style={styles.enquireTileLabel}>WhatsApp</Text>
            </Touchable>

            <Touchable
              onPress={() => {
                if (guide.phonenumber) Linking.openURL(`tel:${guide.phonenumber}`);
              }}
              style={styles.enquireTile}
            >
              <View style={[styles.enquireIconCircle, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
                <Ionicons name="call" size={18} color="#d97706" />
              </View>
              <Text style={styles.enquireTileLabel}>Call</Text>
            </Touchable>
          </View>
        </View>

        {/* Ratings & reviews */}
        <View style={styles.sectionWrap}>
          <View style={styles.reviewsHeaderRow}>
            <Text style={styles.sectionTitle}>Ratings & reviews</Text>
            <Touchable
              onPress={() => {
                Alert.alert("Write Review", "Sign in to leave a review for this guide.");
              }}
              style={styles.writeReviewBtn}
            >
              <Text style={styles.writeReviewBtnText}>Write Review</Text>
            </Touchable>
          </View>

          {/* Score Summary */}
          <View style={styles.ratingScoreRow}>
            <View style={styles.ratingScoreBox}>
              <Text style={styles.ratingScoreNum}>
                {typeof guide.rating === "number" && guide.rating > 0
                  ? guide.rating.toFixed(1)
                  : "—"}
              </Text>
              <Text style={styles.ratingScoreCount}>
                {guide.rating ? (guide.review?.length ?? 1) : 0} ratings
              </Text>
            </View>
            <Text style={styles.ratingScoreDesc}>
              Ratings are gathered as a single overall score. Once ratings are added per category, the distribution will appear here.
            </Text>
          </View>

          <Text style={styles.writtenReviewsSubheading}>WRITTEN REVIEWS</Text>

          {guide.review && guide.review.length > 0 ? (
            <View style={styles.stack}>
              {guide.review.map((rev, idx) => (
                <View key={idx} style={styles.card}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.starsRow}>
                      {[...Array(5)].map((_, i) => (
                        <Ionicons key={i} name="star" size={13} color="#f59e0b" />
                      ))}
                    </View>
                    <Text style={styles.verifiedText}>Verified Traveller</Text>
                  </View>
                  <Text style={styles.reviewText}>{rev}</Text>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyReviewsCard}>
              <Text style={styles.emptyReviewsText}>
                No written reviews yet. Be the first to share your experience!
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* 3. Universal BottomNavigation matching Web */}
      <DistrictBottomNav
        activeTab="guides"
        stateSlug={params.stateSlug}
        districtSlug={params.districtSlug}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  topHeaderTitleWrap: {
    flex: 1,
  },
  topHeaderTitle: {
    ...typography.heading,
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  topHeaderSubtitle: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  favBtn: {
    padding: spacing.xs,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  heroCard: {
    backgroundColor: "#1e3a8a",
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...Platform.select({
      ios: { shadowColor: "#1e3a8a", shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 4 },
    }),
  },
  heroHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  heroAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  heroAvatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  heroAvatarInitial: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 24,
  },
  heroMeta: {
    flex: 1,
    gap: 4,
  },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroName: {
    ...typography.title,
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },
  heroBadgesRow: {
    flexDirection: "row",
    gap: 6,
  },
  heroBadge: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  heroBadgeText: {
    ...typography.caption,
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 11,
  },
  heroTagline: {
    ...typography.caption,
    color: "#dbeafe",
    fontSize: 12,
  },
  heroCredRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.2)",
    paddingTop: spacing.sm,
  },
  heroCredItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  heroCredTextBold: {
    ...typography.caption,
    color: "#fcd34d",
    fontWeight: "700",
    fontSize: 12,
  },
  heroCredText: {
    ...typography.caption,
    color: "#e0e7ff",
    fontSize: 12,
  },
  heroBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.2)",
    paddingTop: spacing.sm,
  },
  heroPriceText: {
    ...typography.title,
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
  },
  heroPriceSub: {
    ...typography.caption,
    color: "#bfdbfe",
    fontSize: 11,
  },
  heroActionBtns: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroBookBtn: {
    backgroundColor: "#059669",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: radius.md,
  },
  heroBookBtnText: {
    ...typography.bodyStrong,
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  heroReportBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  heroReportBtnText: {
    ...typography.bodyStrong,
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 13,
  },
  mediaRowCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  mediaRowLetterBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#1e40af",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaRowLetter: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ffffff",
  },
  mediaRowMeta: {
    flex: 1,
    gap: 2,
  },
  mediaRowTitle: {
    ...typography.bodyStrong,
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.text,
  },
  mediaRowSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
  enquireGrid3: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  enquireTile: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingVertical: 14,
  },
  enquireIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  enquireTileLabel: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.text,
    fontSize: 12,
  },
  reviewsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  writeReviewBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: colors.surface,
  },
  writeReviewBtnText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.text,
    fontSize: 12,
  },
  ratingScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: 4,
  },
  ratingScoreBox: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  ratingScoreNum: {
    ...typography.title,
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
  },
  ratingScoreCount: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textMuted,
  },
  ratingScoreDesc: {
    ...typography.caption,
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  writtenReviewsSubheading: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  emptyReviewsCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.01)",
  },
  emptyReviewsText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12.5,
    textAlign: "center",
  },
  sectionWrap: {
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  placeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  placeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(37, 99, 235, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  placeMeta: {
    flex: 1,
  },
  placeName: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.text,
  },
  placeDistrict: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  aboutText: {
    ...typography.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  stack: {
    gap: spacing.sm,
  },
  enquireRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  enquireBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  enquireBtnText: {
    ...typography.bodyStrong,
    color: colors.primary,
    fontSize: 13,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
  },
  verifiedText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  reviewText: {
    ...typography.body,
    fontSize: 12.5,
    color: colors.text,
    lineHeight: 18,
  },
});
