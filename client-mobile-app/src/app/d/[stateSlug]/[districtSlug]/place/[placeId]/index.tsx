/**
 * Place detail.
 *
 * Fetches `GET /:districtId/services/api/places/:placeId`, which additionally
 * carries the place's specific guides, its Tour Guides and its packages. Those
 * relations are rendered here rather than fetched separately, because the backend
 * offers no way to list a place's guides on their own.
 *
 * Images come from the place's own `images` array; if it is empty the page still
 * renders every other section rather than collapsing.
 */

import { useState } from "react";
import {
  ImageBackground,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, DetailRow, InfoRow, Section } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RemoteImage } from "@/components/ui/remote-image";
import { Touchable } from "@/components/ui/pressable";
import { RatingInput, RatingRow } from "@/components/rating-row";
import { TextField } from "@/components/ui/text-field";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { useFavorites } from "@/hooks/use-favorites";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { useDistrict } from "@/providers/district-provider";
import { getPlaceById } from "@/services/places.service";
import { createReview } from "@/services/reviews.service";
import { buildDirectionsUrl, buildOpenUrl, formatCoordinates, validPoint } from "@/lib/utils/geo";
import { formatCurrency, firstImage, formatDate } from "@/lib/utils/format";
import { toUserMessage } from "@/lib/api/client";
import { colors, radii, shadows, spacing, TOUR_GUIDE_LABEL, typography } from "@/theme";
import type { PlaceDetail } from "@/types/api";


