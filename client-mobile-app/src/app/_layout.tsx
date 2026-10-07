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
import { Providers } from "@/providers";
import { useAppShell } from "@/providers/app-shell-provider";
import { colors, radii, spacing, typography } from "@/theme";
import { LoadingState } from "@/components/ui/states";

// The splash stays up until the shell reports it has painted, avoiding the white
// flash between the native splash and the first React frame.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
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
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textInverse,
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
        // A back gesture must never land on a screen the user cannot use.
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="explore" options={{ title: "Choose a destination" }} />
      <Stack.Screen name="search" options={{ title: "Search", presentation: "modal" }} />
      <Stack.Screen name="login" options={{ title: "Log in" }} />
      <Stack.Screen name="signup" options={{ title: "Create account" }} />
      <Stack.Screen name="bookings" options={{ title: "My bookings" }} />
      <Stack.Screen name="report" options={{ title: "Report a listing" }} />
      <Stack.Screen name="about" options={{ title: "About" }} />
      <Stack.Screen name="path-tracker/index" options={{ title: "Path Tracker" }} />
      <Stack.Screen name="path-tracker/live" options={{ title: "Tracking" }} />
      <Stack.Screen name="d/[stateSlug]/[districtSlug]/hotels" options={{ title: "Hotels" }} />
      <Stack.Screen name="d/[stateSlug]/[districtSlug]/restaurants" options={{ title: "Restaurants" }} />
      <Stack.Screen name="d/[stateSlug]/[districtSlug]/transport" options={{ title: "Get there" }} />
      <Stack.Screen name="d/[stateSlug]/[districtSlug]/place/[placeId]/index" options={{ title: "Place" }} />
      <Stack.Screen name="d/[stateSlug]/[districtSlug]/place/[placeId]/go-to" options={{ title: "How to get there" }} />
      <Stack.Screen name="d/[stateSlug]/[districtSlug]/guide/[guideId]/index" options={{ title: "Guide" }} />
      <Stack.Screen name="d/[stateSlug]/[districtSlug]/guide/[guideId]/book" options={{ title: "Book this guide" }} />
      <Stack.Screen name="d/[stateSlug]/[districtSlug]/tour-guide/[guideId]/index" options={{ title: "Tour Guide" }} />
      <Stack.Screen name="d/[stateSlug]/[districtSlug]/tour-guide/[guideId]/book" options={{ title: "Book a tour" }} />
      <Stack.Screen name="d/[stateSlug]/[districtSlug]/tour-package/[packageId]" options={{ title: "Package" }} />
      <Stack.Screen name="d/[stateSlug]/[districtSlug]/hotel-detail/[hotelId]" options={{ title: "Hotel" }} />
      <Stack.Screen name="d/[stateSlug]/[districtSlug]/hotel-detail/[hotelId]/book" options={{ title: "Book a stay" }} />
      <Stack.Screen name="d/[stateSlug]/[districtSlug]/restaurant-detail/[restaurantId]" options={{ title: "Restaurant" }} />
      <Stack.Screen
        name="d/[stateSlug]/[districtSlug]/restaurant-detail/[restaurantId]/reserve"
        options={{ title: "Reserve a table" }}
      />
      <Stack.Screen name="account/edit" options={{ title: "Edit profile" }} />
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