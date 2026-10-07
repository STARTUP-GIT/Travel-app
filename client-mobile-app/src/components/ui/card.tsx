/**
 * Card and section chrome.
 *
 * `Card` is the single elevated surface used by every listing row; `Section`
 * groups a titled block on a district home. Keeping them here means padding and
 * corner radii cannot drift apart between screens.
 */

import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, shadows, spacing, typography } from "@/theme";

export function Card({
  children,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  return <View style={[styles.card, padded && styles.cardPadded, style]}>{children}</View>;
}

type SectionProps = {
  title: string;
  subtitle?: string;
  action?: { label: string; onPress: () => void };
  /** Optional — a section may be used as a bare heading above its own content. */
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function Section({ title, subtitle, action, children, style }: SectionProps) {
  return (
    <View style={[styles.section, style]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleBlock}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
        {action ? (
          <Text
            accessibilityRole="button"
            onPress={action.onPress}
            style={styles.sectionAction}
          >
            {action.label}
          </Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/** A neutral row used for metadata pairs inside a card. */
export function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

/** Horizontal label/value pair, used on detail screens. */
export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardPadded: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  sectionTitleBlock: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
  },
  sectionSubtitle: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionAction: {
    ...typography.smallStrong,
    color: colors.primary,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  detailLabel: {
    ...typography.small,
    color: colors.textMuted,
    width: 92,
  },
  detailValue: {
    ...typography.small,
    color: colors.text,
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.lg,
  },
  infoLabel: {
    ...typography.small,
    color: colors.textMuted,
  },
  infoValue: {
    ...typography.bodyStrong,
    color: colors.text,
    flexShrink: 1,
    textAlign: "right",
  },
});