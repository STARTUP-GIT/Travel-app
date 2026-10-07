/**
 * Log in screen.
 *
 * Posts to the backend's existing `POST /users/api/auth/signin`. The response
 * carries the session JWT, which the auth provider stores in the secure store;
 * this screen never touches the token.
 *
 * `returnTo` is honoured on success so signing in from a deep link lands the user
 * back where they were instead of on the landing page.
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
import { Divider } from "@/components/ui/divider";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { signInWithGoogleAccount } from "@/lib/google-auth";
import {
  hasErrors,
  validateSignin,
  type FieldErrors,
} from "@/lib/form-validation";
import { ApiError, toUserMessage } from "@/lib/api/client";
import { colors, radii, spacing, typography } from "@/theme";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signIn, signInWithGoogle } = useAuth();
  const toast = useToast();

  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const finish = () => {
    // `replace` so the back gesture from the destination cannot return to the
    // login form the user has just completed.
    if (returnTo) router.replace(returnTo);
    else router.back();
  };

  const onSubmit = async () => {
    const validation = validateSignin({ email, password });
    setErrors(validation);
    setFormError(null);
    if (hasErrors(validation)) return;

    setBusy(true);
    try {
      await signIn({ email: email.trim(), password });
      toast.show("Welcome back", "success");
      finish();
    } catch (error) {
      setFormError(toUserMessage(error, "We couldn't sign you in. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setGoogleBusy(true);
    setFormError(null);

    try {
      const result = await signInWithGoogleAccount();

      if (result.status === "cancelled") {
        // The user closed the browser: nothing to report.
        return;
      }
      if (result.status === "unavailable") {
        setFormError(result.reason);
        return;
      }

      await signInWithGoogle(result.identity);
      toast.show("Signed in with Google", "success");
      finish();
    } catch (error) {
      // `409` never escapes the service layer, so this is a real failure.
      setFormError(
        error instanceof ApiError && error.kind === "not_found"
          ? "No account exists for that Google email yet. Create an account first."
          : toUserMessage(error, "Google sign-in failed. Please try again."),
      );
    } finally {
      setGoogleBusy(false);
    }
  };

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
            <Ionicons name="person-outline" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Sign in to book guides, reserve stays and keep your saved places.
          </Text>
        </View>

        {formError ? (
          <View style={styles.errorBanner} accessibilityRole="alert">
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={styles.errorBannerText}>{formError}</Text>
          </View>
        ) : null}

        <TextField
          label="Email"
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            setErrors((current) => ({ ...current, email: undefined }));
          }}
          inputType="email"
          error={errors.email}
          placeholder="you@example.com"
          required
          autoCapitalize="none"
        />

        <TextField
          label="Password"
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            setErrors((current) => ({ ...current, password: undefined }));
          }}
          inputType="password"
          error={errors.password}
          placeholder="Your password"
          required
        />

        <Button
          label="Log in"
          onPress={onSubmit}
          loading={busy}
          disabled={googleBusy}
          fullWidth
          size="lg"
        />

        <View style={styles.orRow}>
          <Divider style={styles.divider} />
          <Text style={styles.orText}>or</Text>
          <Divider style={styles.divider} />
        </View>

        <Button
          label="Continue with Google"
          onPress={onGoogle}
          variant="secondary"
          icon="logo-google"
          loading={googleBusy}
          disabled={busy}
          fullWidth
          size="lg"
        />

        <Touchable
          onPress={() => router.push("/signup")}
          accessibilityRole="button"
          style={styles.switchLink}
        >
          <Text style={styles.switchText}>
            New here? <Text style={styles.switchAccent}>Create an account</Text>
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
  title: { ...typography.title, color: colors.text },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.dangerLight,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorBannerText: { ...typography.small, color: colors.danger, flex: 1 },
  orRow: { flexDirection: "row", alignItems: "center", marginVertical: spacing.xl },
  divider: { flex: 1 },
  orText: {
    ...typography.small,
    color: colors.textMuted,
    marginHorizontal: spacing.md,
  },
  switchLink: { marginTop: spacing.xxl, alignItems: "center" },
  switchText: { ...typography.body, color: colors.textSecondary },
  switchAccent: { color: colors.primary, fontWeight: "700" },
});