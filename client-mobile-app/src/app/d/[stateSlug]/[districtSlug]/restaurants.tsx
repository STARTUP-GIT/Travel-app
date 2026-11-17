/**
 * Restaurants in the current district.
 *
 * Reads from the district provider, which already scoped the list to this
 * district, so no extra request is made on open.
 */

import { FlatList, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Touchable } from "@/components/ui/pressable";
import { EmptyState, InlineError } from "@/components/ui/states";
import { RestaurantCard } from "@/components/listing-card";
import { useDistrict } from "@/providers/district-provider";
import { colors, spacing, typography } from "@/theme";
import { TopBar } from "@/components/shared/TopBar";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { DistrictBottomNav } from "@/components/shared/DistrictBottomNav";

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
    <View style={styles.root}>
      {/* 1. Universal TopBar matching Web */}
      <TopBar />

      {/* 2. Web ScreenHeader */}
      <ScreenHeader
        title="Where to eat"
        subtitle={`${restaurants.length} ${restaurants.length === 1 ? "restaurant" : "restaurants"} in ${district?.name ?? "this district"}`}
      />

      <FlatList
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
        data={restaurants}
        keyExtractor={(restaurant) => restaurant.id}
        ListHeaderComponent={
          error ? <InlineError message={error} onRetry={refreshListings} /> : undefined
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

      {/* 3. Universal BottomNavigation matching Web */}
      <DistrictBottomNav
        activeTab="places"
        stateSlug={params.stateSlug}
        districtSlug={params.districtSlug}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    ...typography.heading,
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  heading: { ...typography.title, color: colors.text },
  subheading: { ...typography.small, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg },
});