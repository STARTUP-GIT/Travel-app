/**
 * Saved items.
 *
 * Shows saved places and saved guides. The backend has no public favourites
 * endpoint, so these are stored on the device with a small snapshot of each item —
 * the same behaviour as the customer web app, and the reason a saved card can
 * still render a title and thumbnail without a network round trip.
 *
 * "Total saved" is shown as the count of items, which is what the web app shows.
 */

import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Chip } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Touchable } from "@/components/ui/pressable";
import { RemoteImage } from "@/components/ui/remote-image";
import { useFavorites } from "@/hooks/use-favorites";
import { useDistrict } from "@/providers/district-provider";
import { colors, radii, spacing, typography } from "@/theme";

type Filter = "all" | "places" | "guides";

export default function SavedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const favorites = useFavorites();
  const { district } = useDistrict();

  const params = useLocalSearchParams<{ stateSlug?: string; districtSlug?: string }>();
  const currentStateSlug = params.stateSlug ?? "";
  const currentDistrictSlug = params.districtSlug ?? "";

  const [filter, setFilter] = useState<Filter>("all");

  const places = filter === "guides" ? [] : favorites.places;
  const guides = filter === "places" ? [] : favorites.guides;

  /**
   * A saved place links back into the district it was saved from. The snapshot
   * records the district slug, so a saved place from another district still opens
   * correctly; when it is missing, the current district is used.
   */
  const openSavedPlace = (item: (typeof favorites.places)[number]) => {
    const stateSlug = currentStateSlug;
    const districtSlug = item.districtSlug ?? currentDistrictSlug;
    if (!districtSlug) return;
    router.push(`/d/${stateSlug}/${districtSlug}/place/${item.id}`);
  };

  const openSavedGuide = (item: (typeof favorites.guides)[number]) => {
    if (!currentDistrictSlug) return;
    router.push(`/d/${currentStateSlug}/${currentDistrictSlug}/guide/${item.id}`);
  };

  const total = favorites.places.length + favorites.guides.length;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxl },
      ]}
    >
      <Text style={styles.title}>Saved</Text>
      <Text style={styles.subtitle}>
        {total === 0
          ? "Nothing saved yet"
          : `${total} saved ${total === 1 ? "item" : "items"}`}
      </Text>

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

      {total === 0 ? (
        <EmptyState
          title="No saved items"
          description={
            district
              ? `Tap the heart on any place or guide in ${district.name} to keep it here.`
              : "Tap the heart on any place or guide to keep it here."
          }
          icon="heart-outline"
          action={{ label: "Explore destinations", onPress: () => router.push("/explore") }}
        />
      ) : places.length === 0 && guides.length === 0 ? (
        <EmptyState
          title="Nothing in this filter"
          description="Try another filter to see your other saved items."
          icon="heart-outline"
          action={{ label: "Show all", onPress: () => setFilter("all") }}
        />
      ) : null}

      {places.length > 0 ? (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Places</Text>
          {places.map((item) => (
            <SavedRow
              key={item.id}
              uri={item.image ?? null}
              title={item.name ?? "Saved place"}
              subtitle={item.subtitle}
              onPress={() => openSavedPlace(item)}
              onRemove={() => void favorites.remove(item.id, "place")}
            />
          ))}
        </View>
      ) : null}

      {guides.length > 0 ? (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Guides</Text>
          {guides.map((item) => (
            <SavedRow
              key={item.id}
              uri={item.image ?? null}
              title={item.name ?? "Saved guide"}
              subtitle={item.subtitle}
              onPress={() => openSavedGuide(item)}
              onRemove={() => void favorites.remove(item.id, "guide")}
            />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function SavedRow({
  uri,
  title,
  subtitle,
  onPress,
  onRemove,
}: {
  uri: string | null;
  title: string;
  subtitle?: string;
  onPress: () => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.row}>
      <Touchable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={styles.rowMain}
      >
        <RemoteImage uri={uri} style={styles.thumb} fallbackLabel={title} accessibilityLabel={title} />

        <View style={styles.rowBody}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.rowSubtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Touchable>

      <Touchable
        onPress={onRemove}
        accessibilityRole="button"
        accessibilityLabel={`Remove ${title} from saved`}
        hitSlop={8}
        style={styles.remove}
      >
        <Ionicons name="heart-dislike-outline" size={18} color={colors.textMuted} />
      </Touchable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.small, color: colors.textMuted, marginTop: spacing.xxs },
  chips: { flexDirection: "row", flexWrap: "wrap", marginTop: spacing.lg },
  group: { marginTop: spacing.lg },
  groupTitle: { ...typography.heading, color: colors.text, marginBottom: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    paddingRight: spacing.sm,
  },
  rowMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  thumb: { width: 56, height: 56 },
  rowBody: { flex: 1 },
  rowTitle: { ...typography.bodyStrong, color: colors.text },
  rowSubtitle: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  remove: { padding: spacing.sm },
});