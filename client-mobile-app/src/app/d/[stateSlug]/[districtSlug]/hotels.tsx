/**
 * Hotels in the current district.
 *
 * The list comes from the district provider rather than a second request: it is
 * already scoped to this district and shared with the district home, so opening
 * this screen is instant and a refresh on one screen updates both.
 */

import { FlatList, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState, InlineError } from "@/components/ui/states";
import { HotelCard } from "@/components/listing-card";
import { useDistrict } from "@/providers/district-provider";
import { colors, spacing, typography } from "@/theme";

export default function HotelsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { district, hotels, status, error, refreshListings } = useDistrict();

  const params = useLocalSearchParams<{ stateSlug?: string; districtSlug?: string }>();
  const base = `/d/${params.stateSlug ?? ""}/${params.districtSlug ?? ""}`;

  if (status !== "ready") {
    return (
      <EmptyState
        title={status === "not-found" ? "Destination not found" : "Loading hotels…"}
        description={
          status === "not-found"
            ? "This destination is no longer available."
            : "Fetching places to stay."
        }
        icon="bed-outline"
      />
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
      data={hotels}
      keyExtractor={(hotel) => hotel.id}
      ListHeaderComponent={
        <View>
          <Text style={styles.heading}>Where to stay</Text>
          <Text style={styles.subheading}>
            {hotels.length === 0
              ? `No hotels listed in ${district?.name ?? "this district"} yet.`
              : `${hotels.length} ${hotels.length === 1 ? "hotel" : "hotels"} in ${
                  district?.name ?? "this district"
                }.`}
          </Text>
          {error ? <InlineError message={error} onRetry={refreshListings} /> : null}
        </View>
      }
      renderItem={({ item }) => (
        <HotelCard
          hotel={item}
          onPress={() =>
            router.push(`${base}/hotel-detail/${item.id}`)
          }
        />
      )}
      ListEmptyComponent={
        <EmptyState
          title="No hotels here yet"
          description="Try a nearby district — hotel listings are added by the tourism office."
          icon="bed-outline"
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  heading: { ...typography.title, color: colors.text },
  subheading: { ...typography.small, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
});