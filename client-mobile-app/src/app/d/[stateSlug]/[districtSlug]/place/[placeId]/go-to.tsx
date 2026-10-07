/**
 * "How to get there".
 *
 * Opens the platform map app for directions rather than embedding a WebView, so
 * no map API key is required and the user gets live traffic and turn-by-turn in
 * whichever map app they already use.
 *
 * The optional "from my current location" origin needs a one-shot location fix.
 * If permission is refused the screen still works — the destination is simply
 * opened without an origin, which is the behaviour a user who declined should
 * get rather than an error.
 */

import { useEffect, useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ExpoLocation from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, DetailRow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { Touchable } from "@/components/ui/pressable";
import { useQuery } from "@/hooks/use-query";
import { useDistrict } from "@/providers/district-provider";
import { getPlaceById } from "@/services/places.service";
import {
  buildDirectionsUrl,
  buildOpenUrl,
  formatCoordinates,
  validPoint,
  type Coordinates,
} from "@/lib/utils/geo";
import { colors, spacing, typography } from "@/theme";

type TravelMode = "driving" | "walking" | "transit" | "bicycling";

const MODES: { id: TravelMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "driving", label: "Drive", icon: "car-outline" },
  { id: "walking", label: "Walk", icon: "walk-outline" },
  { id: "transit", label: "Transit", icon: "bus-outline" },
  { id: "bicycling", label: "Bike", icon: "bicycle-outline" },
];

export default function GoToScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { district } = useDistrict();

  const params = useLocalSearchParams<{ placeId?: string; districtSlug?: string }>();
  const placeId = params.placeId ?? "";

  const { data, loading } = useQuery(
    () => getPlaceById(district!.id, placeId),
    [placeId, district?.id],
    { enabled: Boolean(district?.id && placeId) },
  );

  const [mode, setMode] = useState<TravelMode>("driving");
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);

  // A stale fix from a previous visit would silently change the route offered.
  useEffect(() => {
    setOrigin(null);
    setLocationNote(null);
  }, [placeId]);

  const useMyLocation = async () => {
    setLocating(true);
    setLocationNote(null);

    try {
      const permission = await ExpoLocation.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        setLocationNote(
          "Location access was declined. Directions will start from the map app instead.",
        );
        return;
      }

      const position = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });

      setOrigin({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch {
      setLocationNote("We couldn't get your location. Try again when you have a signal.");
    } finally {
      setLocating(false);
    }
  };

  if (loading) return <LoadingState label="Loading directions…" />;

  if (!data) {
    return (
      <EmptyState
        title="No directions available"
        description="This place does not have a location recorded."
        icon="navigate-outline"
        action={{ label: "Go back", onPress: () => router.back() }}
      />
    );
  }

  if (!validPoint(data)) {
    return (
      <EmptyState
        title="Location not recorded"
        description="This listing does not have coordinates yet, so directions cannot be shown."
        icon="location-outline"
        action={{ label: "Go back", onPress: () => router.back() }}
      />
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
    >
      <Text style={styles.destination}>{data.name}</Text>
      <Text style={styles.coordinates}>{formatCoordinates(data)}</Text>

      <View style={styles.modes}>
        {MODES.map((item) => (
          <Chip
            key={item.id}
            label={item.label}
            icon={item.icon}
            selected={mode === item.id}
            onPress={() => setMode(item.id)}
          />
        ))}
      </View>

      <Card style={styles.card}>
        <DetailRow
          icon="navigate-circle-outline"
          label="Starting point"
          value={
            origin
              ? formatCoordinates(origin) ?? "Your location"
              : "Not set — we can use your current location"
          }
        />

        <Button
          label={origin ? "Use a different starting point" : "Use my current location"}
          variant="secondary"
          size="sm"
          icon="locate-outline"
          loading={locating}
          onPress={() => void useMyLocation()}
          style={styles.action}
        />

        {origin ? (
          <Touchable
            onPress={() => {
              setOrigin(null);
              setLocationNote(null);
            }}
            accessibilityRole="button"
            accessibilityLabel="Clear starting point"
            style={styles.clear}
          >
            <Text style={styles.clearText}>Clear</Text>
          </Touchable>
        ) : null}

        {locationNote ? <Text style={styles.note}>{locationNote}</Text> : null}
      </Card>

      <Button
        label={`Open ${MODES.find((m) => m.id === mode)?.label.toLowerCase()} directions`}
        icon="navigate"
        size="lg"
        fullWidth
        onPress={() => void Linking.openURL(buildDirectionsUrl(data, origin ?? undefined, mode))}
        style={styles.primary}
      />

      <Button
        label="Open place in Maps"
        variant="secondary"
        icon="map-outline"
        fullWidth
        onPress={() => void Linking.openURL(buildOpenUrl(data, data.name))}
        style={styles.action}
      />

      <Text style={styles.note}>
        Directions open in your maps app. Travel time and traffic come from that app, not
        from this listing.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  destination: { ...typography.title, color: colors.text },
  coordinates: { ...typography.small, color: colors.textMuted, marginTop: spacing.xs },
  modes: { flexDirection: "row", flexWrap: "wrap", marginTop: spacing.lg },
  card: { marginTop: spacing.md },
  action: { marginTop: spacing.md },
  primary: { marginTop: spacing.xl },
  clear: { alignSelf: "flex-end", marginTop: spacing.sm, padding: spacing.xs },
  clearText: { ...typography.smallStrong, color: colors.primary },
  note: { ...typography.small, color: colors.textMuted, marginTop: spacing.lg },
});