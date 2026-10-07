/**
 * Auth gating.
 *
 * The customer web app gates protected screens behind an `AuthGate` that offers
 * "Log in" and "Back to home". The same two affordances exist here, with the
 * crucial difference that on a phone the *return* path must be preserved — a
 * deep link into a booking screen is useless if signing in drops you on the
 * landing page, so the signed-out view explains why and navigates back.
 *
 * Screens pass the `path` they would have shown, which is used both for the
 * "back to where you were" wording and as the redirect after a successful sign-in.
 */

import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/ui/states";
import { colors, radii, spacing, typography } from "@/theme";

type Props = {
  children: React.ReactNode;
  /** Route to return to once signed in. Defaults to the current screen. */
  returnTo?: string;
};

export function AuthGate({ children, returnTo }: Props) {
  const { status } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Reading the token is async, so showing the sign-in wall before it resolves
  // would flash "signed out" at a signed-in user on every cold start.
  if (status === "checking") {
    return <LoadingState label="Checking your session…" />;
  }

  if (status === "signed-in") {
    return <>{children}</>;
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + spacing.xxl }]}>
      <View style={styles.iconCircle}>
        <Ionicons name="lock-closed-outline" size={30} color={colors.primary} />
      </View>

      <Text style={styles.title}>Sign in required</Text>
      <Text style={styles.body}>
        You need to be signed in to view this page. Your saved items and bookings stay
        attached to your account.
      </Text>

      <View style={styles.actions}>
        <Button
          label="Log in"
          onPress={() => router.push(returnTo ? { pathname: "/login", params: { returnTo } } : "/login")}
          fullWidth
          icon="log-in-outline"
        />
        <Button
          label="Create an account"
          onPress={() =>
            router.push(returnTo ? { pathname: "/signup", params: { returnTo } } : "/signup")
          }
          variant="secondary"
          fullWidth
          style={styles.secondaryAction}
        />
        <Button
          label="Back to home"
          onPress={() => router.replace("/")}
          variant="ghost"
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xxl,
  },
  actions: {
    alignSelf: "stretch",
  },
  secondaryAction: {
    marginTop: spacing.md,
  },
});