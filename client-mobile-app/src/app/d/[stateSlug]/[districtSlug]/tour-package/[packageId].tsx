/**
 * Tour package detail.
 *
 * Lists every place this district can show for the package and states the
 * package's real size, so a multi-district package is never presented as though it
 * only covered the places visible here.
 */

import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, InfoRow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RemoteImage } from "@/components/ui/remote-image";
import { Touchable } from "@/components/ui/pressable";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { useDistrict } from "@/providers/district-provider";
import { useQuery } from "@/hooks/use-query";
import { listPackagesForDistrict } from "@/services/guides.service";
import { colors, spacing, TOUR_GUIDE_LABEL, typography } from "@/theme";

export default function TourPackageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { district } = useDistrict();

  const params = useLocalSearchParams<{
    packageId?: string;
    guideId?: string;
    stateSlug?: string;
    districtSlug?: string;
  }>();

  const packageId = params.packageId ?? "";
  const guideId = params.guideId ?? "";
  const base = `/d/${params.stateSlug ?? ""}/${params.districtSlug ?? ""}`;

  const { data, loading } = useQuery(
    async () => {
      const packages = await listPackagesForDistrict(district!.id);
      // The package is looked up by its own id; the guide id narrows the match
      // only when the caller passed one.
      return (
        packages.find(
          (pkg) => pkg.id === packageId && (!guideId || pkg.guide.id === guideId),
        ) ?? null
      );
    },
    [packageId, guideId, district?.id],
    { enabled: Boolean(district?.id && packageId) },
  );

  if (loading) return <LoadingState label="Loading package…" />;

  if (!data) {
    return (
      <EmptyState
        title="Package unavailable"
        description="This package is not offered for any place in this district."
        icon="map-outline"
        action={{ label: "Go back", onPress: () => router.back() }}
      />
    );
  }

  const spansDistricts = data.places.length < data.placeCount;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
    >
      <Text style={styles.name}>{data.name}</Text>

      {data.guide ? (
        <Touchable
          onPress={() => router.push(`${base}/tour-guide/${data.guide.id}`)}
          accessibilityRole="button"
          accessibilityLabel={`View ${data.guide.full_name}`}
          style={styles.guideRow}
        >
          <RemoteImage
            uri={data.guide.profile_pic ?? null}
            style={styles.guideAvatar}
            fallbackLabel={data.guide.full_name}
          />
          <View style={styles.guideBody}>
            <Text style={styles.guideLabel}>Led by a {TOUR_GUIDE_LABEL}</Text>
            <Text style={styles.guideName}>{data.guide.full_name}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Touchable>
      ) : null}

      {data.description ? (
        <Text style={styles.description}>{data.description}</Text>
      ) : null}

      <Card style={styles.facts}>
        <InfoRow
          label="Places in package"
          value={`${data.placeCount} ${data.placeCount === 1 ? "place" : "places"}`}
        />
        {spansDistricts ? (
          <InfoRow
            label="In this district"
            value={`${data.places.length} ${data.places.length === 1 ? "place" : "places"}`}
          />
        ) : null}
        <InfoRow label="District" value={district?.name ?? "—"} />
      </Card>

      <Text style={styles.sectionTitle}>
        Places in this package{spansDistricts ? " (this district)" : ""}
      </Text>

      {data.places.length === 0 ? (
        <EmptyState
          title="No places available here"
          description="This package covers places in other districts."
          icon="map-outline"
        />
      ) : (
        data.places.map((place) => (
          <Touchable
            key={place.id}
            onPress={() => router.push(`${base}/place/${place.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`View ${place.name}`}
            style={styles.placeRow}
          >
            <RemoteImage
              uri={place.images?.[0] ?? null}
              style={styles.thumb}
              fallbackLabel={place.name}
            />
            <View style={styles.placeBody}>
              <Text style={styles.placeName}>{place.name}</Text>
              {place.category ? (
                <Text style={styles.placeCategory}>{place.category}</Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Touchable>
        ))
      )}

      {data.guide ? (
        <Button
          label={`Book with ${data.guide.full_name}`}
          icon="calendar-outline"
          size="lg"
          fullWidth
          onPress={() => router.push(`${base}/tour-guide/${data.guide.id}/book`)}
          style={styles.action}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  name: { ...typography.title, color: colors.text },
  guideRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  guideAvatar: { width: 44, height: 44 },
  guideBody: { flex: 1 },
  guideLabel: { ...typography.caption, color: colors.primary },
  guideName: { ...typography.bodyStrong, color: colors.text },
  description: { ...typography.body, color: colors.textSecondary, marginTop: spacing.lg },
  facts: { marginTop: spacing.lg },
  sectionTitle: { ...typography.heading, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  thumb: { width: 48, height: 48 },
  placeBody: { flex: 1 },
  placeName: { ...typography.bodyStrong, color: colors.text },
  placeCategory: { ...typography.small, color: colors.textMuted },
  action: { marginTop: spacing.xl },
});