export default function PlaceDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const favorites = useFavorites();
  const { profile, status } = useAuth();
  const { district } = useDistrict();

  const params = useLocalSearchParams<{
    placeId?: string;
    stateSlug?: string;
    districtSlug?: string;
  }>();

  const placeId = params.placeId ?? "";
  const base = `/d/${params.stateSlug ?? ""}/${params.districtSlug ?? ""}`;

  const { data, loading, error, reload } = useQuery<PlaceDetail>(
    () => getPlaceById(district!.id, placeId),
    [placeId, district?.id],
    { enabled: Boolean(district?.id && placeId) },
  );

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <LoadingState label="Loading place…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const images = Array.isArray(data.images) ? data.images.filter(Boolean) : [];
  const hasLocation = validPoint(data);
  // Bands are optional and absent on records created before they existed, so the
  // flat `entryfee` is the fallback rather than an empty list meaning "free".
  const pricingBands = Array.isArray(data.pricing) ? data.pricing : [];

  const submitReview = async () => {
    if (status !== "signed-in") {
      router.push("/login");
      return;
    }
    if (rating < 1 || !reviewText.trim()) {
      toast.show("Add a rating and a few words first", "info");
      return;
    }

    setSubmitting(true);
    try {
      await createReview({
        targetId: data.id,
        targetType: "place",
        rating,
        text: reviewText.trim(),
        reviewer: profile?.name ?? "Traveller",
      });
      setReviewText("");
      setRating(0);
      toast.show("Thanks for your review", "success");
    } catch (cause) {
      toast.show(toUserMessage(cause), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}>
        {/* Gallery */}
        <View style={styles.gallery}>
          {images.length > 0 ? (
            <ImageBackground
              source={{ uri: images[0] }}
              style={styles.galleryImage}
              imageStyle={styles.galleryImageStyle}
            >
              <View style={styles.galleryScrim} />
            </ImageBackground>
          ) : (
            <View style={styles.galleryFallback}>
              <RemoteImage
                uri={null}
                style={StyleSheet.absoluteFill}
                fallbackLabel={data.name}
                radius={0}
              />
            </View>
          )}

          <Touchable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={10}
            style={[styles.backButton, { top: insets.top + spacing.sm }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Touchable>

          <Touchable
            onPress={() =>
              void favorites.toggle(data.id, "place", {
                name: data.name,
                subtitle: data.category,
                image: firstImage(data.images) ?? undefined,
                districtSlug: params.districtSlug,
              })
            }
            accessibilityRole="button"
            accessibilityLabel={
              favorites.isSaved(data.id, "place") ? "Remove from saved" : "Save this place"
            }
            accessibilityState={{ selected: favorites.isSaved(data.id, "place") }}
            style={[styles.heartButton, { top: insets.top + spacing.sm }]}
          >
            <Ionicons
              name={favorites.isSaved(data.id, "place") ? "heart" : "heart-outline"}
              size={22}
              color={favorites.isSaved(data.id, "place") ? colors.danger : colors.text}
            />
          </Touchable>

          {images.length > 1 ? (
            <Text style={[styles.imageCount, { bottom: spacing.md }]}>
              1 / {images.length}
            </Text>
          ) : null}
        </View>

        {/* Title block */}
        <View style={styles.body}>
          {data.category ? <Badge label={data.category} tone="primary" /> : null}

          <Text style={styles.name}>{data.name}</Text>

          <View style={styles.metaRow}>
            <RatingRow rating={null} count={0} showCount={false} />
            {district?.name ? (
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                <Text style={styles.metaText}>
                  {data.district?.name ?? district.name}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Entry pricing */}
          <Card style={styles.pricingCard}>
            <Text style={styles.pricingTitle}>Entry</Text>

            {pricingBands.length > 0 ? (
              pricingBands.map((band) => (
                <InfoRow
                  key={band.id}
                  label={`${band.ageGroup} · ${band.visitor === "FOREIGN" ? "Foreign" : "Domestic"}`}
                  value={formatCurrency(band.amount) ?? "—"}
                />
              ))
            ) : data.entryfee === null ? (
              <Text style={styles.freeEntry}>Free entry</Text>
            ) : (
              <InfoRow label="Entry fee" value={formatCurrency(data.entryfee) ?? "—"} />
            )}
          </Card>

          {/* Description */}
          {data.description ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.description}>{data.description}</Text>
            </View>
          ) : null}

          {/* Location */}
          {hasLocation ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>
              <Card>
                <DetailRow
                  icon="navigate-outline"
                  label="Coordinates"
                  value={formatCoordinates(data) ?? "—"}
                />
                <Button
                  label="Open in Maps"
                  variant="secondary"
                  size="sm"
                  icon="map-outline"
                  onPress={() => void Linking.openURL(buildOpenUrl(data, data.name))}
                  style={styles.inlineAction}
                />
                <Button
                  label="Get directions"
                  variant="secondary"
                  size="sm"
                  icon="navigate"
                  onPress={() => void Linking.openURL(buildDirectionsUrl(data))}
                  style={styles.inlineAction}
                />
                <Button
                  label="Transport options"
                  variant="ghost"
                  size="sm"
                  icon="car-outline"
                  onPress={() => router.push(`${base}/transport`)}
                  style={styles.inlineAction}
                />
              </Card>
            </View>
          ) : null}

          {/* Specific guides */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Guides for this place</Text>

            {(data.specificguide ?? []).length === 0 ? (
              <Text style={styles.emptyLine}>No guides are listed for this place.</Text>
            ) : (
              (data.specificguide ?? [])
                .filter((guide) => !guide.isReported)
                .map((guide) => (
                  <Touchable
                    key={guide.id}
                    onPress={() => router.push(`${base}/guide/${guide.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${guide.full_name}`}
                    style={styles.miniRow}
                  >
                    <RemoteImage
                      uri={guide.profile_pic ?? null}
                      style={styles.miniAvatar}
                      fallbackLabel={guide.full_name}
                      radius={radii.pill}
                    />
                    <View style={styles.miniBody}>
                      <Text style={styles.miniName}>{guide.full_name}</Text>
                      <Text style={styles.miniSubtitle} numberOfLines={1}>
                        {guide.tagline ?? "Local guide"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </Touchable>
                ))
            )}
          </View>

          {/* Tour guides + packages */}
          {(data.commonGuidePlaces ?? []).length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{TOUR_GUIDE_LABEL}s</Text>

              {(data.commonGuidePlaces ?? [])
                .filter((link): link is typeof link & { commonGuide: NonNullable<typeof link.commonGuide> } => Boolean(link.commonGuide))
                .map(({ id, commonGuide }) => (
                  <Touchable
                    key={id}
                    onPress={() => router.push(`${base}/tour-guide/${commonGuide.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${commonGuide.full_name}`}
                    style={styles.miniRow}
                  >
                    <RemoteImage
                      uri={commonGuide.profile_pic ?? null}
                      style={styles.miniAvatar}
                      fallbackLabel={commonGuide.full_name}
                      radius={radii.pill}
                    />
                    <View style={styles.miniBody}>
                      <Text style={styles.miniName}>{commonGuide.full_name}</Text>
                      <Text style={styles.miniSubtitle} numberOfLines={1}>
                        {commonGuide.tagline ?? TOUR_GUIDE_LABEL}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </Touchable>
                ))}
            </View>
          ) : null}

          {(data.commonGuidePackages ?? []).length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tour packages</Text>

              {(data.commonGuidePackages ?? []).map((pkg) => (
                <Touchable
                  key={pkg.id}
                  onPress={() => router.push(`${base}/tour-package/${pkg.id}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`View package ${pkg.name}`}
                  style={styles.miniRow}
                >
                  <Ionicons name="map-outline" size={22} color={colors.primary} />
                  <View style={styles.miniBody}>
                    <Text style={styles.miniName}>{pkg.name}</Text>
                    <Text style={styles.miniSubtitle}>
                      {pkg.placeCount} {pkg.placeCount === 1 ? "place" : "places"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Touchable>
              ))}
            </View>
          ) : null}

          {/* Review */}
          <View style={styles.section}>
            <Section title="Leave a review" subtitle="Stored on this device" />

            <Card>
              <Text style={styles.reviewPrompt}>Your rating</Text>
              <RatingInput value={rating} onChange={setRating} />

              <TextField
                label="Your review"
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                placeholder="What did you think?"
              />

              <Button
                label="Post review"
                onPress={() => void submitReview()}
                loading={submitting}
                fullWidth
              />
            </Card>
          </View>

          <Text style={styles.updated}>Updated {formatDate(data.updatedAt)}</Text>
        </View>
      </ScrollView>

      {/* Sticky action bar */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <Button
          label="Save"
          variant="secondary"
          icon={favorites.isSaved(data.id, "place") ? "heart" : "heart-outline"}
          onPress={() =>
            void favorites.toggle(data.id, "place", {
              name: data.name,
              subtitle: data.category,
              image: firstImage(data.images) ?? undefined,
              districtSlug: params.districtSlug,
            })
          }
          style={styles.actionBarItem}
        />
        <Button
          label="How to get there"
          icon="navigate-outline"
          onPress={() => router.push(`${base}/place/${data.id}/go-to`)}
          style={styles.actionBarItem}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  gallery: { height: 300, backgroundColor: colors.placeholder },
  galleryImage: { flex: 1 },
  galleryImageStyle: { borderRadius: 0 },
  galleryScrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(9,16,34,0.2)" },
  galleryFallback: { flex: 1 },
  backButton: {
    position: "absolute",
    left: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  heartButton: {
    position: "absolute",
    right: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  imageCount: {
    position: "absolute",
    alignSelf: "center",
    ...typography.caption,
    color: colors.textInverse,
    backgroundColor: "rgba(9,16,34,0.6)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  body: { padding: spacing.xl },
  name: { ...typography.title, color: colors.text, marginTop: spacing.sm },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { ...typography.small, color: colors.textMuted },
  pricingCard: { marginBottom: spacing.xl },
  pricingTitle: { ...typography.subheading, color: colors.text, marginBottom: spacing.sm },
  freeEntry: { ...typography.heading, color: colors.successDark },
  section: { marginTop: spacing.xxl },
  sectionTitle: { ...typography.heading, color: colors.text, marginBottom: spacing.md },
  description: { ...typography.body, color: colors.textSecondary },
  inlineAction: { marginTop: spacing.sm },
  emptyLine: { ...typography.small, color: colors.textMuted },
  miniRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  miniAvatar: { width: 40, height: 40 },
  miniBody: { flex: 1 },
  miniName: { ...typography.bodyStrong, color: colors.text },
  miniSubtitle: { ...typography.small, color: colors.textMuted },
  reviewPrompt: { ...typography.smallStrong, color: colors.textSecondary, marginBottom: spacing.sm },
  updated: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xxl,
    textAlign: "center",
  },
  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  actionBarItem: { flex: 1 },
});