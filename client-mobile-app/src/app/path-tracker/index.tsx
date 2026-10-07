/**
 * Path Tracker home.
 *
 * Two jobs: start a trip, and offer to resume one that was interrupted.
 *
 * Recovery is checked before anything else renders, because a user who closed the
 * app mid-trip and comes back must be told the trip is still there. Resuming
 * restores the persisted trip — distance, duration and path included — rather
 * than starting a new one and losing what was already recorded.
 */

import { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { Touchable } from "@/components/ui/pressable";
import { useToast } from "@/providers/toast-provider";
import {
  clearHistory,
  finishTrip,
  listTripHistory,
  readActiveTrip,
  writeActiveTrip,
} from "@/lib/path-tracker/tracker-store";
import { createTrip, type Trip, type TripSummary } from "@/lib/path-tracker/tracker";
import { formatDate, formatDateTime, formatDistance, formatDuration } from "@/lib/utils/format";
import * as ExpoLocation from "expo-location";
import { colors, radii, spacing, typography } from "@/theme";

export default function PathTrackerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [active, setActive] = useState<Trip | null>(null);
  const [history, setHistory] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const refresh = useCallback(async () => {
    const [trip, trips] = await Promise.all([readActiveTrip(), listTripHistory()]);
    setActive(trip);
    setHistory(trips);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Re-read on focus so returning from a finished trip shows the new history row.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const start = async () => {
    setStarting(true);
    try {
      const permission = await ExpoLocation.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        toast.show("Location access is needed to record a trip", "error");
        return;
      }

      const position = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.BestForNavigation,
      });

      const trip = createTrip({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        altitude: position.coords.altitude,
        accuracy: position.coords.accuracy,
        speed: position.coords.speed,
        timestamp: position.timestamp,
      });

      // Persisted immediately: a trip exists on disk before any movement is
      // recorded, so there is never an in-memory trip that a kill would lose.
      await writeActiveTrip(trip);
      router.push("/path-tracker/live");
    } catch {
      toast.show("We couldn't get a starting position. Try again outdoors.", "error");
    } finally {
      setStarting(false);
    }
  };

  const discard = async () => {
    await clearHistory();
    await refresh();
    toast.show("History cleared", "success");
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={styles.muted}>Loading trips…</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      data={history}
      keyExtractor={(trip) => trip.id}
      ListHeaderComponent={
        <View>
          <Text style={styles.heading}>Path Tracker</Text>
          <Text style={styles.intro}>
            Records your route in the background and keeps a history of past trips.
          </Text>

          {active ? (
            <Card style={styles.resume}>
              <View style={styles.resumeHeader}>
                <Ionicons name="play-circle" size={22} color={colors.success} />
                <Text style={styles.resumeTitle}>Trip in progress</Text>
              </View>

              <Text style={styles.resumeMeta}>
                Started {formatDateTime(active.startTime)} ·{" "}
                {formatDistance(active.totalDistance)} so far
              </Text>

              <View style={styles.resumeActions}>
                <Button
                  label="Resume"
                  variant="confirm"
                  style={styles.resumeButton}
                  onPress={() => router.push("/path-tracker/live")}
                />
                <Button
                  label="Finish"
                  variant="secondary"
                  style={styles.resumeButton}
                  onPress={async () => {
                    await finishTrip(active);
                    await refresh();
                    toast.show("Trip saved", "success");
                  }}
                />
              </View>
            </Card>
          ) : null}

          <View style={styles.startBlock}>
            <Button
              label={active ? "Start a new trip" : "Start tracking"}
              icon="navigate-outline"
              size="lg"
              fullWidth
              loading={starting}
              disabled={Boolean(active)}
              onPress={() => void start()}
            />
            {active ? (
              <Text style={styles.note}>
                Finish or resume the trip in progress before starting another.
              </Text>
            ) : null}
          </View>

          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Past trips</Text>
            {history.length > 0 ? (
              <Touchable
                onPress={() => void discard()}
                accessibilityRole="button"
                accessibilityLabel="Clear trip history"
              >
                <Text style={styles.clear}>Clear</Text>
              </Touchable>
            ) : null}
          </View>
        </View>
      }
      renderItem={({ item }) => <TripRow trip={item} />}
      ListEmptyComponent={
        <EmptyState
          title="No trips yet"
          description="Start tracking and your route, distance and time will appear here."
          icon="navigate-outline"
        />
      }
    />
  );
}

function TripRow({ trip }: { trip: TripSummary }) {
  return (
    <Card style={styles.tripRow}>
      <View style={styles.tripHeader}>
        <View style={styles.tripBody}>
          <Text style={styles.tripTitle}>{formatDate(trip.startTime)}</Text>
          <Text style={styles.tripMeta}>
            {formatDateTime(trip.startTime)} · {trip.pointCount}{" "}
            {trip.pointCount === 1 ? "point" : "points"}
          </Text>
        </View>

        {trip.returnedToStart ? (
          <Ionicons name="flag" size={16} color={colors.success} />
        ) : null}
      </View>

      <View style={styles.tripStats}>
        <Stat label="Distance" value={formatDistance(trip.totalDistance)} />
        <Stat label="Duration" value={formatDuration(trip.activeDurationMs)} />
      </View>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { ...typography.small, color: colors.textMuted },
  heading: { ...typography.title, color: colors.text },
  intro: { ...typography.small, color: colors.textMuted, marginTop: spacing.xs },
  resume: { marginTop: spacing.xl, borderColor: colors.success },
  resumeHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  resumeTitle: { ...typography.subheading, color: colors.text },
  resumeMeta: { ...typography.small, color: colors.textMuted, marginTop: spacing.xs },
  resumeActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  resumeButton: { flex: 1 },
  startBlock: { marginTop: spacing.xl },
  note: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xxxl,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.heading, color: colors.text },
  clear: { ...typography.smallStrong, color: colors.danger },
  tripRow: { marginBottom: spacing.md },
  tripHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tripBody: { flex: 1 },
  tripTitle: { ...typography.bodyStrong, color: colors.text },
  tripMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  tripStats: { flexDirection: "row", gap: spacing.xl, marginTop: spacing.md },
  stat: { flex: 1, backgroundColor: colors.surfaceMuted, borderRadius: radii.md, padding: spacing.md },
  statValue: { ...typography.subheading, color: colors.text },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});