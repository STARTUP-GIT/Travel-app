/**
 * Restaurant detail.
 *
 * Mirrors the hotel detail screen. `booking_enabled` decides whether a
 * reservation is offered, and the food category is labelled from the backend enum
 * rather than printed raw.
 */

import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, InfoRow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, TagList } from "@/components/ui/badge";
import { RemoteImage } from "@/components/ui/remote-image";
import { RatingRow } from "@/components/rating-row";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useDistrict } from "@/providers/district-provider";
import { useQuery } from "@/hooks/use-query";
import { getRestaurantById } from "@/services/places.service";
import { buildDirectionsUrl, formatCoordinates, validPoint } from "@/lib/utils/geo";
import { firstImage, formatDate } from "@/lib/utils/format";
import { colors, foodCategoryLabel, radii, spacing, typography } from "@/theme";

export default function RestaurantDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { district } = useDistrict();

  const params = useLocalSearchParams<{
    restaurantId?: string;
    stateSlug?: string;
    districtSlug?: string;
  }>();

  const restaurantId = params.restaurantId ?? "";
  const base = `/d/${params.stateSlug ?? ""}/${params.districtSlug ?? ""}`;

  const { data, loading, error, reload } = useQuery(
    () => getRestaurantById(district!.id, restaurantId),
    [restaurantId, district?.id],
    { enabled: Boolean(district?.id && restaurantId) },
  );

  if (loading) return <LoadingState label="Loading restaurant…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const images = Array.isArray(data.images) ? data.images.filter(Boolean) : [];
  const cover = data.profile_logo || firstImage(images);
  const hasLocation = validPoint(data);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: insets.bottom + 96 }}
    >
      <RemoteImage
        uri={cover}
        style={styles.hero}
        imageStyle={styles.heroImage}
        contentFit="cover"
        fallbackLabel={data.name}
        accessibilityLabel={`Photo of ${data.name}`}
      />

      <View style={styles.body}>
        <Text style={styles.name}>{data.name}</Text>

        <View style={styles.tagRow}>
          <Badge label={foodCategoryLabel(data.food_category)} tone="primary" />
          {data.district?.name ? <Badge label={data.district.name} tone="neutral" /> : null}
          {data.booking_enabled ? (
            <Badge label="Reservations open" tone="success" />
          ) : (
            <Badge label="Reservations closed" tone="warning" />
          )}
        </View>

        <RatingRow rating={data.rating ?? null} count={data.review?.length ?? 0} />

        <Card style={styles.card}>
          <InfoRow label="Address" value={data.address || "—"} />
          {data.phone_number ? <InfoRow label="Phone" value={data.phone_number} /> : null}
          {data.email ? <InfoRow label="Email" value={data.email} /> : null}
          {hasLocation ? (
            <InfoRow label="Coordinates" value={formatCoordinates(data) ?? "—"} />
          ) : null}
        </Card>

        {data.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{data.description}</Text>
          </View>
        ) : null}

        {data.menu?.length ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Menu</Text>
            <TagList tags={data.menu} limit={12} />
          </View>
        ) : null}

        {images.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.gallery}
          >
            {images.map((uri) => (
              <RemoteImage
                key={uri}
                uri={uri}
                style={styles.thumb}
                radius={radii.md}
                accessibilityLabel={`Photo of ${data.name}`}
              />
            ))}
          </ScrollView>
        ) : null}

        <Text style={styles.updated}>Updated {formatDate(data.updatedAt)}</Text>
      </View>

      <View style={[styles.actionBar, { paddingBottom: insets.bottom + spacing.md }]}>
        {data.booking_enabled ? (
          <Button
            label="Reserve a table"
            icon="restaurant-outline"
            size="lg"
            fullWidth
            onPress={() => router.push(`${base}/restaurant-detail/${data.id}/reserve`)}
          />
        ) : (
          <Text style={styles.disabledNote}>
            This restaurant is not taking reservations right now.
          </Text>
        )}

        <View style={styles.secondaryRow}>
          {hasLocation ? (
            <Button
              label="Directions"
              variant="secondary"
              icon="navigate-outline"
              style={styles.secondary}
              onPress={() => void Linking.openURL(buildDirectionsUrl(data))}
            />
          ) : null}

          {data.phone_number ? (
            <Button
              label="Call"
              variant="ghost"
              icon="call-outline"
              style={styles.secondary}
              onPress={() => void Linking.openURL(`tel:${data.phone_number}`)}
            />
          ) : null}

          {data.website ? (
            <Button
              label="Website"
              variant="ghost"
              icon="globe-outline"
              style={styles.secondary}
              onPress={() =>
                void Linking.openURL(
                  /^https?:\/\//i.test(data.website ?? "")
                    ? (data.website as string)
                    : `https://${data.website}`,
                )
              }
            />
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  hero: { height: 240, backgroundColor: colors.placeholder },
  heroImage: { borderRadius: 0 },
  body: { padding: spacing.xl },
  name: { ...typography.title, color: colors.text },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  card: { marginTop: spacing.xl },
  section: { marginTop: spacing.xxl },
  sectionTitle: { ...typography.heading, color: colors.text, marginBottom: spacing.sm },
  description: { ...typography.body, color: colors.textSecondary },
  gallery: { gap: spacing.md, marginTop: spacing.xxl },
  thumb: { width: 150, height: 110 },
  updated: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xl },
  actionBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  secondaryRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  secondary: { flex: 1 },
  disabledNote: {
    ...typography.small,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
});