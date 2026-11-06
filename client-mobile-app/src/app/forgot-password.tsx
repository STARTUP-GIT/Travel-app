/**
 * Forgot password screen.
 *
 * Calls POST /api/auth/forgot-password with { email, panel: "customer" }.
 * Displays confirmation state on submission without revealing whether the email
 * exists, matching the web application's security and UX pattern.
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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Touchable } from "@/components/ui/pressable";
import { TextField } from "@/components/ui/text-field";
import { Card } from "@/components/ui/card";
import { useToast } from "@/providers/toast-provider";
import { requestPasswordReset } from "@/services/auth.service";
import { EMAIL_PATTERN } from "@/lib/form-validation";
import { colors, radii, spacing, typography } from "@/theme";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Enter your email address.");
      return;
    }
    if (!EMAIL_PATTERN.test(trimmed)) {
      setError("Enter a valid email address.");
      return;
    }

    setError(undefined);
    setBusy(true);
    try {
      const result = await requestPasswordReset(trimmed);
      if (!result.ok) {
        toast.show(result.message, "error");
        return;
      }
      setSubmitted(true);
    } catch {
      toast.show("Unable to reach the server. Please try again later.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
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
            <Ionicons name="mail-open-outline" size={28} color={colors.success} />
          </View>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.subtitle}>
            If <Text style={styles.bold}>{email.trim()}</Text> is registered, a password reset link has been sent to your inbox.
          </Text>
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={styles.infoText}>
              The link expires in 1 hour. Be sure to check your spam or junk folder if it doesn't appear.
            </Text>
          </View>
        </Card>

        <Button
          label="Enter reset code"
          onPress={() => router.push("/reset-password")}
          variant="secondary"
          fullWidth
          size="lg"
          style={styles.actionGap}
        />

        <Button
          label="Back to sign in"
          onPress={() => router.replace("/login")}
          fullWidth
          size="lg"
          style={styles.actionGap}
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
            <Ionicons name="key-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>Forgot password?</Text>
          <Text style={styles.subtitle}>
            Enter your registered email address and we'll send you instructions to reset your password.
          </Text>
        </View>

        <TextField
          label="Email address"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setError(undefined);
          }}
          inputType="email"
          error={error}
          placeholder="you@example.com"
          required
          autoCapitalize="none"
        />

        <Button
          label="Send reset link"
          icon="mail-outline"
          onPress={onSubmit}
          loading={busy}
          fullWidth
          size="lg"
          style={styles.submitBtn}
        />

        <Touchable
          onPress={() => router.push("/reset-password")}
          accessibilityRole="button"
          style={styles.switchLink}
        >
          <Text style={styles.switchText}>
            Already have a reset token? <Text style={styles.switchAccent}>Reset here</Text>
          </Text>
        </Touchable>

        <Touchable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={styles.switchLink}
        >
          <Text style={styles.switchText}>
            Remember your password? <Text style={styles.switchAccent}>Sign in</Text>
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
  bold: { color: colors.text, fontWeight: "700" },
  infoCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.xxl,
  },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  infoText: { ...typography.small, color: colors.textSecondary, flex: 1, lineHeight: 20 },
  submitBtn: { marginTop: spacing.md },
  actionGap: { marginBottom: spacing.md },
  switchLink: { marginTop: spacing.xl, alignItems: "center" },
  switchText: { ...typography.body, color: colors.textSecondary },
  switchAccent: { color: colors.primary, fontWeight: "700" },
});
