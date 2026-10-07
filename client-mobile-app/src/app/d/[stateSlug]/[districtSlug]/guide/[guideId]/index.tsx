/**
 * Place-specific guide profile.
 *
 * The backend has no "guide by id" endpoint, so the guide is resolved from the
 * district directory (which is aggregated from place details) and the specific
 * place they are listed at is identified from that same directory entry. A guide
 * id that is not in this district is reported as not found rather than guessed.
 */

import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, InfoRow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TagList } from "@/components/ui/badge";
import { RemoteImage } from "@/components/ui/remote-image";
import { RatingRow } from "@/components/rating-row";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { useDistrict } from "@/providers/district-provider";
import { useFavorites } from "@/hooks/use-favorites";
import { useQuery } from "@/hooks/use-query";
import { findGuideInDistrict } from "@/services/guides.service";
import { formatCurrency, initials } from "@/lib/utils/format";
import { colors, radii, spacing, typography } from "@/theme";

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
    { enabled: Boolean(district?.id && guideId) },
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

        <Text style={styles.name}>{guide.full_name}</Text>
        {guide.tagline ? <Text style={styles.tagline}>{guide.tagline}</Text> : null}

        <View style={styles.ratingRow}>
          <RatingRow rating={guide.rating ?? null} count={guide.review?.length ?? 0} />
        </View>
      </View>

      <Card>
        <InfoRow label="Works at" value={place.name} />
        {district?.name ? <InfoRow label="District" value={district.name} /> : null}
        <InfoRow label="Experience" value={`${guide.experience} years`} />
        {typeof guide.cost === "number" && guide.cost > 0 ? (
          <InfoRow label="Charge" value={`${formatCurrency(guide.cost)} per day`} />
        ) : null}
        {guide.phonenumber ? (
          <InfoRow
            label="Phone"
            value={guide.phonenumber}
          />
        ) : null}
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

      <View style={styles.actions}>
        <Button
          label="Book this guide"
          icon="calendar-outline"
          size="lg"
          fullWidth
          onPress={() => router.push(`${base}/guide/${guide.id}/book`)}
        />

        <Button
          label={saved ? "Saved" : "Save guide"}
          variant="secondary"
          icon={saved ? "heart" : "heart-outline"}
          fullWidth
          onPress={() =>
            void favorites.toggle(guide.id, "guide", {
              name: guide.full_name,
              subtitle: place.name,
              image: guide.profile_pic ?? undefined,
            })
          }
          style={styles.secondary}
        />

        {guide.phonenumber ? (
          <Button
            label="Call"
            variant="ghost"
            icon="call-outline"
            fullWidth
            onPress={() => void Linking.openURL(`tel:${guide.phonenumber}`)}
            style={styles.secondary}
          />
        ) : null}
      </View>

      <Text style={styles.note}>
        <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />{" "}
        Bookings are requests. The guide confirms them from their bookings page.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  header: { alignItems: "center", marginBottom: spacing.xl },
  avatar: { width: 96, height: 96 },
  name: { ...typography.title, color: colors.text, marginTop: spacing.md },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  ratingRow: { marginTop: spacing.sm },
  section: { marginTop: spacing.xxl },
  sectionTitle: { ...typography.heading, color: colors.text, marginBottom: spacing.sm },
  description: { ...typography.body, color: colors.textSecondary },
  actions: { marginTop: spacing.xxl },
  secondary: { marginTop: spacing.md },
  note: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});