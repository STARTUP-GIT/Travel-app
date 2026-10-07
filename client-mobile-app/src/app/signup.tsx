/**
 * Create-account screen.
 *
 * Posts to the backend's existing `POST /users/api/auth/signup`, which returns
 * only a 201 message and no token — so after registering, this screen signs the
 * new user in automatically rather than making them type their password twice.
 *
 * Field constraints mirror the backend's zod schema exactly, including the phone
 * number (10–15 digits) which the customer web form also collects.
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
import { TextField } from "@/components/ui/text-field";
import { Divider } from "@/components/ui/divider";
import { Touchable } from "@/components/ui/pressable";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { signInWithGoogleAccount } from "@/lib/google-auth";
import {
  hasErrors,
  mapServerFieldErrors,
  validateSignup,
  type FieldErrors,
} from "@/lib/form-validation";
import { ApiError, toUserMessage } from "@/lib/api/client";
import { colors, radii, spacing, typography } from "@/theme";

const SERVER_FIELDS = ["fullname", "username", "email", "phonenumber", "password"];

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signUp, signIn, signInWithGoogle } = useAuth();
  const toast = useToast();

  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();

  const [values, setValues] = useState({
    fullname: "",
    username: "",
    email: "",
    phonenumber: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const update = (key: keyof typeof values, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const finish = () => {
    if (returnTo) router.replace(returnTo);
    else router.back();
  };

  const onSubmit = async () => {
    const validation = validateSignup(values);
    setErrors(validation);
    setFormError(null);
    if (hasErrors(validation)) return;

    setBusy(true);
    try {
      await signUp({
        fullname: values.fullname.trim(),
        username: values.username.trim(),
        email: values.email.trim(),
        phonenumber: values.phonenumber.replace(/\D/g, ""),
        password: values.password,
        provider: "email",
      });

      // Signup returns no token, so establish the session immediately.
      await signIn({ email: values.email.trim(), password: values.password });

      toast.show("Account created", "success");
      finish();
    } catch (error) {
      if (error instanceof ApiError) {
        const mapped = mapServerFieldErrors(error.fieldErrors, SERVER_FIELDS);
        if (Object.keys(mapped).length > 0) {
          setErrors(mapped);
          setFormError(error.message);
          setBusy(false);
          return;
        }
      }
      setFormError(toUserMessage(error, "We couldn't create your account. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const onGoogle = async () => {
    setGoogleBusy(true);
    setFormError(null);

    try {
      const result = await signInWithGoogleAccount();

      if (result.status === "cancelled") return;
      if (result.status === "unavailable") {
        setFormError(result.reason);
        return;
      }

      await signInWithGoogle(result.identity);
      toast.show("Signed in with Google", "success");
      finish();
    } catch (error) {
      setFormError(
        error instanceof ApiError && error.kind === "not_found"
          ? "We couldn't link that Google account. Please try again."
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
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            One account for bookings, saved places and trip history.
          </Text>
        </View>

        {formError ? (
          <View style={styles.errorBanner} accessibilityRole="alert">
            <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
            <Text style={styles.errorBannerText}>{formError}</Text>
          </View>
        ) : null}

        <TextField
          label="Full name"
          value={values.fullname}
          onChangeText={(value) => update("fullname", value)}
          error={errors.fullname}
          placeholder="Your name"
          required
        />

        <TextField
          label="Username"
          value={values.username}
          onChangeText={(value) => update("username", value)}
          error={errors.username}
          hint="At least 3 characters. Shown on reviews you post."
          autoCapitalize="none"
          required
        />

        <TextField
          label="Email"
          value={values.email}
          onChangeText={(value) => update("email", value)}
          inputType="email"
          error={errors.email}
          placeholder="you@example.com"
          autoCapitalize="none"
          required
        />

        <TextField
          label="Phone number"
          value={values.phonenumber}
          onChangeText={(value) => update("phonenumber", value)}
          inputType="phone"
          error={errors.phonenumber}
          hint="10 to 15 digits."
          placeholder="9876543210"
          required
        />

        <TextField
          label="Password"
          value={values.password}
          onChangeText={(value) => update("password", value)}
          inputType="password"
          error={errors.password}
          hint="At least 6 characters."
          required
        />

        <TextField
          label="Confirm password"
          value={values.confirmPassword}
          onChangeText={(value) => update("confirmPassword", value)}
          inputType="password"
          error={errors.confirmPassword}
          required
        />

        <Button
          label="Create account"
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
          onPress={() => router.replace("/login")}
          accessibilityRole="button"
          style={styles.switchLink}
        >
          <Text style={styles.switchText}>
            Already have an account? <Text style={styles.switchAccent}>Log in</Text>
          </Text>
        </Touchable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  header: { marginBottom: spacing.xl },
  title: { ...typography.title, color: colors.text },
  subtitle: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
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
  orText: { ...typography.small, color: colors.textMuted, marginHorizontal: spacing.md },
  switchLink: { marginTop: spacing.xl, alignItems: "center" },
  switchText: { ...typography.body, color: colors.textSecondary },
  switchAccent: { color: colors.primary, fontWeight: "700" },
});