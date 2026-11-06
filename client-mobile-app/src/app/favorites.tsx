/**
 * Saved / Favorites screen (top-level parity with frontend /favorites).
 *
 * Shows customer's saved places and guides across all destinations.
 * Supports filtering, quick removal, and direct navigation back into the
 * saved attraction's district.
 */

import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RemoteImage } from "@/components/ui/remote-image";
import { EmptyState } from "@/components/ui/states";
import { Touchable } from "@/components/ui/pressable";
import { useFavorites } from "@/hooks/use-favorites";
import { useToast } from "@/providers/toast-provider";
import { colors, radii, spacing, typography } from "@/theme";

type Filter = "all" | "places" | "guides";

export default function FavoritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const favorites = useFavorites();
  const toast = useToast();

  const [filter, setFilter] = useState<Filter>("all");

  const places = filter === "guides" ? [] : favorites.places;
  const guides = filter === "places" ? [] : favorites.guides;
  const total = favorites.total;

  const openPlace = (place: (typeof favorites.places)[number]) => {
    const districtSlug = place.districtSlug;
    if (districtSlug) {
      router.push(`/d/india/${districtSlug}/place/${place.id}`);
    } else {
      router.push("/explore");
    }
  };

  const openGuide = (guide: (typeof favorites.guides)[number]) => {
    const districtSlug = guide.districtSlug;
    if (districtSlug) {
      router.push(`/d/india/${districtSlug}/guide/${guide.id}`);
    } else {
      router.push("/explore");
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + spacing.xxxl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Saved</Text>
        <Text style={styles.subtitle}>
          {total === 0
            ? "Your saved list is empty"
            : `${total} ${total === 1 ? "item" : "items"} saved for your journey`}
        </Text>
      </View>

      {total > 0 ? (
        <View style={styles.chips}>
          <Chip label="All" selected={filter === "all"} onPress={() => setFilter("all")} />
          <Chip
            label={`Places (${favorites.places.length})`}
            selected={filter === "places"}
            onPress={() => setFilter("places")}
          />
          <Chip
            label={`Guides (${favorites.guides.length})`}
            selected={filter === "guides"}
            onPress={() => setFilter("guides")}
          />
        </View>
      ) : null}

      {total === 0 ? (
        <EmptyState
          title="No saved items yet"
          description="Tap the bookmark or heart icon on any place or guide to save it here for later."
          icon="heart-outline"
          action={{
            label: "Explore destinations",
            onPress: () => router.push("/explore"),
          }}
        />
      ) : (
        <View style={styles.list}>
          {places.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Places ({places.length})</Text>
              {places.map((place) => (
                <Card key={place.id} style={styles.card}>
                  <Touchable
                    onPress={() => openPlace(place)}
                    style={styles.cardTouchable}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${place.name ?? "Place"}`}
                  >
                    <RemoteImage
                      uri={place.image ?? null}
                      style={styles.thumb}
                      fallbackLabel={place.name ?? "Place"}
                    />
                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle}>{place.name ?? "Saved Place"}</Text>
                      {place.subtitle ? (
                        <Text style={styles.cardCategory}>{place.subtitle}</Text>
                      ) : null}
                      {place.districtSlug ? (
                        <Text style={styles.cardLocation}>
                          District: {place.districtSlug}
                        </Text>
                      ) : null}
                    </View>
                  </Touchable>
                  <Touchable
                    onPress={async () => {
                      await favorites.toggle(place.id, "place");
                      toast.show("Removed from saved", "info");
                    }}
                    style={styles.removeBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Remove from saved"
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Touchable>
                </Card>
              ))}
            </View>
          ) : null}

          {guides.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Guides ({guides.length})</Text>
              {guides.map((guide) => (
                <Card key={guide.id} style={styles.card}>
                  <Touchable
                    onPress={() => openGuide(guide)}
                    style={styles.cardTouchable}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${guide.name ?? "Guide"}`}
                  >
                    <RemoteImage
                      uri={guide.image ?? null}
                      style={styles.avatar}
                      fallbackLabel={guide.name ?? "Guide"}
                      radius={radii.pill}
                    />
                    <View style={styles.cardBody}>
                      <Text style={styles.cardTitle}>{guide.name ?? "Saved Guide"}</Text>
                      {guide.subtitle ? (
                        <Text style={styles.cardCategory}>{guide.subtitle}</Text>
                      ) : null}
                      {guide.districtSlug ? (
                        <Text style={styles.cardLocation}>
                          District: {guide.districtSlug}
                        </Text>
                      ) : null}
                    </View>
                  </Touchable>
                  <Touchable
                    onPress={async () => {
                      await favorites.toggle(guide.id, "guide");
                      toast.show("Removed from saved", "info");
                    }}
                    style={styles.removeBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Remove from saved"
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Touchable>
                </Card>
              ))}
            </View>
          ) : null}
        </View>
      )}

      {total > 0 ? (
        <Button
          label="Explore more places"
          variant="secondary"
          onPress={() => router.push("/explore")}
          fullWidth
          size="lg"
          style={styles.exploreBtn}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  header: { marginBottom: spacing.lg },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
  chips: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xl },
  list: { gap: spacing.xl },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.heading, color: colors.text, marginBottom: spacing.xs },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radii.xl,
  },
  cardTouchable: { flexDirection: "row", alignItems: "center", flex: 1, gap: spacing.md },
  thumb: { width: 56, height: 56, borderRadius: radii.md },
  avatar: { width: 56, height: 56 },
  cardBody: { flex: 1 },
  cardTitle: { ...typography.bodyStrong, color: colors.text },
  cardCategory: { ...typography.caption, color: colors.primary, marginTop: 2 },
  cardLocation: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  removeBtn: { padding: spacing.sm },
  exploreBtn: { marginTop: spacing.xxl },
});
