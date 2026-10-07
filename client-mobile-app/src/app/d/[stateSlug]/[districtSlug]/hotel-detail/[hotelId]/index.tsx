/**
 * Hotel detail.
 *
 * Fetches the hotel on its own rather than reading the district's list copy, so
 * the screen is correct even when reached from a deep link or a saved route where
 * the provider has not loaded yet.
 *
 * `booking_enabled` is authoritative: when the admin has switched booking off the
 * screen says so instead of offering a button that the backend would reject.
 */

import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, InfoRow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RemoteImage } from "@/components/ui/remote-image";
import { RatingRow } from "@/components/rating-row";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useDistrict } from "@/providers/district-provider";
import { useQuery } from "@/hooks/use-query";
import { getHotelById } from "@/services/places.service";
import { buildDirectionsUrl, buildOpenUrl, formatCoordinates, validPoint } from "@/lib/utils/geo";
import { firstImage, formatCurrency, formatDate } from "@/lib/utils/format";
import { colors, radii, spacing, typography } from "@/theme";

export default function HotelDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { district } = useDistrict();

  const params = useLocalSearchParams<{
    hotelId?: string;
    stateSlug?: string;
    districtSlug?: string;
  }>();

  const hotelId = params.hotelId ?? "";
  const base = `/d/${params.stateSlug ?? ""}/${params.districtSlug ?? ""}`;

  const { data, loading, error, reload } = useQuery(
    () => getHotelById(district!.id, hotelId),
    [hotelId, district?.id],
    { enabled: Boolean(district?.id && hotelId) },
  );

  if (loading) return <LoadingState label="Loading hotel…" />;
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;

  const images = Array.isArray(data.images) ? data.images.filter(Boolean) : [];
  const cover = images[0] ?? firstImage(images);
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
          {data.district?.name ? <Badge label={data.district.name} tone="neutral" /> : null}
          {data.booking_enabled ? (
            <Badge label="Booking available" tone="success" />
          ) : (
            <Badge label="Booking unavailable" tone="warning" />
          )}
        </View>

        <RatingRow rating={data.rating ?? null} count={data.review?.length ?? 0} />

        <Text style={styles.price}>
          {formatCurrency(data.cost_per_night) ?? "Price on request"}
          {data.cost_per_night ? <Text style={styles.priceUnit}> per night</Text> : null}
        </Text>

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
            label="Book a stay"
            icon="bed-outline"
            size="lg"
            fullWidth
            onPress={() => router.push(`${base}/hotel-detail/${data.id}/book`)}
          />
        ) : (
          <Text style={styles.disabledNote}>
            This hotel is not taking bookings right now.
          </Text>
        )}

        <View style={styles.secondaryRow}>
          {hasLocation ? (
            <>
              <Button
                label="Directions"
                variant="secondary"
                icon="navigate-outline"
                style={styles.secondary}
                onPress={() =>
                  void Linking.openURL(buildDirectionsUrl(data))
                }
              />
              <Button
                label="Map"
                variant="ghost"
                icon="map-outline"
                style={styles.secondary}
                onPress={() =>
                  void Linking.openURL(buildOpenUrl(data, data.name))
                }
              />
            </>
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
  hero: { height: 240, backgroundColor: colors.placeholder, borderRadius: 0 },
  heroImage: { borderRadius: 0 },
  body: { padding: spacing.xl },
  name: { ...typography.title, color: colors.text },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.sm },
  price: { ...typography.heading, color: colors.successDark, marginTop: spacing.lg },
  priceUnit: { ...typography.small, color: colors.textMuted },
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