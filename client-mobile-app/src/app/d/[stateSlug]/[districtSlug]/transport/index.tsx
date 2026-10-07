/**
 * Transport estimates for getting around a district.
 *
 * There is no transport backend, so nothing here is a booking. The screen is
 * explicit about that in two places — the distance is labelled "straight line",
 * and every fare is an estimate — because a number that looks like a quote is
 * worse than no number at all.
 *
 * Estimates are built from the great-circle distance between the device fix and
 * the chosen destination, priced with the reference rates in
 * `transport.service`. Road distance and real fares would need a routing and rate
 * provider; when those arrive only `straightLineMeters` and `estimateFare` change.
 *
 * Saved plans are kept on the device, matching the web app, so a user can compare
 * options later without the app pretending an operator has confirmed anything.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as ExpoLocation from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, InfoRow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Touchable } from "@/components/ui/pressable";
import { useToast } from "@/providers/toast-provider";
import { useDistrict } from "@/providers/district-provider";
import {
  deleteTransportPlan,
  listTransportOptions,
  listTransportPlans,
  saveTransportPlan,
  straightLineMeters,
  type TransportMode,
  type TransportPlan,
} from "@/services/transport.service";
import { formatCurrency } from "@/lib/utils/format";
import type { Coordinates } from "@/lib/utils/geo";
import { validPoint } from "@/lib/utils/geo";
import { colors, radii, spacing, typography } from "@/theme";

export default function TransportScreen() {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { places } = useDistrict();

  const params = useLocalSearchParams<{ stateSlug?: string; districtSlug?: string }>();
  void params;

  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationNote, setLocationNote] = useState<string | null>(null);
  const [destinationId, setDestinationId] = useState<string | null>(null);
  const [plans, setPlans] = useState<TransportPlan[]>([]);

  // Places without coordinates cannot be priced, so they are filtered out rather
  // than listed and silently producing an unknown fare.
  const destinations = useMemo(
    () => places.filter((place) => validPoint(place)),
    [places],
  );

  const destination = useMemo(
    () => destinations.find((place) => place.id === destinationId) ?? destinations[0] ?? null,
    [destinations, destinationId],
  );

  const refreshPlans = useCallback(async () => {
    setPlans(await listTransportPlans());
  }, []);

  useEffect(() => {
    void refreshPlans();
  }, [refreshPlans]);

  const distanceMeters = origin && destination ? straightLineMeters(origin, destination) : null;
  const options = useMemo(() => listTransportOptions(distanceMeters), [distanceMeters]);

  const useMyLocation = async () => {
    setLocating(true);
    setLocationNote(null);

    try {
      const permission = await ExpoLocation.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setLocationNote(
          "Location access was declined. You can still browse options from a chosen starting point.",
        );
        return;
      }

      const position = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });

      setOrigin({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch {
      setLocationNote("We couldn't get your location. Try again when you have a signal.");
    } finally {
      setLocating(false);
    }
  };

  const savePlan = async (mode: TransportMode) => {
    if (!destination) return;

    const option = options.find((item) => item.id === mode);
    if (!option || option.fareEstimate === null) {
      toast.show("We need your location before estimating a fare", "info");
      return;
    }

    await saveTransportPlan({
      mode,
      distanceMeters,
      fareEstimate: option.fareEstimate,
      originLabel: "Your location",
      destinationLabel: destination.name,
    });

    await refreshPlans();
    toast.show("Estimate saved", "success");
  };

  const removePlan = async (id: string) => {
    await deleteTransportPlan(id);
    await refreshPlans();
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
    >
      <Text style={styles.heading}>Getting around</Text>
      <Text style={styles.intro}>
        Fares below are estimates based on the straight-line distance from your
        location. Real road distance and operator rates will differ.
      </Text>

      <Button
        label={origin ? "Update my location" : "Use my current location"}
        variant={origin ? "secondary" : "primary"}
        icon="locate-outline"
        loading={locating}
        onPress={() => void useMyLocation()}
        style={styles.locate}
      />

      {locationNote ? <Text style={styles.note}>{locationNote}</Text> : null}

      {destinations.length === 0 ? (
        <EmptyState
          title="No destinations with a location"
          description="Transport estimates need a place with recorded coordinates."
          icon="navigate-outline"
        />
      ) : (
        <>
          <Text style={styles.sectionTitle}>Heading to</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {destinations.map((place) => (
              <Chip
                key={place.id}
                label={place.name}
                selected={place.id === destination?.id}
                onPress={() => setDestinationId(place.id)}
              />
            ))}
          </ScrollView>

          {destination ? (
            <Card style={styles.summary}>
              <InfoRow label="Destination" value={destination.name} />
              <InfoRow
                label="Straight-line distance"
                value={
                  distanceMeters === null
                    ? "Set your location to estimate"
                    : distanceMeters < 1000
                      ? `${Math.round(distanceMeters)} m`
                      : `${(distanceMeters / 1000).toFixed(1)} km`
                }
              />
            </Card>
          ) : null}

          <Text style={styles.sectionTitle}>Estimated fares</Text>

          {options.map((option) => (
            <Card key={option.id} style={styles.option}>
              <View style={styles.optionHeader}>
                <View style={styles.optionTitle}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <Text style={styles.optionSeats}>
                    Seats {option.seats} · {option.description}
                  </Text>
                </View>

                <Text style={styles.fare}>
                  {option.fareEstimate === null
                    ? "—"
                    : `${formatCurrency(option.fareEstimate) ?? "—"}`}
                </Text>
              </View>

              <Button
                label="Save estimate"
                variant="ghost"
                size="sm"
                disabled={option.fareEstimate === null}
                onPress={() => void savePlan(option.id)}
                style={styles.save}
              />
            </Card>
          ))}

          <View style={styles.warning}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
            <Text style={styles.warningText}>
              These are estimates, not bookings. No operator has been contacted and no
              ride is reserved.
            </Text>
          </View>
        </>
      )}

      {plans.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>Saved estimates</Text>

          {plans.map((plan) => (
            <Touchable
              key={plan.id}
              onPress={() => void removePlan(plan.id)}
              accessibilityRole="button"
              accessibilityLabel={`Remove saved estimate to ${plan.destinationLabel}`}
              style={styles.planRow}
            >
              <View style={styles.planBody}>
                <Text style={styles.planTitle}>{plan.destinationLabel}</Text>
                <Text style={styles.planMeta}>
                  {plan.distanceMeters !== null
                    ? plan.distanceMeters < 1000
                      ? `${Math.round(plan.distanceMeters)} m`
                      : `${(plan.distanceMeters / 1000).toFixed(1)} km`
                    : "Distance unknown"}{" "}
                  ·{" "}
                  {formatCurrency(plan.fareEstimate) ?? "—"} estimate
                </Text>
              </View>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Touchable>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  heading: { ...typography.title, color: colors.text },
  intro: { ...typography.small, color: colors.textMuted, marginTop: spacing.xs },
  locate: { marginTop: spacing.lg },
  note: { ...typography.caption, color: colors.warning, marginTop: spacing.sm },
  sectionTitle: { ...typography.subheading, color: colors.text, marginTop: spacing.xxl, marginBottom: spacing.md },
  chipRow: { paddingRight: spacing.xl },
  summary: { marginTop: spacing.md },
  option: { marginBottom: spacing.md },
  optionHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  optionTitle: { flex: 1 },
  optionLabel: { ...typography.subheading, color: colors.text },
  optionSeats: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  fare: { ...typography.heading, color: colors.successDark },
  save: { alignSelf: "flex-start", marginTop: spacing.sm },
  warning: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.warningLight,
    marginTop: spacing.md,
  },
  warningText: { ...typography.small, color: colors.warning, flex: 1 },
  planRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  planBody: { flex: 1 },
  planTitle: { ...typography.bodyStrong, color: colors.text },
  planMeta: { ...typography.small, color: colors.textMuted },
});