/**
 * Guides directory for a district.
 *
 * Faithfully mirrors `frontend/features/guides/ui/guides-list.tsx`:
 *   - Tabs: All, Specific, Tour Guides, Tours
 *   - Rich PackageCard with avatar, route icon, agency attribution, cover image,
 *     stops badges, and direct navigation to the package details
 *   - Rich GuideCard with verified credentials and rating
 */

import React, { useMemo, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TextField } from "@/components/ui/text-field";
import { GuideCard } from "@/components/guide-card";
import { EmptyState } from "@/components/ui/states";
import { Touchable } from "@/components/ui/pressable";
import { useDistrict } from "@/providers/district-provider";
import { useFavorites } from "@/hooks/use-favorites";
import { colors, radius, spacing, typography } from "@/theme";
import { formatCurrency } from "@/lib/utils/currency";
import { ScreenHeader } from "@/components/shared/ScreenHeader";

type Filter = "all" | "specific" | "common" | "packages";

export default function GuidesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { district, guides } = useDistrict();
  const favorites = useFavorites();

  const params = useLocalSearchParams<{ stateSlug?: string; districtSlug?: string }>();
  const base = `/d/${params.stateSlug ?? ""}/${params.districtSlug ?? ""}`;

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const specificGuides = useMemo(
    () => guides.guides.filter((g) => g.type === "specific"),
    [guides.guides]
  );
  const commonGuides = useMemo(
    () => guides.guides.filter((g) => g.type === "common"),
    [guides.guides]
  );

  const visibleGuides = useMemo(() => {
    if (filter === "packages") return [];
    const needle = query.trim().toLowerCase();

    return guides.guides.filter((entry) => {
      if (filter === "common" && entry.type !== "common") return false;
      if (filter === "specific" && entry.type !== "specific") return false;
      if (needle.length < 2) return true;

      return `${entry.guide.full_name} ${entry.guide.tagline ?? ""} ${
        Array.isArray(entry.guide.language) ? entry.guide.language.join(" ") : ""
      }`
        .toLowerCase()
        .includes(needle);
    });
  }, [guides.guides, query, filter]);

  const visiblePackages = useMemo(() => {
    if (filter === "specific" || filter === "common") return [];
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return guides.packages;
    return guides.packages.filter((pkg) =>
      `${pkg.name} ${pkg.description ?? ""} ${pkg.guide.full_name} ${pkg.guide.agencyName ?? ""}`
        .toLowerCase()
        .includes(needle)
    );
  }, [guides.packages, query, filter]);

  if (!district) return null;

  return (
    <View style={styles.screen}>
      <ScreenHeader
        title="Local Guides"
        subtitle={`${district.name} district · ${guides.guides.length} guide${guides.guides.length === 1 ? "" : "s"}${guides.packages.length > 0 ? ` · ${guides.packages.length} tour${guides.packages.length === 1 ? "" : "s"}` : ""}`}
        onBack={() => router.back()}
      />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingTop: spacing.md, paddingBottom: insets.bottom + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

      <TextField
        label="Filter"
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name, agency, or language"
        autoCapitalize="none"
      />

      {/* Tabs matching web: All, Specific, Tour Guides, Tours */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll}>
        <View style={styles.tabsRow}>
          <Touchable
            onPress={() => setFilter("all")}
            style={[styles.tabChip, filter === "all" && styles.tabChipActive]}
          >
            <Text style={[styles.tabChipText, filter === "all" && styles.tabChipTextActive]}>
              All ({guides.guides.length + guides.packages.length})
            </Text>
          </Touchable>

          <Touchable
            onPress={() => setFilter("specific")}
            style={[styles.tabChip, filter === "specific" && styles.tabChipActive]}
          >
            <Text style={[styles.tabChipText, filter === "specific" && styles.tabChipTextActive]}>
              Specific ({specificGuides.length})
            </Text>
          </Touchable>

          <Touchable
            onPress={() => setFilter("common")}
            style={[styles.tabChip, filter === "common" && styles.tabChipActive]}
          >
            <Text style={[styles.tabChipText, filter === "common" && styles.tabChipTextActive]}>
              Tour Guides ({commonGuides.length})
            </Text>
          </Touchable>

          <Touchable
            onPress={() => setFilter("packages")}
            style={[styles.tabChip, filter === "packages" && styles.tabChipActive]}
          >
            <Ionicons
              name="git-branch-outline"
              size={13}
              color={filter === "packages" ? "#ffffff" : colors.primary}
            />
            <Text style={[styles.tabChipText, filter === "packages" && styles.tabChipTextActive]}>
              Tours ({guides.packages.length})
            </Text>
          </Touchable>
        </View>
      </ScrollView>

      {visibleGuides.length === 0 && visiblePackages.length === 0 ? (
        <EmptyState
          title="No guides here yet"
          description={`Guides and packages appear once they are published for a place in ${district.name}.`}
          icon="people-outline"
        />
      ) : null}

      {/* Tour Packages matching PackageCard from web */}
      {visiblePackages.length > 0 ? (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Tour Packages ({visiblePackages.length})</Text>

          {visiblePackages.map((pkg) => {
            const cover = pkg.places.find((p) => p.images?.[0])?.images?.[0];
            return (
              <Touchable
                key={pkg.id}
                onPress={() => router.push(`${base}/tour-package/${pkg.id}`)}
                style={styles.packageCard}
              >
                {/* Header: Avatar + Title + Agency */}
                <View style={styles.packageHeader}>
                  {pkg.guide.profile_pic ? (
                    <Image source={{ uri: pkg.guide.profile_pic }} style={styles.pkgAvatar} />
                  ) : (
                    <View style={styles.pkgAvatarFallback}>
                      <Text style={styles.pkgAvatarInitial}>
                        {(pkg.guide.agencyName || pkg.guide.full_name).charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.pkgTitleWrap}>
                    <View style={styles.pkgNameRow}>
                      <Ionicons name="git-branch" size={15} color={colors.primary} />
                      <Text style={styles.pkgName} numberOfLines={1}>
                        {pkg.name}
                      </Text>
                    </View>
                    <Text style={styles.pkgAgency} numberOfLines={1}>
                      {pkg.guide.agencyName
                        ? `${pkg.guide.agencyName} with ${pkg.guide.full_name}`
                        : `with ${pkg.guide.full_name}`}
                    </Text>
                  </View>
                </View>

                {/* Cover Image (16:9) if available */}
                {cover ? (
                  <View style={styles.pkgCoverWrap}>
                    <Image source={{ uri: cover }} style={styles.pkgCover} />
                  </View>
                ) : null}

                {pkg.description ? (
                  <Text style={styles.pkgDesc} numberOfLines={2}>
                    {pkg.description}
                  </Text>
                ) : null}

                {/* Badges row */}
                <View style={styles.pkgBadgesRow}>
                  <View style={styles.badgeSuccess}>
                    <Ionicons name="location" size={11} color="#15803d" />
                    <Text style={styles.badgeSuccessText}>{pkg.placeCount} stops</Text>
                  </View>

                  {pkg.places.slice(0, 2).map((p) => (
                    <View key={p.id} style={styles.badgeOutline}>
                      <Text style={styles.badgeOutlineText} numberOfLines={1}>
                        {p.name}
                      </Text>
                    </View>
                  ))}

                  {pkg.price ? (
                    <View style={styles.badgeInfo}>
                      <Text style={styles.badgeInfoText}>
                        {formatCurrency(pkg.price)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </Touchable>
            );
          })}
        </View>
      ) : null}

      {/* Guides Grid */}
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
                  `${base}/${entry.type === "common" ? "tour-guide" : "guide"}/${entry.guide.id}`
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
  },
  tabsScroll: {
    marginTop: spacing.xs,
  },
  tabsRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  tabChipActive: {
    backgroundColor: colors.primary,
  },
  tabChipText: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  tabChipTextActive: {
    color: "#ffffff",
  },
  group: {
    gap: spacing.sm,
  },
  groupTitle: {
    ...typography.heading,
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  packageCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  packageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  pkgAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  pkgAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },
  pkgAvatarInitial: {
    color: "#1d4ed8",
    fontWeight: "700",
    fontSize: 18,
  },
  pkgTitleWrap: {
    flex: 1,
  },
  pkgNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pkgName: {
    ...typography.bodyStrong,
    fontSize: 15,
    color: colors.text,
    flex: 1,
  },
  pkgAgency: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  pkgCoverWrap: {
    height: 140,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  pkgCover: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  pkgDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  pkgBadgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  badgeSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  badgeSuccessText: {
    ...typography.caption,
    color: "#15803d",
    fontWeight: "600",
    fontSize: 11,
  },
  badgeOutline: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    maxWidth: 120,
  },
  badgeOutlineText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  badgeInfo: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginLeft: "auto",
  },
  badgeInfoText: {
    ...typography.caption,
    color: "#1d4ed8",
    fontWeight: "700",
    fontSize: 11,
  },
});
