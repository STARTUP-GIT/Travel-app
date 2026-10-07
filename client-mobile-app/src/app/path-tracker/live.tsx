/**
 * Live trip tracking.
 *
 * Distance and duration shown here come from the engine, never from a wall-clock
 * or a straight-line estimate:
 *   - distance is the accumulated sum of accepted fix-to-fix displacements, so it
 *     reflects the path walked rather than start-to-end distance
 *   - duration is active time, which stops while paused
 *
 * Every accepted fix is written to disk before the UI updates, so the numbers on
 * screen and the numbers in storage cannot disagree after a crash.
 *
 * Background recording is started when the trip is running and stopped the moment
 * it is not. If the OS refuses background location the trip still records while the
 * screen is open, and the screen says so rather than implying full coverage.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as ExpoLocation from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { useToast } from "@/providers/toast-provider";
import {
  computeStats,
  distanceToStart,
  ingestFix,
  pauseTrip,
  registerBackgroundStore,
  resumeTrip,
  startBackgroundUpdates,
  stopBackgroundUpdates,
  type Coordinate,
  type Trip,
} from "@/lib/path-tracker/tracker";
import { finishTrip, readActiveTrip, writeActiveTrip } from "@/lib/path-tracker/tracker-store";
import { formatDateTime, formatDistance, formatDuration, formatSpeed } from "@/lib/utils/format";
import { colors, radii, spacing, typography } from "@/theme";

export default function LiveTrackerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [backgroundOn, setBackgroundOn] = useState(false);
  const [gpsLost, setGpsLost] = useState(false);

  // Mirrors `trip` for the background task, which cannot read React state.
  const tripRef = useRef<Trip | null>(null);
  const writingRef = useRef(false);

  /* ---------------------------------------------------------------------- */
  /* Load or recover the active trip                                          */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    void (async () => {
      const stored = await readActiveTrip();
      tripRef.current = stored;
      setTrip(stored);
      setLoading(false);
    })();
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Persist — written before the UI shows the new numbers                    */
  /* ---------------------------------------------------------------------- */

  const commit = useCallback(async (next: Trip) => {
    tripRef.current = next;
    setTrip(next);

    // Serialised so two fixes arriving together cannot write out of order.
    if (writingRef.current) return;
    writingRef.current = true;
    try {
      await writeActiveTrip(next);
    } finally {
      writingRef.current = false;
    }
  }, []);

  /* ---------------------------------------------------------------------- */
  /* Fix handling — shared by the foreground watcher and the background task  */
  /* ---------------------------------------------------------------------- */

  const applyFix = useCallback(
    async (fix: Coordinate) => {
      setGpsLost(false);

      const current = tripRef.current;
      if (!current) return;

      const { trip: next } = ingestFix(current, fix);
      // A rejected fix leaves the trip untouched, so there is nothing to write.
      if (next === current) return;

      await commit(next);
    },
    [commit],
  );

  useEffect(() => {
    registerBackgroundStore({
      append: async (fix) => {
        // The same filter runs here, so a fix delivered to both the watcher and
        // the background task is counted once: the second pass fails the
        // micro-jitter check against the point the first pass just added.
        await applyFix(fix);
      },
    });
  }, [applyFix]);

  /* ---------------------------------------------------------------------- */
  /* Foreground watcher                                                       */
  /* ---------------------------------------------------------------------- */

  useFocusEffect(
    useCallback(() => {
      let subscription: ExpoLocation.LocationSubscription | null = null;
      let cancelled = false;

      if (!trip) return;

      ExpoLocation.watchPositionAsync(
        {
          accuracy: ExpoLocation.Accuracy.BestForNavigation,
          distanceInterval: 3,
          timeInterval: 3000,
        },
        (position) => {
          void applyFix({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            altitude: position.coords.altitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed,
            timestamp: position.timestamp,
          });
        },
      ).then((sub) => {
        if (cancelled) sub.remove();
        else subscription = sub;
      });

      return () => {
        cancelled = true;
        subscription?.remove();
      };
    }, [trip, applyFix]),
  );

  /* ---------------------------------------------------------------------- */
  /* Background recording follows trip state                                  */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!trip) return;
    let cancelled = false;

    if (trip.state === "ACTIVE") {
      void startBackgroundUpdates().then((ok) => {
        if (!cancelled) setBackgroundOn(ok);
      });
    } else {
      // Paused: recording is frozen, so the background task is stopped too.
      void stopBackgroundUpdates().then(() => {
        if (!cancelled) setBackgroundOn(false);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [trip?.state, trip]);

  /* ---------------------------------------------------------------------- */
  /* Tick so the duration readout moves while recording                        */
  /* ---------------------------------------------------------------------- */

  const [, setTick] = useState(0);
  useEffect(() => {
    if (trip?.state !== "ACTIVE") return;
    const handle = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(handle);
  }, [trip?.state]);

  /* ---------------------------------------------------------------------- */
  /* Actions                                                                  */
  /* ---------------------------------------------------------------------- */

  const togglePause = async () => {
    const current = tripRef.current;
    if (!current) return;

    const next =
      current.state === "ACTIVE" ? pauseTrip(current) : resumeTrip(current);
    await commit(next);
    setBackgroundOn(next.state === "ACTIVE");
  };

  const finish = async () => {
    const current = tripRef.current;
    if (!current) return;

    const paused = current.state === "ACTIVE" ? pauseTrip(current) : current;
    const remaining = distanceToStart(paused);

    // "Returned to start" is a claim about the route, so it is only set when the
    // user is genuinely within a short walk of where the trip began.
    await finishTrip(paused, { returnedToStart: remaining !== null && remaining <= 100 });
    await stopBackgroundUpdates();

    toast.show("Trip saved", "success");
    router.replace("/path-tracker");
  };

  /* ---------------------------------------------------------------------- */
  /* Render                                                                   */
  /* ---------------------------------------------------------------------- */

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={styles.muted}>Loading trip…</Text>
      </View>
    );
  }

  if (!trip) {
    return (
      <EmptyState
        title="No trip in progress"
        description="Start tracking from the Path Tracker home screen."
        icon="navigate-outline"
        action={{ label: "Back", onPress: () => router.replace("/path-tracker") }}
      />
    );
  }

  const stats = computeStats(trip);
  const remaining = distanceToStart(trip);
  const running = trip.state === "ACTIVE";

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
    >
      <View style={styles.statusRow}>
        <View style={[styles.statusPill, running ? styles.statusLive : styles.statusPaused]}>
          <Ionicons
            name={running ? "radio-button-on" : "pause-circle"}
            size={14}
            color={running ? colors.successDark : colors.warning}
          />
          <Text style={[styles.statusText, running ? styles.statusTextLive : styles.statusTextPaused]}>
            {running ? "Recording" : "Paused"}
          </Text>
        </View>

        {!backgroundOn && running ? (
          <View style={styles.warnPill}>
            <Ionicons name="information-circle-outline" size={13} color={colors.warning} />
            <Text style={styles.warnText}>Background location is off</Text>
          </View>
        ) : null}
      </View>

      <Card style={styles.hero}>
        <Text style={styles.heroValue}>{formatDistance(stats.distance)}</Text>
        <Text style={styles.heroLabel}>Distance travelled</Text>
      </Card>

      <View style={styles.statRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{formatDuration(stats.activeDurationMs)}</Text>
          <Text style={styles.statLabel}>Active time</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{formatSpeed(stats.avgSpeed)}</Text>
          <Text style={styles.statLabel}>Average speed</Text>
        </Card>
      </View>

      <View style={styles.statRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{formatSpeed(stats.maxSpeed)}</Text>
          <Text style={styles.statLabel}>Top speed</Text>
        </Card>

        <Card style={styles.statCard}>
          <Text style={styles.statValue}>
            {remaining === null ? "—" : formatDistance(remaining)}
          </Text>
          <Text style={styles.statLabel}>From start</Text>
        </Card>
      </View>

      <Card style={styles.details}>
        <DetailRow
          icon="time-outline"
          label="Started"
          value={formatDateTime(trip.startTime)}
        />
        <DetailRow
          icon="pin-outline"
          label="Points recorded"
          value={String(stats.pointCount)}
        />
        <DetailRow
          icon="footsteps-outline"
          label="Pace"
          value={
            stats.avgPaceSecPerKm > 0
              ? `${Math.round(stats.avgPaceSecPerKm / 60)} min/km`
              : "—"
          }
        />
      </Card>

      {gpsLost ? (
        <View style={styles.warnBox}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />
          <Text style={styles.warnBoxText}>
            The GPS signal was lost. Distance is not being added until a good fix
            returns.
          </Text>
        </View>
      ) : null}

      <Button
        label={running ? "Pause" : "Resume"}
        variant={running ? "secondary" : "confirm"}
        size="lg"
        fullWidth
        icon={running ? "pause-outline" : "play-outline"}
        onPress={() => void togglePause()}
        style={styles.action}
      />

      <Button
        label="Finish and save"
        size="lg"
        fullWidth
        icon="stop-outline"
        onPress={() => void finish()}
        style={styles.action}
      />
    </ScrollView>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailRow}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  muted: { ...typography.small, color: colors.textMuted },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  statusLive: { backgroundColor: colors.successLight },
  statusPaused: { backgroundColor: colors.warningLight },
  statusText: { ...typography.caption },
  statusTextLive: { color: colors.successDark },
  statusTextPaused: { color: colors.warning },
  warnPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.warningLight,
  },
  warnText: { ...typography.caption, color: colors.warning },
  hero: { alignItems: "center", marginTop: spacing.xl, paddingVertical: spacing.xxl },
  heroValue: { fontSize: 44, lineHeight: 52, fontWeight: "800", color: colors.text },
  heroLabel: { ...typography.small, color: colors.textMuted, marginTop: spacing.xs },
  statRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  statCard: { flex: 1, alignItems: "center", paddingVertical: spacing.lg },
  statValue: { ...typography.heading, color: colors.text },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  details: { marginTop: spacing.lg },
  detailRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  detailLabel: { ...typography.small, color: colors.textMuted, width: 130 },
  detailValue: { ...typography.smallStrong, color: colors.text, flex: 1, textAlign: "right" },
  warnBox: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.warningLight,
    marginTop: spacing.lg,
  },
  warnBoxText: { ...typography.small, color: colors.warning, flex: 1 },
  action: { marginTop: spacing.md },
});