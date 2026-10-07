/**
 * District route group.
 *
 * Mounts `DistrictProvider` for every screen under
 * `/d/:stateSlug/:districtSlug/...`, so the slug is resolved to a real district id
 * once and shared by the tab screens and every pushed detail screen.
 *
 * The stack starts on the tabs and keeps the native header off them (each tab
 * draws its own district header) while detail screens get a header with a back
 * button — which is also what makes Android's hardware back behave correctly.
 */

import { Stack, router as expoRouter, useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { DistrictProvider, useDistrict } from "@/providers/district-provider";
import { LoadingState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { colors, spacing, typography } from "@/theme";

export default function DistrictLayout() {
  const params = useLocalSearchParams<{ districtSlug?: string }>();
  const districtSlug = params.districtSlug ?? "";

  if (!districtSlug) {
    // A missing slug means the route was reached by a malformed link. Nothing can
    // be resolved, and a default district would be a lie.
    return <MissingSlug />;
  }

  return (
    <DistrictProvider districtSlug={districtSlug}>
      <DistrictStack />
    </DistrictProvider>
  );
}

function DistrictStack() {
  const { status, error, reload } = useDistrict();

  if (status === "loading" || status === "idle") {
    return <LoadingState label="Opening destination…" />;
  }

  if (status === "not-found") {
    return (
      <Centered
        title="Destination unavailable"
        body="This destination is not published, or it is no longer enabled for tourism."
        action={{ label: "Choose another", onPress: () => expoRouter.replace("/explore") }}
      />
    );
  }

  if (status === "error") {
    return (
      <Centered
        title="Couldn't load this destination"
        body={error ?? "Please check your connection and try again."}
        action={{ label: "Try again", onPress: reload }}
      />
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: colors.textInverse,
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="hotels" options={{ title: "Hotels" }} />
      <Stack.Screen name="restaurants" options={{ title: "Restaurants" }} />
      <Stack.Screen name="transport" options={{ title: "Get there" }} />
      <Stack.Screen name="place/[placeId]/index" options={{ title: "Place" }} />
      <Stack.Screen name="place/[placeId]/go-to" options={{ title: "How to get there" }} />
      <Stack.Screen name="guide/[guideId]/index" options={{ title: "Guide" }} />
      <Stack.Screen name="guide/[guideId]/book" options={{ title: "Book this guide" }} />
      <Stack.Screen name="tour-guide/[guideId]/index" options={{ title: "Tour Guide" }} />
      <Stack.Screen name="tour-guide/[guideId]/book" options={{ title: "Book a tour" }} />
      <Stack.Screen name="tour-package/[packageId]" options={{ title: "Package" }} />
      <Stack.Screen name="hotel-detail/[hotelId]" options={{ title: "Hotel" }} />
      <Stack.Screen name="hotel-detail/[hotelId]/book" options={{ title: "Book a stay" }} />
      <Stack.Screen
        name="restaurant-detail/[restaurantId]"
        options={{ title: "Restaurant" }}
      />
      <Stack.Screen
        name="restaurant-detail/[restaurantId]/reserve"
        options={{ title: "Reserve a table" }}
      />
    </Stack>
  );
}

function Centered({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.centered}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
      <Button label={action.label} onPress={action.onPress} variant="secondary" />
    </View>
  );
}

function MissingSlug() {
  return (
    <Centered
      title="Unknown destination"
      body="This link is missing a destination."
      action={{ label: "Choose a destination", onPress: () => expoRouter.replace("/explore") }}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  title: { ...typography.title, color: colors.text, marginBottom: spacing.sm },
  body: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
});