/**
 * District-scoped search.
 *
 * Search is scoped to a district because the listings a user can search are the
 * ones the backend has published for that district. If the user has not entered a
 * district yet, they are sent to the destination picker first rather than being
 * shown a search that cannot return anything real.
 *
 * The input is debounced so a request is not issued per keystroke, and the query
 * is cleared when the screen closes so returning to it does not show stale results.
 */

import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TextField } from "@/components/ui/text-field";
import { PlaceCard } from "@/components/place-card";
import { GuideCard } from "@/components/guide-card";
import { HotelCard, RestaurantCard } from "@/components/listing-card";
import { EmptyState } from "@/components/ui/states";
import { useDebounced } from "@/hooks/use-query";
import { useFavorites } from "@/hooks/use-favorites";
import { searchDistrict, type SearchResults } from "@/services/search.service";
import { colors, spacing, typography } from "@/theme";

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const favorites = useFavorites();
  // Callers pass the real district id plus the two URL slugs used for links.
  const params = useLocalSearchParams<{
    districtId?: string;
    stateSlug?: string;
    districtSlug?: string;
  }>();

  const districtId = params.districtId ?? "";
  const stateSlug = params.stateSlug ?? "";
  const districtSlug = params.districtSlug ?? "";

  const [query, setQuery] = useState("");
  const debounced = useDebounced(query, 400);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!districtId || debounced.trim().length < 2) {
      setResults(null);
      return;
    }

    let cancelled = false;
    setSearching(true);

    void (async () => {
      const found = await searchDistrict(districtId, debounced);
      if (cancelled) return;
      setResults(found);
      setSearching(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [districtId, debounced]);

  // Nothing to search yet -> send the user to the destination picker.
  if (!districtSlug) {
    return (
      <View style={styles.prompt}>
        <EmptyState
          title="Choose a destination first"
          description="Search covers the places, hotels, restaurants and guides of one district."
          icon="search-outline"
          action={{ label: "Choose a destination", onPress: () => router.replace("/explore") }}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TextField
          label="Search"
          value={query}
          onChangeText={setQuery}
          placeholder="Places, hotels, restaurants, guides"
          autoFocus
          autoCapitalize="none"
        />
      </View>

      <ScrollView
        contentContainerStyle={[styles.results, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        {searching ? (
          <Text style={styles.status}>Searching…</Text>
        ) : query.trim().length < 2 ? (
          <Text style={styles.status}>Type at least two characters.</Text>
        ) : results && results.total === 0 ? (
          <EmptyState
            title="No matches"
            description={`Nothing in this district matches "${query.trim()}".`}
            icon="search-outline"
          />
        ) : (
          results?.groups.map((group) => (
            <View key={group.kind} style={styles.group}>
              <Text style={styles.groupTitle}>
                {group.label} ({group.items.length})
              </Text>

              {group.kind === "places"
                ? group.items.map((place) => (
                    <PlaceCard
                      key={place.id}
                      place={place}
                      onPress={() =>
                        router.push(`/d/${stateSlug}/${districtSlug}/place/${place.id}`)
                      }
                      saved={favorites.isSaved(place.id, "place")}
                      onToggleSave={() =>
                        void favorites.toggle(place.id, "place", {
                          name: place.name,
                          subtitle: place.category,
                        })
                      }
                    />
                  ))
                : group.kind === "hotels"
                  ? group.items.map((hotel) => (
                      <HotelCard
                        key={hotel.id}
                        hotel={hotel}
                        onPress={() =>
                          router.push(`/d/${stateSlug}/${districtSlug}/hotel-detail/${hotel.id}`)
                        }
                      />
                    ))
                  : group.kind === "restaurants"
                    ? group.items.map((restaurant) => (
                        <RestaurantCard
                          key={restaurant.id}
                          restaurant={restaurant}
                          onPress={() =>
                            router.push(
                              `/d/${stateSlug}/${districtSlug}/restaurant-detail/${restaurant.id}`,
                            )
                          }
                        />
                      ))
                    : group.items.map((entry) => (
                        <GuideCard
                          key={`${entry.type}-${entry.guide.id}`}
                          entry={entry}
                          onPress={() =>
                            router.push(
                              entry.type === "common"
                                ? `/d/${stateSlug}/${districtSlug}/tour-guide/${entry.guide.id}`
                                : `/d/${stateSlug}/${districtSlug}/guide/${entry.guide.id}`,
                            )
                          }
                          saved={favorites.isSaved(entry.guide.id, "guide")}
                          onToggleSave={() =>
                            void favorites.toggle(entry.guide.id, "guide", {
                              name: entry.guide.full_name,
                              image: entry.guide.profile_pic ?? undefined,
                            })
                          }
                        />
                      ))}
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  prompt: { flex: 1, justifyContent: "center" },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },
  results: { paddingHorizontal: spacing.xl },
  status: { ...typography.small, color: colors.textMuted, paddingVertical: spacing.lg },
  group: { marginBottom: spacing.xl },
  groupTitle: { ...typography.subheading, color: colors.text, marginBottom: spacing.md },
});