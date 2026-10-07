/**
 * Places list for a district.
 *
 * Categories are derived from the loaded listings rather than hardcoded, so the
 * filter chips always match what the admin has actually published and a category
 * with no places never appears as an empty result.
 */

import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TextField } from "@/components/ui/text-field";
import { Chip } from "@/components/ui/badge";
import { PlaceCard } from "@/components/place-card";
import { EmptyState } from "@/components/ui/states";
import { useDistrict } from "@/providers/district-provider";
import { useFavorites } from "@/hooks/use-favorites";
import { colors, spacing, typography } from "@/theme";

export default function PlacesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { district, places } = useDistrict();
  const favorites = useFavorites();

  const params = useLocalSearchParams<{ stateSlug?: string; districtSlug?: string }>();
  const base = `/d/${params.stateSlug ?? ""}/${params.districtSlug ?? ""}`;

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  const categories = useMemo(() => {
    const unique = new Set<string>();
    for (const place of places) {
      if (place.category) unique.add(place.category);
    }
    return [...unique].sort();
  }, [places]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return places.filter((place) => {
      if (category && place.category !== category) return false;
      if (needle.length < 2) return true;
      return `${place.name} ${place.description} ${place.category}`
        .toLowerCase()
        .includes(needle);
    });
  }, [places, query, category]);

  if (!district) return null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxl },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Places in {district.name}</Text>

      <TextField
        label="Filter"
        value={query}
        onChangeText={setQuery}
        placeholder="Search places"
        autoCapitalize="none"
      />

      {categories.length > 0 ? (
        <View style={styles.chips}>
          {categories.map((item) => (
            <Chip
              key={item}
              label={item}
              selected={category === item}
              onPress={() => setCategory((current) => (current === item ? null : item))}
            />
          ))}
        </View>
      ) : null}

      <Text style={styles.count}>
        {visible.length} {visible.length === 1 ? "place" : "places"}
      </Text>

      {visible.length === 0 ? (
        <EmptyState
          title="No places match"
          description={
            places.length === 0
              ? `Nothing has been published in ${district.name} yet.`
              : "Try a different search or category."
          }
          icon="map-outline"
          action={
            places.length > 0
              ? {
                  label: "Clear filters",
                  onPress: () => {
                    setQuery("");
                    setCategory(null);
                  },
                }
              : undefined
          }
        />
      ) : (
        visible.map((place) => (
          <PlaceCard
            key={place.id}
            place={place}
            districtName={district.name}
            onPress={() => router.push(`${base}/place/${place.id}`)}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl },
  title: { ...typography.title, color: colors.text, marginBottom: spacing.lg },
  chips: { flexDirection: "row", flexWrap: "wrap" },
  count: { ...typography.small, color: colors.textMuted, marginBottom: spacing.md },
});