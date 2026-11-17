/**
 * Guide card matching `frontend/features/guides/ui/guide-card.tsx` 1:1.
 *
 * Displays:
 *   - Avatar with single initial fallback in primary/10 circle
 *   - Full name with verified checkmark badge
 *   - Tagline / subtitle
 *   - Agency pill badge (for tour guides with an agency)
 *   - Rating (star in amber) and experience ("X yrs exp")
 *   - Save / favorite button (or type badge)
 *   - Short bio / description
 *   - Location badge & language badges
 *   - Price per booking (`₹X / booking`)
 *   - Action link: "View & book ->"
 */

import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { GuideWithContext } from "@/services/guides.service";
import { formatCurrency } from "@/lib/utils/format";
import { colors, radius, spacing, typography } from "@/theme";
import { Touchable } from "@/components/ui/pressable";

type Props = {
  entry: GuideWithContext;
  onPress: () => void;
  onToggleSave?: () => void;
  saved?: boolean;
};

export function GuideCard({ entry, onPress, onToggleSave, saved }: Props) {
  const { guide, type } = entry;
  const isSpecific = type === "specific";
  const agencyName = type === "common" ? guide.agencyName : null;

  const subtitle = isSpecific
    ? entry.place.name
    : `${entry.places.length} places covered`;

  const initial = (guide.full_name || "G").charAt(0).toUpperCase();

  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${guide.full_name}, ${subtitle}`}
      style={styles.card}
    >
      <View style={styles.topRow}>
        {guide.profile_pic ? (
          <Image source={{ uri: guide.profile_pic }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        )}

        <View style={styles.identity}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {guide.full_name}
            </Text>
            <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
          </View>

          <Text style={styles.subtitle} numberOfLines={1}>
            {guide.tagline ?? subtitle}
          </Text>

          {agencyName ? (
            <View style={styles.agencyBadge}>
              <Ionicons name="business-outline" size={12} color={colors.primary} />
              <Text style={styles.agencyBadgeText} numberOfLines={1}>
                {agencyName}
              </Text>
            </View>
          ) : null}

          <View style={styles.ratingAndExpRow}>
            {typeof guide.rating === "number" && guide.rating > 0 ? (
              <View style={styles.ratingWrap}>
                <Ionicons name="star" size={12} color="#f59e0b" />
                <Text style={styles.ratingNum}>{guide.rating.toFixed(1)}</Text>
              </View>
            ) : null}
            <Text style={styles.expText}>{guide.experience} yrs exp</Text>
          </View>
        </View>

        {onToggleSave ? (
          <Touchable
            onPress={onToggleSave}
            accessibilityRole="button"
            accessibilityLabel={saved ? `Remove ${guide.full_name} from saved` : `Save ${guide.full_name}`}
            accessibilityState={{ selected: Boolean(saved) }}
            hitSlop={10}
            style={styles.heartBtn}
          >
            <Ionicons
              name={saved ? "heart" : "heart-outline"}
              size={20}
              color={saved ? colors.danger : colors.textMuted}
            />
          </Touchable>
        ) : (
          <View style={[styles.typeBadge, isSpecific ? styles.typeBadgeInfo : styles.typeBadgeSuccess]}>
            <Text style={[styles.typeBadgeText, isSpecific ? styles.typeBadgeTextInfo : styles.typeBadgeTextSuccess]}>
              {isSpecific ? "Specific" : "Common"}
            </Text>
          </View>
        )}
      </View>

      {/* Description */}
      <Text style={styles.description} numberOfLines={2}>
        {guide.description ?? "Local expert guide for an authentic travel experience."}
      </Text>

      {/* Location and language badges */}
      <View style={styles.tagsRow}>
        <View style={styles.pillBadge}>
          <Ionicons name="location-outline" size={12} color={colors.textSecondary} />
          <Text style={styles.pillBadgeText}>
            {isSpecific ? entry.place.districtName : "Multiple places"}
          </Text>
        </View>

        {Array.isArray(guide.language) &&
          guide.language.slice(0, 3).map((lang) => (
            <View key={lang} style={styles.pillBadge}>
              <Ionicons name="language-outline" size={12} color={colors.textSecondary} />
              <Text style={styles.pillBadgeText}>{lang}</Text>
            </View>
          ))}
      </View>

      {/* Card footer: price and "View & book ->" */}
      <View style={styles.cardFooter}>
        <Text style={styles.priceRow}>
          <Text style={styles.priceAmount}>{formatCurrency(guide.cost)}</Text>
          <Text style={styles.priceUnit}> / booking</Text>
        </Text>

        <View style={styles.viewBookAction}>
          <Text style={styles.viewBookText}>View & book</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} />
        </View>
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  avatarImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: colors.border,
  },
  avatarFallback: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(37, 99, 235, 0.10)",
    borderWidth: 2,
    borderColor: "rgba(37, 99, 235, 0.20)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary,
  },
  identity: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  name: {
    ...typography.bodyStrong,
    fontSize: 16,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  agencyBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(37, 99, 235, 0.08)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginTop: 4,
  },
  agencyBadgeText: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  ratingAndExpRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 5,
  },
  ratingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingNum: {
    ...typography.caption,
    color: "#d97706",
    fontWeight: "700",
    fontSize: 11.5,
  },
  expText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11.5,
  },
  heartBtn: {
    padding: spacing.xs,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  typeBadgeSuccess: {
    backgroundColor: "#dcfce7",
  },
  typeBadgeInfo: {
    backgroundColor: "#dbeafe",
  },
  typeBadgeText: {
    ...typography.caption,
    fontSize: 10.5,
    fontWeight: "600",
  },
  typeBadgeTextSuccess: {
    color: "#15803d",
  },
  typeBadgeTextInfo: {
    color: "#1d4ed8",
  },
  description: {
    ...typography.caption,
    fontSize: 12.5,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  pillBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  pillBadgeText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  priceAmount: {
    ...typography.bodyStrong,
    fontSize: 15,
    color: colors.primary,
    fontWeight: "700",
  },
  priceUnit: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
  },
  viewBookAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewBookText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "700",
    fontSize: 12.5,
  },
});
