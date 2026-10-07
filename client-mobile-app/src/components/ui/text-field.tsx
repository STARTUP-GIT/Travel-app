/**
 * Text field.
 *
 * Handles the three things every form in this app needs and which are easy to get
 * wrong per-screen: a visible label (so a placeholder is never the only label),
 * inline validation, and a password field with a reveal toggle. Native
 * `autoComplete`/`keyboardType` are set per `inputType` so autofill and the right
 * keyboard appear on both platforms.
 */

import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing, typography } from "@/theme";
import { Touchable } from "./pressable";

export type FieldInputType = "text" | "email" | "password" | "phone" | "number";

type Props = Omit<TextInputProps, "style"> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  inputType?: FieldInputType;
  error?: string | null;
  hint?: string;
  required?: boolean;
  multiline?: boolean;
};

const AUTOCOMPLETE: Record<FieldInputType, TextInputProps["autoComplete"]> = {
  text: "name",
  email: "email",
  password: "current-password",
  phone: "tel",
  number: "off",
};

const KEYBOARD: Record<FieldInputType, KeyboardTypeOptions> = {
  text: "default",
  email: "email-address",
  password: "default",
  phone: "phone-pad",
  number: "number-pad",
};

export function TextField({
  label,
  value,
  onChangeText,
  inputType = "text",
  error,
  hint,
  required = false,
  multiline = false,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const isPassword = inputType === "password";

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>

      <View
        style={[
          styles.inputRow,
          multiline && styles.inputRowMultiline,
          focused && styles.inputRowFocused,
          Boolean(error) && styles.inputRowError,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[styles.input, multiline && styles.inputMultiline]}
          placeholderTextColor={colors.textMuted}
          autoCapitalize={inputType === "email" ? "none" : "sentences"}
          autoCorrect={inputType === "text" && !multiline}
          autoComplete={rest.autoComplete ?? AUTOCOMPLETE[inputType]}
          keyboardType={KEYBOARD[inputType]}
          secureTextEntry={isPassword && !revealed}
          textContentType={inputType === "email" ? "emailAddress" : undefined}
          accessibilityLabel={required ? `${label}, required` : label}
          accessibilityState={{ disabled: rest.editable === false }}
          multiline={multiline}
          {...rest}
        />

        {isPassword ? (
          <Touchable
            onPress={() => setRevealed((current) => !current)}
            accessibilityRole="button"
            accessibilityLabel={revealed ? "Hide password" : "Show password"}
            hitSlop={8}
            style={styles.reveal}
          >
            <Ionicons
              name={revealed ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={colors.textMuted}
            />
          </Touchable>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.smallStrong,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.danger,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  inputRowMultiline: {
    alignItems: "flex-start",
    paddingVertical: spacing.md,
  },
  inputRowFocused: {
    borderColor: colors.primary,
  },
  inputRowError: {
    borderColor: colors.danger,
  },
  input: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    paddingVertical: spacing.md,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  reveal: {
    paddingLeft: spacing.sm,
  },
  error: {
    ...typography.small,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  hint: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});