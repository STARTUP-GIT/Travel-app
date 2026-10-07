/**
 * Badge and chip primitives.
 *
 * `Badge` renders a backend enum value with sensible wording and colour;
 * `Chip` is a selectable filter pill. Both truncate rather than wrap, so a long
 * tag line in an admin-authored record cannot break a card's layout.
 */

import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radii, spacing, statusColor, statusLabel, typography } from "@/theme";
import { Touchable } from "./pressable";

type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger" | "primary";

const TONES: Record<BadgeTone, { fg: string; bg: string }> = {
  neutral: { fg: colors.textSecondary, bg: colors.surfaceMuted },
  info: { fg: colors.info, bg: colors.infoLight },
  success: { fg: colors.successDark, bg: colors.successLight },
  warning: { fg: colors.warning, bg: colors.warningLight },
  danger: { fg: colors.danger, bg: colors.dangerLight },
  primary: { fg: colors.primary, bg: colors.primaryLight },
};

export function Badge({
  label,
  tone = "neutral",
  style,
}: {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
}) {
  const palette = TONES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }, style]}>
      <Text style={[styles.badgeText, { color: palette.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

/** Booking status pill — colour and wording both derived from the enum. */
export function StatusBadge({ status }: { status: string }) {
  const palette = statusColor(status);
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.fg }]}>{statusLabel(status)}</Text>
    </View>
  );
}

type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: string;
};

export function Chip({ label, selected = false, onPress, icon }: ChipProps) {
  return (
    <Touchable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        selected ? styles.chipSelected : styles.chipUnselected,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[styles.chipText, selected && styles.chipTextSelected]}
      >
        {icon ? `${icon}  ` : ""}
        {label}
      </Text>
    </Touchable>
  );
}

/** Read-only pill for a list of tags, e.g. languages a guide speaks. */
export function TagList({ tags, limit = 6 }: { tags: string[]; limit?: number }) {
  if (!Array.isArray(tags) || tags.length === 0) return null;
  const visible = tags.filter(Boolean).slice(0, limit);

  return (
    <View style={styles.tagRow}>
      {visible.map((tag) => (
        <Badge key={tag} label={tag} tone="neutral" style={styles.tag} />
      ))}
      {tags.length > limit ? (
        <Badge label={`+${tags.length - limit}`} tone="neutral" style={styles.tag} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    maxWidth: "100%",
  },
  badgeText: {
    ...typography.caption,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    maxWidth: 220,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipUnselected: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  chipText: {
    ...typography.smallStrong,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: colors.textInverse,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  tag: {
    marginRight: 0,
  },
});