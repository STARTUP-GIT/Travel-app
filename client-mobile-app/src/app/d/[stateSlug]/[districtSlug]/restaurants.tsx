/**
 * Restaurants in the current district.
 *
 * Reads from the district provider, which already scoped the list to this
 * district, so no extra request is made on open.
 */

import { FlatList, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EmptyState, InlineError } from "@/components/ui/states";
import { RestaurantCard } from "@/components/listing-card";
import { useDistrict } from "@/providers/district-provider";
import { colors, spacing, typography } from "@/theme";

export default function RestaurantsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { district, restaurants, status, error, refreshListings } = useDistrict();

  const params = useLocalSearchParams<{ stateSlug?: string; districtSlug?: string }>();
  const base = `/d/${params.stateSlug ?? ""}/${params.districtSlug ?? ""}`;

  if (status !== "ready") {
    return (
      <EmptyState
        title={status === "not-found" ? "Destination not found" : "Loading restaurants…"}
        description={
          status === "not-found"
            ? "This destination is no longer available."
            : "Fetching places to eat."
        }
        icon="restaurant-outline"
      />
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
      data={restaurants}
      keyExtractor={(restaurant) => restaurant.id}
      ListHeaderComponent={
        <View>
          <Text style={styles.heading}>Where to eat</Text>
          <Text style={styles.subheading}>
            {restaurants.length === 0
              ? `No restaurants listed in ${district?.name ?? "this district"} yet.`
              : `${restaurants.length} ${
                  restaurants.length === 1 ? "restaurant" : "restaurants"
                } in ${district?.name ?? "this district"}.`}
          </Text>
          {error ? <InlineError message={error} onRetry={refreshListings} /> : null}
        </View>
      }
      renderItem={({ item }) => (
        <RestaurantCard
          restaurant={item}
          onPress={() => router.push(`${base}/restaurant-detail/${item.id}`)}
        />
      )}
      ListEmptyComponent={
        <EmptyState
          title="No restaurants here yet"
          description="Try a nearby district — restaurant listings are added by the tourism office."
          icon="restaurant-outline"
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