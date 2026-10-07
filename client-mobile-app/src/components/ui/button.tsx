/**
 * Button.
 *
 * `variant` carries the *intent* (primary / confirm / danger / quiet) rather
 * than exposing raw colours, so a screen can never end up with a green primary
 * button. Every variant renders the same shape and respects
 * `loading` (spinner plus disabled state) and `fullWidth`.
 */

import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing, typography } from "@/theme";
import { Touchable } from "./pressable";

export type ButtonVariant = "primary" | "confirm" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

const SIZES: Record<ButtonSize, { height: number; paddingHorizontal: number; text: number; icon: number }> = {
  sm: { height: 36, paddingHorizontal: spacing.md, text: 13, icon: 16 },
  md: { height: 48, paddingHorizontal: spacing.xl, text: 15, icon: 18 },
  lg: { height: 56, paddingHorizontal: spacing.xxl, text: 16, icon: 20 },
};

function palette(variant: ButtonVariant, disabled: boolean) {
  if (disabled) {
    return { background: colors.surfaceSunken, text: colors.textMuted, border: colors.border };
  }

  switch (variant) {
    case "confirm":
      return { background: colors.success, text: colors.textInverse, border: colors.success };
    case "secondary":
      return { background: colors.background, text: colors.primary, border: colors.primary };
    case "danger":
      return { background: colors.danger, text: colors.textInverse, border: colors.danger };
    case "ghost":
      return { background: "transparent", text: colors.textSecondary, border: "transparent" };
    case "primary":
    default:
      return { background: colors.primary, text: colors.textInverse, border: colors.primary };
  }
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  accessibilityHint,
}: Props) {
  const metrics = SIZES[size];
  const isDisabled = disabled || loading;
  const tone = palette(variant, isDisabled);

  return (
    <Touchable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={[
        styles.base,
        {
          height: metrics.height,
          paddingHorizontal: metrics.paddingHorizontal,
          backgroundColor: tone.background,
          borderColor: tone.border,
        },
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={tone.text}
            style={styles.leading}
          />
        ) : icon ? (
          <Ionicons
            name={icon}
            size={metrics.icon}
            color={tone.text}
            style={styles.leading}
          />
        ) : null}

        <Text
          numberOfLines={1}
          style={[styles.label, { color: tone.text, fontSize: metrics.text }]}
        >
          {label}
        </Text>
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  leading: {
    marginRight: spacing.sm,
  },
  label: {
    ...typography.bodyStrong,
    textAlign: "center",
  },
});