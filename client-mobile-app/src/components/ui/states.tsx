/**
 * Loading, empty and error states.
 *
 * Every data-backed screen routes through these three so an unexpected backend
 * response, an empty district and a genuine failure are always visibly different.
 * Error text comes from `toUserMessage`, which never forwards a stack trace, SQL
 * error or internal hostname.
 */

import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing, typography } from "@/theme";
import { Button } from "./button";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.body}>{label}</Text>
    </View>
  );
}

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  action?: { label: string; onPress: () => void };
};

export function EmptyState({ title, description, icon = "compass-outline", action }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={26} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.body}>{description}</Text> : null}
      {action ? (
        <Button
          label={action.label}
          onPress={action.onPress}
          variant="secondary"
          size="sm"
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
  title?: string;
};

export function ErrorState({ message, onRetry, title = "Something went wrong" }: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <View style={[styles.iconCircle, styles.iconCircleError]}>
        <Ionicons name="cloud-offline-outline" size={26} color={colors.danger} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{message}</Text>
      {onRetry ? (
        <Button
          label="Try again"
          onPress={onRetry}
          variant="secondary"
          size="sm"
          icon="refresh"
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

/** Inline variant for a failed section inside an otherwise loaded screen. */
export function InlineError({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.inline}>
      <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
      <Text style={styles.inlineText}>{message}</Text>
      {onRetry ? (
        <Button label="Retry" onPress={onRetry} variant="ghost" size="sm" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
    marginBottom: spacing.lg,
  },
  iconCircleError: {
    backgroundColor: colors.dangerLight,
  },
  title: {
    ...typography.subheading,
    color: colors.text,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  action: {
    marginTop: spacing.xl,
  },
  inline: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.dangerLight,
  },
  inlineText: {
    ...typography.small,
    color: colors.danger,
    flex: 1,
  },
});