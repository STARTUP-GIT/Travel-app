/**
 * Reset password screen.
 *
 * Takes token (from deep link or user input), new password, and confirmation,
 * then posts to POST /api/auth/reset-password.
 */

import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Touchable } from "@/components/ui/pressable";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/providers/toast-provider";
import { resetPassword } from "@/services/auth.service";
import { colors, radii, spacing, typography } from "@/theme";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const params = useLocalSearchParams<{ token?: string }>();

  const [token, setToken] = useState(params.token ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ token?: string; password?: string; confirmPassword?: string }>({});
  const [busy, setBusy] = useState(false);
  const [completed, setCompleted] = useState(false);

  const onSubmit = async () => {
    const nextErrors: typeof errors = {};
    if (!token.trim()) nextErrors.token = "Enter the reset token from your email.";
    if (password.length < 6) nextErrors.password = "Password must be at least 6 characters.";
    if (password !== confirmPassword) nextErrors.confirmPassword = "Passwords do not match.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setBusy(true);
    try {
      const result = await resetPassword(token.trim(), password);
      if (!result.ok) {
        toast.show(result.message, "error");
        return;
      }
      toast.show("Password reset successfully!", "success");
      setCompleted(true);
    } catch {
      toast.show("Unable to reset password. Please try again.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (completed) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.iconCircle, { backgroundColor: colors.successLight }]}>
            <Ionicons name="checkmark-circle-outline" size={32} color={colors.success} />
          </View>
          <Text style={styles.title}>Password updated!</Text>
          <Text style={styles.subtitle}>
            Your password has been changed. You can now log in with your new credentials.
          </Text>
        </View>

        <Button
          label="Sign in now"
          onPress={() => router.replace("/login")}
          fullWidth
          size="lg"
          style={styles.submitBtn}
        />
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>Set new password</Text>
          <Text style={styles.subtitle}>
            Enter the token received in your email and choose a secure new password.
          </Text>
        </View>

        <TextField
          label="Reset token"
          value={token}
          onChangeText={(value) => {
            setToken(value);
            setErrors((curr) => ({ ...curr, token: undefined }));
          }}
          error={errors.token}
          placeholder="Paste or type reset token"
          required
          autoCapitalize="none"
        />

        <TextField
          label="New password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setErrors((curr) => ({ ...curr, password: undefined }));
          }}
          inputType="password"
          error={errors.password}
          placeholder="At least 6 characters"
          required
        />

        <TextField
          label="Confirm new password"
          value={confirmPassword}
          onChangeText={(value) => {
            setConfirmPassword(value);
            setErrors((curr) => ({ ...curr, confirmPassword: undefined }));
          }}
          inputType="password"
          error={errors.confirmPassword}
          placeholder="Re-enter new password"
          required
        />

        <Button
          label="Update password"
          onPress={onSubmit}
          loading={busy}
          fullWidth
          size="lg"
          style={styles.submitBtn}
        />

        <Touchable
          onPress={() => router.replace("/login")}
          accessibilityRole="button"
          style={styles.switchLink}
        >
          <Text style={styles.switchText}>
            Back to <Text style={styles.switchAccent}>Log in</Text>
          </Text>
        </Touchable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  header: { alignItems: "center", marginBottom: spacing.xxl },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  title: { ...typography.title, color: colors.text, textAlign: "center" },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  submitBtn: { marginTop: spacing.md },
  switchLink: { marginTop: spacing.xl, alignItems: "center" },
  switchText: { ...typography.body, color: colors.textSecondary },
  switchAccent: { color: colors.primary, fontWeight: "700" },
});
