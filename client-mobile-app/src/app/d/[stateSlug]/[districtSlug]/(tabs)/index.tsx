/**
 * District home.
 *
 * The hub screen for a district: its identity, a search entry point, and live
 * sections for places, guides, hotels and restaurants. Every listing comes from
 * the backend via `DistrictProvider` — nothing here is hardcoded, and an empty
 * district renders an honest empty state rather than placeholder cards.
 */

import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDistrict } from "@/providers/district-provider";
import { useAppShell } from "@/providers/app-shell-provider";
import { useFavorites } from "@/hooks/use-favorites";
import { Section } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RemoteImage } from "@/components/ui/remote-image";
import { PlaceCard } from "@/components/place-card";
import { GuideCard } from "@/components/guide-card";
import { HotelCard, RestaurantCard } from "@/components/listing-card";
import { Touchable } from "@/components/ui/pressable";
import { EmptyState } from "@/components/ui/states";
import { colors, radii, spacing, typography } from "@/theme";

/** How many cards each horizontal section shows before "See all". */
const PREVIEW_COUNT = 4;

export default function DistrictHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { district, places, guides, hotels, restaurants } = useDistrict();
  const favorites = useFavorites();
  const { config } = useAppShell();

  const params = useLocalSearchParams<{ stateSlug?: string; districtSlug?: string }>();
  const base = `/d/${params.stateSlug ?? ""}/${params.districtSlug ?? ""}`;

  if (!district) return null;

  const openPlace = (placeId: string) => router.push(`${base}/place/${placeId}`);
  const openGuide = (type: "specific" | "common", guideId: string) =>
    router.push(
      `${base}/${type === "common" ? "tour-guide" : "guide"}/${guideId}`,
    );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: spacing.xxxl }}
      showsVerticalScrollIndicator={false}
    >
      {/* District header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <RemoteImage
          uri={district.state?.primaryImage ?? null}
          style={styles.headerImage}
          fallbackLabel={district.name}
          accessibilityLabel={district.name}
        />

        <View style={styles.headerScrim} />

        <View style={styles.headerContent}>
          <Text style={styles.districtState}>{district.state?.name ?? ""}</Text>
          <Text style={styles.districtName} numberOfLines={2}>
            {district.name}
          </Text>

          <View style={styles.headerActions}>
            <HeaderAction
              icon="search"
              label="Search"
              onPress={() =>
                router.push({
                  pathname: "/search",
                  params: {
                    districtId: district.id,
                    stateSlug: params.stateSlug ?? "",
                    districtSlug: params.districtSlug ?? "",
                  },
                })
              }
            />
            <HeaderAction
              icon="navigate-circle-outline"
              label="Path Tracker"
              onPress={() => router.push("/path-tracker")}
            />
            <HeaderAction
              icon="information-circle-outline"
              label="About"
              onPress={() => router.push("/about")}
            />
          </View>
        </View>
      </View>

      {/* Places */}
      <View style={styles.section}>
        <Section
          title="Places"
          subtitle={
            places.length > 0
              ? `${places.length} published in ${district.name}`
              : undefined
          }
          action={
            places.length > PREVIEW_COUNT
              ? { label: "See all", onPress: () => router.push(`${base}/places`) }
              : undefined
          }
        >
          {places.length === 0 ? (
            <EmptyState
              title="No places yet"
              description={`Nothing has been published in ${district.name} yet.`}
              icon="map-outline"
            />
          ) : (
            places
              .slice(0, PREVIEW_COUNT)
              .map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  districtName={district.name}
                  onPress={() => openPlace(place.id)}
                  saved={favorites.isSaved(place.id, "place")}
                  onToggleSave={() =>
                    void favorites.toggle(place.id, "place", {
                      name: place.name,
                      subtitle: place.category,
                      districtSlug: params.districtSlug,
                    })
                  }
                />
              ))
          )}
        </Section>
      </View>

      {/* Guides */}
      <View style={styles.section}>
        <Section
          title="Guides"
          subtitle="Local experts and Tour Guides"
          action={
            guides.guides.length > PREVIEW_COUNT
              ? { label: "See all", onPress: () => router.push(`${base}/guides`) }
              : undefined
          }
        >
          {guides.guides.length === 0 ? (
            <EmptyState
              title="No guides published yet"
              description="Guides appear here once they are listed for a place in this district."
              icon="people-outline"
            />
          ) : (
            guides.guides.slice(0, PREVIEW_COUNT).map((entry) => (
              <GuideCard
                key={`${entry.type}-${entry.guide.id}`}
                entry={entry}
                onPress={() => openGuide(entry.type, entry.guide.id)}
                saved={favorites.isSaved(entry.guide.id, "guide")}
                onToggleSave={() =>
                  void favorites.toggle(entry.guide.id, "guide", {
                    name: entry.guide.full_name,
                    subtitle: entry.guide.tagline ?? undefined,
                    image: entry.guide.profile_pic ?? undefined,
                  })
                }
              />
            ))
          )}
        </Section>
      </View>

      {/* Hotels */}
      <View style={styles.section}>
        <Section
          title="Hotels"
          action={
            hotels.length > PREVIEW_COUNT
              ? { label: "See all", onPress: () => router.push(`${base}/hotels`) }
              : undefined
          }
        >
          {hotels.length === 0 ? (
            <EmptyState
              title="No hotels listed"
              description="Hotels in this district will show up here."
              icon="bed-outline"
            />
          ) : (
            hotels
              .slice(0, PREVIEW_COUNT)
              .map((hotel) => (
                <HotelCard
                  key={hotel.id}
                  hotel={hotel}
                  onPress={() => router.push(`${base}/hotel-detail/${hotel.id}`)}
                />
              ))
          )}
        </Section>
      </View>

      {/* Restaurants */}
      <View style={styles.section}>
        <Section
          title="Restaurants"
          action={
            restaurants.length > PREVIEW_COUNT
              ? { label: "See all", onPress: () => router.push(`${base}/restaurants`) }
              : undefined
          }
        >
          {restaurants.length === 0 ? (
            <EmptyState
              title="No restaurants listed"
              description="Restaurants in this district will show up here."
              icon="restaurant-outline"
            />
          ) : (
            restaurants
              .slice(0, PREVIEW_COUNT)
              .map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  onPress={() =>
                    router.push(`${base}/restaurant-detail/${restaurant.id}`)
                  }
                />
              ))
          )}
        </Section>
      </View>

      <View style={styles.footer}>
        <Button
          label="Report a listing"
          variant="ghost"
          size="sm"
          icon="flag-outline"
          onPress={() => router.push("/report")}
        />
        <Text style={styles.footerText}>{config.contacts}</Text>
      </View>
    </ScrollView>
  );
}

function HeaderAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.headerAction}
    >
      <Ionicons name={icon} size={18} color={colors.textInverse} />
      <Text style={styles.headerActionLabel}>{label}</Text>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { height: 260, justifyContent: "flex-end" },
  headerImage: { ...StyleSheet.absoluteFill, borderRadius: 0 },
  headerScrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(9,16,34,0.45)",
  },
  headerContent: { padding: spacing.xl },
  districtState: {
    ...typography.smallStrong,
    color: "rgba(255,255,255,0.85)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  districtName: { ...typography.display, color: colors.textInverse, marginTop: 2 },
  headerActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.lg },
  headerAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerActionLabel: { ...typography.caption, color: colors.textInverse },
  section: { paddingHorizontal: spacing.xl, marginTop: spacing.xxl },
  footer: { alignItems: "center", marginTop: spacing.xxl },
  footerText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});