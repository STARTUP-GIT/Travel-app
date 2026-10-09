/**
 * Mobile Path Tracker Hub.
 * Exact replication / parity with Website Path Tracker Hub.
 */

import React, { useCallback, useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { Touchable } from "@/components/ui/pressable";
import { useToast } from "@/providers/toast-provider";
import { useTripStore } from "@/lib/path-tracker/trip-store";
import { useTripSession } from "@/lib/path-tracker/useTripSession";
import { formatDistance, formatDuration } from "@/lib/path-tracker/geo";
import { formatDate, formatDateTime } from "@/lib/utils/format";
import type { TripSummary } from "@/lib/path-tracker/types";
import { triggerTap, triggerMediumTap } from "@/lib/path-tracker/alert-service";
import { colors, radii, spacing, typography } from "@/theme";

export default function PathTrackerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const session = useTripSession();

  const tripHistory = useTripStore((s) => s.tripHistory);
  const loadHistory = useTripStore((s) => s.loadHistory);
  const deleteTrip = useTripStore((s) => s.deleteTrip);
  const bootstrap = useTripStore((s) => s.bootstrap);
  const recoveredActive = useTripStore((s) => s.recoveredActive);
  const activeTrip = useTripStore((s) => s.activeTrip);
  const startTrip = useTripStore((s) => s.startTrip);
  const resumeRecoveredTrip = useTripStore((s) => s.resumeRecoveredTrip);
  const discardRecoveredTrip = useTripStore((s) => s.discardRecoveredTrip);

  const [starting, setStarting] = useState(false);

  useEffect(() => {
    void bootstrap();
    void loadHistory();
  }, [bootstrap, loadHistory]);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory]),
  );

  const start = async () => {
    setStarting(true);
    triggerMediumTap();
    try {
      if (!session.permissionGranted) {
        session.requestPermission();
      }
      await session.armTracking();
      await startTrip();
      router.push("/path-tracker/live");
    } catch {
      toast.show("Could not initialize GPS. Try again outdoors.", "error");
    } finally {
      setStarting(false);
    }
  };

  const resumeTrip = async () => {
    triggerMediumTap();
    if (recoveredActive) {
      await session.armTracking();
      await resumeRecoveredTrip(recoveredActive);
    }
    router.push("/path-tracker/live");
  };

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
      data={tripHistory}
      keyExtractor={(trip) => trip.id}
      ListHeaderComponent={
        <View>
          <Text style={styles.heading}>Path Tracker</Text>
          <Text style={styles.intro}>
            Track your journey with real device GPS. Your path never leaves this device.
          </Text>

          {recoveredActive ? (
            <Card style={styles.resume}>
              <View style={styles.resumeHeader}>
                <Ionicons name="alert-circle" size={22} color={colors.warning} />
                <Text style={styles.resumeTitle}>Unfinished Trip Found</Text>
              </View>

              <Text style={styles.resumeMeta}>
                Started {new Date(recoveredActive.startTime).toLocaleString()} ·{" "}
                {formatDistance(recoveredActive.totalDistance)} so far
              </Text>

              <View style={styles.resumeActions}>
                <Button
                  label="Continue trip"
                  variant="confirm"
                  style={styles.resumeButton}
                  onPress={() => void resumeTrip()}
                />
                <Button
                  label="Discard"
                  variant="secondary"
                  style={styles.resumeButton}
                  onPress={async () => {
                    triggerTap();
                    await discardRecoveredTrip();
                    toast.show("Unfinished trip discarded", "info");
                  }}
                />
              </View>
            </Card>
          ) : null}

          {activeTrip && !recoveredActive ? (
            <Card style={styles.resume}>
              <View style={styles.resumeHeader}>
                <Ionicons name="play-circle" size={22} color={colors.success} />
                <Text style={styles.resumeTitle}>Active Trip in Progress</Text>
              </View>
              <Text style={styles.resumeMeta}>
                Started {new Date(activeTrip.startTime).toLocaleString()} ·{" "}
                {formatDistance(activeTrip.totalDistance)} so far
              </Text>
              <View style={styles.resumeActions}>
                <Button
                  label="Open Live Tracker"
                  variant="confirm"
                  style={styles.resumeButton}
                  onPress={() => router.push("/path-tracker/live")}
                />
              </View>
            </Card>
          ) : null}

          <View style={styles.startBlock}>
            <Button
              label={activeTrip || recoveredActive ? "Start a new trip" : "Start tracking"}
              icon="navigate-outline"
              size="lg"
              fullWidth
              loading={starting}
              onPress={() => void start()}
            />
          </View>

          <View style={styles.historyHeader}>
            <Text style={styles.sectionTitle}>Your trips</Text>
            <Text style={styles.sectionSubtitle}>Completed routes on this device</Text>
          </View>
        </View>
      }
      renderItem={({ item }) => (
        <TripRow
          trip={item}
          onDelete={async () => {
            triggerTap();
            await deleteTrip(item.id);
            toast.show("Trip deleted", "info");
          }}
        />
      )}
      ListEmptyComponent={
        <EmptyState
          title="No trips yet"
          description="Complete a route and it will be saved here."
          icon="navigate-outline"
        />
      }
    />
  );
}

function TripRow({ trip, onDelete }: { trip: TripSummary; onDelete: () => void }) {
  return (
    <Card style={styles.tripRow}>
      <View style={styles.tripHeader}>
        <View style={styles.tripBody}>
          <Text style={styles.tripTitle}>{formatDate(trip.startTime)}</Text>
          <Text style={styles.tripMeta}>
            {formatDateTime(trip.startTime)} · {trip.pointCount}{" "}
            {trip.pointCount === 1 ? "point" : "points"}
            {trip.returnedToStart ? " · returned" : ""}
          </Text>
        </View>

        <Touchable
          onPress={onDelete}
          accessibilityRole="button"
          accessibilityLabel="Delete trip"
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </Touchable>
      </View>

      <View style={styles.tripStats}>
        <Stat label="DISTANCE" value={formatDistance(trip.totalDistance)} />
        <Stat label="DURATION" value={formatDuration(trip.activeDurationMs)} />
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
  heading: { ...typography.title, color: colors.text },
  intro: { ...typography.small, color: colors.textMuted, marginTop: spacing.xs },
  resume: { marginTop: spacing.xl, borderColor: colors.warning },
  resumeHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  resumeTitle: { ...typography.subheading, color: colors.text },
  resumeMeta: { ...typography.small, color: colors.textMuted, marginTop: spacing.xs },
  resumeActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  resumeButton: { flex: 1 },
  startBlock: { marginTop: spacing.xl },
  historyHeader: {
    marginTop: spacing.xxxl,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.heading, color: colors.text },
  sectionSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  tripRow: { marginBottom: spacing.md },
  tripHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tripBody: { flex: 1 },
  tripTitle: { ...typography.bodyStrong, color: colors.text },
  tripMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  deleteBtn: { padding: spacing.xs },
  tripStats: { flexDirection: "row", gap: spacing.xl, marginTop: spacing.md },
  stat: { flex: 1, backgroundColor: colors.surfaceMuted, borderRadius: radii.md, padding: spacing.md },
  statValue: { ...typography.subheading, color: colors.text },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});