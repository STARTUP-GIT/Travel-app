/**
 * Root layout.
 *
 * Mounts the providers, holds the splash screen until branding has settled, and
 * installs the top-level stack. Two things are handled here rather than in a
 * route because they apply to every screen:
 *
 *   - Android hardware back. Expo Router handles it, but a modal-style screen
 *     (Search) must dismiss rather than pop an unexpected history entry.
 *   - A missing backend URL. This is a deployment mistake, so it gets a
 *     dedicated screen with instructions instead of a list of errors.
 */

import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { getNotifications } from "@/services/notification-helper";
import { Providers } from "@/providers";
import { useAppShell } from "@/providers/app-shell-provider";
import { colors, radii, spacing, typography } from "@/theme";
import { LoadingState } from "@/components/ui/states";
import { useTripStore } from "@/store/trip-store";
import { requestNotificationPermission } from "@/services/alert-service";

// Register background location task
import "@/services/background-trip-task";

// Foreground notification handler (safe for Expo Go and bare native)
const Notifications = getNotifications();
if (Notifications?.setNotificationHandler) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // ignore in environments without notification handler support
  }
}

// The splash stays up until the shell reports it has painted, avoiding the white
// flash between the native splash and the first React frame.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    requestNotificationPermission().catch(() => {});
    const store = useTripStore.getState();
    store
      .bootstrap()
      .then(() => {
        useTripStore.getState().loadHistory().catch(() => {});
      })
      .catch(() => {});
  }, []);

  return (
    <Providers>
      <StatusBar style="light" />
      {/* `useAppShell` must be read beneath `Providers`, so the hook lives in a
          child rather than in this component. */}
      <AppShellGate />
    </Providers>
  );
}

function AppShellGate() {
  const { loadingBranding, backendConfigured } = useAppShell();

  useEffect(() => {
    if (!loadingBranding) {
      void SplashScreen.hideAsync();
    }
  }, [loadingBranding]);

  if (!backendConfigured) {
    return <BackendNotConfigured />;
  }

  return <RootNavigator />;
}

function RootNavigator() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="explore" options={{ headerShown: false }} />
      <Stack.Screen name="search" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="reset-password" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
      <Stack.Screen name="favorites" options={{ headerShown: false }} />
      <Stack.Screen name="bookings" options={{ headerShown: false }} />
      <Stack.Screen name="bookings/[bookingId]" options={{ headerShown: false }} />
      <Stack.Screen name="report" options={{ headerShown: false }} />
      <Stack.Screen name="about" options={{ headerShown: false }} />
      <Stack.Screen name="path-tracker" options={{ headerShown: false }} />
      <Stack.Screen name="trip/[id]" options={{ headerShown: false, presentation: "card" }} />
      <Stack.Screen name="d/[stateSlug]/[districtSlug]" options={{ headerShown: false }} />
      <Stack.Screen name="account/edit" options={{ headerShown: false }} />
    </Stack>
  );
}

/**
 * Shown when `EXPO_PUBLIC_API_BASE_URL` is absent or malformed.
 *
 * Deliberately not an error toast: without a backend there is nothing to
 * recover to, so the screen states the fix and stops.
 */
function BackendNotConfigured() {
  return (
    <SafeAreaView style={styles.configScreen}>
      <View style={styles.configCard}>
        <Text style={styles.configTitle}>Setup needed</Text>
        <Text style={styles.configBody}>
          This build is not connected to a backend yet. Add the backend address to your
          environment file and restart the app.
        </Text>
        <View style={styles.configCode}>
          <Text style={styles.configCodeText}>EXPO_PUBLIC_API_BASE_URL=https://your-api.example.com</Text>
        </View>
        <Text style={styles.configHint}>
          Copy .env.example to .env, fill in the value, then restart the dev server.
        </Text>
      </View>
    </SafeAreaView>
  );
}

/** Shown while branding loads; also keeps the splash from revealing a blank app. */
export function SplashGate() {
  return <LoadingState label="Preparing…" />;
}

const styles = StyleSheet.create({
  configScreen: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  configCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  configTitle: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  configBody: {
    ...typography.body,
    color: colors.textSecondary,
  },
  configCode: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  configCodeText: {
    ...typography.small,
    color: colors.text,
    fontFamily: "monospace",
  },
  configHint: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});