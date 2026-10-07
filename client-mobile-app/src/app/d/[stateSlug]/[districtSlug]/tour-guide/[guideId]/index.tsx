/**
 * Tour Guide profile.
 *
 * A Tour Guide (`common_guide` in the backend) can lead tours across several
 * places and can own packages. Both are resolved from the district directory,
 * because the backend exposes no guide-by-id endpoint — only a place detail that
 * lists the guides published for that place.
 *
 * Every place and package the district can vouch for is listed, and a package
 * whose full size exceeds what this district can show says so.
 */

import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, InfoRow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TagList } from "@/components/ui/badge";
import { RemoteImage } from "@/components/ui/remote-image";
import { RatingRow } from "@/components/rating-row";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { Touchable } from "@/components/ui/pressable";
import { useDistrict } from "@/providers/district-provider";
import { useFavorites } from "@/hooks/use-favorites";
import { useQuery } from "@/hooks/use-query";
import { findGuideInDistrict } from "@/services/guides.service";
import { formatCurrency, initials } from "@/lib/utils/format";
import { colors, radii, spacing, TOUR_GUIDE_LABEL, typography } from "@/theme";

export default function TourGuideProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { district } = useDistrict();
  const favorites = useFavorites();

  const params = useLocalSearchParams<{ guideId?: string; stateSlug?: string; districtSlug?: string }>();
  const guideId = params.guideId ?? "";
  const base = `/d/${params.stateSlug ?? ""}/${params.districtSlug ?? ""}`;

  const { data, loading } = useQuery(
    () => findGuideInDistrict(district!.id, guideId, "common"),
    [guideId, district?.id],
    { enabled: Boolean(district?.id && guideId) },
  );

  if (loading) return <LoadingState label={`Loading ${TOUR_GUIDE_LABEL.toLowerCase()}…`} />;

  if (!data || data.type !== "common") {
    return (
      <EmptyState
        title={`${TOUR_GUIDE_LABEL} not found`}
        description={`This ${TOUR_GUIDE_LABEL.toLowerCase()} is not listed in this district.`}
        icon="people-outline"
        action={{ label: "Go back", onPress: () => router.back() }}
      />
    );
  }

  const { guide, places, packages } = data;
  const saved = favorites.isSaved(guide.id, "guide");

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
    >
      <View style={styles.header}>
        <RemoteImage
          uri={guide.profile_pic ?? null}
          style={styles.avatar}
          fallbackLabel={initials(guide.full_name)}
          accessibilityLabel={`${guide.full_name}'s photo`}
          radius={radii.pill}
        />

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Ionicons name="walk-outline" size={13} color={colors.primary} />
            <Text style={styles.badgeText}>{TOUR_GUIDE_LABEL}</Text>
          </View>
        </View>

        <Text style={styles.name}>{guide.full_name}</Text>
        {guide.tagline ? <Text style={styles.tagline}>{guide.tagline}</Text> : null}

        <View style={styles.ratingRow}>
          <RatingRow rating={guide.rating ?? null} count={guide.review?.length ?? 0} />
        </View>
      </View>

      <Card>
        <InfoRow label="Experience" value={`${guide.experience} years`} />
        {guide.agencyName ? <InfoRow label="Agency" value={guide.agencyName} /> : null}
        {typeof guide.cost === "number" && guide.cost > 0 ? (
          <InfoRow label="From" value={`${formatCurrency(guide.cost)} per day`} />
        ) : null}
        <InfoRow label="District" value={district?.name ?? "—"} />
      </Card>

      {guide.language?.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Languages</Text>
          <TagList tags={guide.language} limit={12} />
        </View>
      ) : null}

      {guide.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Text style={styles.description}>{guide.description}</Text>
        </View>
      ) : null}

      {/* Packages */}
      {packages.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tour packages</Text>

          {packages.map((pkg) => (
            <Touchable
              key={pkg.id}
              onPress={() => router.push(`${base}/tour-package/${pkg.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`View package ${pkg.name}`}
              style={styles.listRow}
            >
              <Ionicons name="map-outline" size={20} color={colors.primary} />
              <View style={styles.listBody}>
                <Text style={styles.listTitle}>{pkg.name}</Text>
                <Text style={styles.listSubtitle}>
                  {pkg.places.length} of {pkg.placeCount}{" "}
                  {pkg.placeCount === 1 ? "place" : "places"} in this district
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Touchable>
          ))}
        </View>
      ) : null}

      {/* Places */}
      {places.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Places covered</Text>

          {places.map((place) => (
            <Touchable
              key={place.id}
              onPress={() => router.push(`${base}/place/${place.id}`)}
              accessibilityRole="button"
              accessibilityLabel={`View ${place.name}`}
              style={styles.listRow}
            >
              <RemoteImage
                uri={place.images?.[0] ?? null}
                style={styles.placeThumb}
                fallbackLabel={place.name}
              />
              <View style={styles.listBody}>
                <Text style={styles.listTitle}>{place.name}</Text>
                {place.category ? (
                  <Text style={styles.listSubtitle}>{place.category}</Text>
                ) : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Touchable>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          label="Book a tour"
          icon="calendar-outline"
          size="lg"
          fullWidth
          onPress={() => router.push(`${base}/tour-guide/${guide.id}/book`)}
        />

        <Button
          label={saved ? "Saved" : `Save ${TOUR_GUIDE_LABEL.toLowerCase()}`}
          variant="secondary"
          icon={saved ? "heart" : "heart-outline"}
          fullWidth
          onPress={() =>
            void favorites.toggle(guide.id, "guide", {
              name: guide.full_name,
              subtitle: TOUR_GUIDE_LABEL,
              image: guide.profile_pic ?? undefined,
            })
          }
          style={styles.secondary}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  header: { alignItems: "center", marginBottom: spacing.xl },
  avatar: { width: 96, height: 96 },
  badgeRow: { marginTop: spacing.md },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  badgeText: { ...typography.caption, color: colors.primary },
  name: { ...typography.title, color: colors.text, marginTop: spacing.sm },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  ratingRow: { marginTop: spacing.sm },
  section: { marginTop: spacing.xxl },
  sectionTitle: { ...typography.heading, color: colors.text, marginBottom: spacing.md },
  description: { ...typography.body, color: colors.textSecondary },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  placeThumb: { width: 44, height: 44 },
  listBody: { flex: 1 },
  listTitle: { ...typography.bodyStrong, color: colors.text },
  listSubtitle: { ...typography.small, color: colors.textMuted },
  actions: { marginTop: spacing.xxl },
  secondary: { marginTop: spacing.md },
});