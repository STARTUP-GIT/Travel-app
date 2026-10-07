/**
 * Guides directory for a district.
 *
 * Lists both guide types the backend publishes for the district — place-specific
 * guides and Tour Guides — plus the tour packages those Tour Guides offer. The
 * customer-facing label for a `common` guide is always "Tour Guide"; the internal
 * model name never appears.
 *
 * A package that spans districts only lists the places this district can see, and
 * the header says so when the two counts differ, rather than implying the package
 * is smaller than it is.
 */

import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TextField } from "@/components/ui/text-field";
import { Chip } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { GuideCard } from "@/components/guide-card";
import { EmptyState } from "@/components/ui/states";
import { Touchable } from "@/components/ui/pressable";
import { useDistrict } from "@/providers/district-provider";
import { useFavorites } from "@/hooks/use-favorites";
import { TOUR_GUIDE_LABEL, colors, radii, spacing, typography } from "@/theme";

type Filter = "all" | "tour" | "local";

export default function GuidesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { district, guides } = useDistrict();
  const favorites = useFavorites();

  const params = useLocalSearchParams<{ stateSlug?: string; districtSlug?: string }>();
  const base = `/d/${params.stateSlug ?? ""}/${params.districtSlug ?? ""}`;

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const visibleGuides = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return guides.guides.filter((entry) => {
      if (filter === "tour" && entry.type !== "common") return false;
      if (filter === "local" && entry.type !== "specific") return false;
      if (needle.length < 2) return true;

      return `${entry.guide.full_name} ${entry.guide.tagline ?? ""} ${
        Array.isArray(entry.guide.language) ? entry.guide.language.join(" ") : ""
      }`
        .toLowerCase()
        .includes(needle);
    });
  }, [guides.guides, query, filter]);

  const visiblePackages = useMemo(() => {
    if (filter === "local") return [];
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return guides.packages;
    return guides.packages.filter((pkg) =>
      `${pkg.name} ${pkg.description ?? ""} ${pkg.guide.full_name}`
        .toLowerCase()
        .includes(needle),
    );
  }, [guides.packages, query, filter]);

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
      <Text style={styles.title}>Guides in {district.name}</Text>

      <TextField
        label="Filter"
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name or language"
        autoCapitalize="none"
      />

      <View style={styles.chips}>
        <Chip label="All" selected={filter === "all"} onPress={() => setFilter("all")} />
        <Chip
          label={TOUR_GUIDE_LABEL}
          selected={filter === "tour"}
          onPress={() => setFilter("tour")}
        />
        <Chip
          label="Place guides"
          selected={filter === "local"}
          onPress={() => setFilter("local")}
        />
      </View>

      {visibleGuides.length === 0 && visiblePackages.length === 0 ? (
        <EmptyState
          title="No guides here yet"
          description={`Guides and packages appear once they are published for a place in ${district.name}.`}
          icon="people-outline"
        />
      ) : null}

      {visiblePackages.length > 0 ? (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Tour packages</Text>

          {visiblePackages.map((pkg) => (
            <Card
              key={pkg.id}
              padded={false}
              style={styles.packageCard}
            >
              <Touchable
                onPress={() => router.push(`${base}/tour-package/${pkg.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Package ${pkg.name}`}
                style={styles.packageInner}
              >
                <View style={styles.packageHeader}>
                  <Ionicons name="map-outline" size={18} color={colors.primary} />
                  <Text style={styles.packageName}>{pkg.name}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>

                <Text style={styles.packageGuide}>by {pkg.guide.full_name}</Text>

                {pkg.description ? (
                  <Text style={styles.packageDescription} numberOfLines={3}>
                    {pkg.description}
                  </Text>
                ) : null}

                {/* Cross-district packages are larger than what this district can
                    show, so the difference is stated rather than hidden. */}
                <Text style={styles.packagePlaces}>
                  {pkg.places.length} of {pkg.placeCount}{" "}
                  {pkg.placeCount === 1 ? "place" : "places"}
                  {pkg.places.length < pkg.placeCount
                    ? " in this district · package spans other districts"
                    : ""}
                </Text>
              </Touchable>
            </Card>
          ))}
        </View>
      ) : null}

      {visibleGuides.length > 0 ? (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>
            {visibleGuides.length} {visibleGuides.length === 1 ? "guide" : "guides"}
          </Text>

          {visibleGuides.map((entry) => (
            <GuideCard
              key={`${entry.type}-${entry.guide.id}`}
              entry={entry}
              onPress={() =>
                router.push(
                  `${base}/${entry.type === "common" ? "tour-guide" : "guide"}/${entry.guide.id}`,
                )
              }
              saved={favorites.isSaved(entry.guide.id, "guide")}
              onToggleSave={() =>
                void favorites.toggle(entry.guide.id, "guide", {
                  name: entry.guide.full_name,
                  subtitle: entry.guide.tagline ?? undefined,
                  image: entry.guide.profile_pic ?? undefined,
                })
              }
            />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl },
  title: { ...typography.title, color: colors.text, marginBottom: spacing.lg },
  chips: { flexDirection: "row", flexWrap: "wrap" },
  group: { marginTop: spacing.lg },
  groupTitle: { ...typography.heading, color: colors.text, marginBottom: spacing.md },
  packageCard: { marginBottom: spacing.md, borderRadius: radii.lg },
  packageInner: { padding: spacing.lg },
  packageHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  packageName: { ...typography.subheading, color: colors.text, flex: 1 },
  packageGuide: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  packageDescription: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  packagePlaces: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.sm,
  },
});