/**
 * Guide card.
 *
 * `type` distinguishes the two backend guide models, and the difference is
 * visible to the user only in the subtitle:
 *
 *   - `specific` -> a guide for one place, so the place is named
 *   - `common`   -> a Tour Guide, who can lead tours; shown with the tour count
 *
 * The internal model name never appears: the customer-facing label for a
 * `common` guide is always "Tour Guide".
 */

import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { GuideWithContext } from "@/services/guides.service";
import { initials, truncate } from "@/lib/utils/format";
import { colors, radii, spacing, TOUR_GUIDE_LABEL, typography } from "@/theme";
import { RemoteImage } from "@/components/ui/remote-image";
import { Touchable } from "@/components/ui/pressable";
import { Badge, TagList } from "@/components/ui/badge";
import { RatingRow } from "./rating-row";

type Props = {
  entry: GuideWithContext;
  onPress: () => void;
  onToggleSave?: () => void;
  saved?: boolean;
};

export function GuideCard({ entry, onPress, onToggleSave, saved }: Props) {
  const { guide, type } = entry;

  const subtitle =
    type === "specific"
      ? entry.place.name
      : entry.places.length > 0
        ? `${TOUR_GUIDE_LABEL} · ${entry.places.length} ${entry.places.length === 1 ? "place" : "places"}`
        : TOUR_GUIDE_LABEL;

  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${guide.full_name}, ${subtitle}`}
      style={styles.card}
    >
      <View style={styles.topRow}>
        <RemoteImage
          uri={guide.profile_pic ?? null}
          style={styles.avatar}
          imageStyle={styles.avatarImage}
          fallbackLabel={initials(guide.full_name)}
          accessibilityLabel={`${guide.full_name}'s photo`}
          radius={radii.pill}
        />

        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {guide.full_name}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>

          <View style={styles.badgeRow}>
            <Badge
              label={type === "common" ? TOUR_GUIDE_LABEL : "Local expert"}
              tone={type === "common" ? "primary" : "neutral"}
            />
            {guide.experience > 0 ? (
              <View style={styles.experience}>
                <Ionicons name="briefcase-outline" size={12} color={colors.textMuted} />
                <Text style={styles.experienceText}>{guide.experience} yrs</Text>
              </View>
            ) : null}
          </View>
        </View>

        {onToggleSave ? (
          <Touchable
            onPress={onToggleSave}
            accessibilityRole="button"
            accessibilityLabel={saved ? `Remove ${guide.full_name} from saved` : `Save ${guide.full_name}`}
            accessibilityState={{ selected: Boolean(saved) }}
            hitSlop={10}
            style={styles.heart}
          >
            <Ionicons
              name={saved ? "heart" : "heart-outline"}
              size={20}
              color={saved ? colors.danger : colors.textMuted}
            />
          </Touchable>
        ) : null}
      </View>

      {guide.tagline ? (
        <Text style={styles.tagline} numberOfLines={2}>
          {truncate(guide.tagline, 90)}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <RatingRow rating={guide.rating ?? null} count={guide.review?.length ?? 0} />
        {typeof guide.cost === "number" && guide.cost > 0 ? (
          <Text style={styles.cost}>from {guide.cost}/day</Text>
        ) : null}
      </View>

      <TagList tags={Array.isArray(guide.language) ? guide.language : []} limit={3} />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
  },
  avatarImage: {
    borderRadius: radii.pill,
  },
  identity: {
    flex: 1,
  },
  name: {
    ...typography.subheading,
    color: colors.text,
  },
  subtitle: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  experience: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  experienceText: {
    ...typography.small,
    color: colors.textMuted,
  },
  heart: {
    padding: spacing.xs,
  },
  tagline: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  cost: {
    ...typography.smallStrong,
    color: colors.successDark,
  },
});