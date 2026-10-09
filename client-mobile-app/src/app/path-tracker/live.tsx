/**
 * Live Path Tracker screen for React Native Mobile App.
 * Exact behavior and visual parity with Website Path Tracker.
 */

import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, Text, View, ScrollView, Modal } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/providers/toast-provider";
import { useTripSession } from "@/lib/path-tracker/useTripSession";
import { useTripStore } from "@/lib/path-tracker/trip-store";
import {
  formatDistance,
  formatDuration,
  formatPace,
  formatSpeed,
} from "@/lib/path-tracker/geo";
import type { MovementState, ReturnState } from "@/lib/path-tracker/types";
import {
  notifyOffRoute,
  triggerHeavyTap,
  triggerMediumTap,
  triggerTap,
  vibrateOffRoute,
} from "@/lib/path-tracker/alert-service";
import { TrackingConfig } from "@/lib/path-tracker/theme";
import TripMap from "@/components/path-tracker/TripMap";

const MOVEMENT_LABEL: Record<MovementState, string> = {
  STATIONARY: "STILL",
  MOVING: "MOVING",
  UNCERTAIN: "UNCLEAR",
};

export default function LiveTrackerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const session = useTripSession();

  const state = useTripStore((s) => s.state);
  const stats = useTripStore((s) => s.stats);
  const returnState = useTripStore((s) => s.returnState);
  const movementState = useTripStore((s) => s.movementState);
  const movementConfidence = useTripStore((s) => s.movementConfidence);
  const positionSpreadM = useTripStore((s) => s.positionSpreadM);
  const isCalibrating = useTripStore((s) => s.isCalibrating);
  const gpsAccuracy = useTripStore((s) => s.gpsAccuracy);
  const pointCount = useTripStore((s) => s.pointCount);
  const activeTrip = useTripStore((s) => s.activeTrip);
  const hasInitialPosition = useTripStore((s) => s.hasInitialPosition);
  const currentPosition = useTripStore((s) => s.currentPosition);
  const activeCheckpoints = useTripStore((s) => s.activeCheckpoints);

  const startTrip = useTripStore((s) => s.startTrip);
  const pauseTrip = useTripStore((s) => s.pauseTrip);
  const resumeTrip = useTripStore((s) => s.resumeTrip);
  const endTrip = useTripStore((s) => s.endTrip);
  const returnToStart = useTripStore((s) => s.returnToStart);
  const cancelReturn = useTripStore((s) => s.cancelReturn);
  const addCheckpoint = useTripStore((s) => s.addCheckpoint);
  const bootstrap = useTripStore((s) => s.bootstrap);
  const loadHistory = useTripStore((s) => s.loadHistory);

  const [confirmEnd, setConfirmEnd] = useState(false);
  const [busy, setBusy] = useState<null | "start" | "return">(null);

  useEffect(() => {
    void bootstrap();
    void loadHistory();
  }, [bootstrap, loadHistory]);

  const offRoute = returnState.offRoute === "OFF_ROUTE_CONFIRMED";
  const notifiedRef = useRef(false);
  useEffect(() => {
    if (offRoute) {
      if (!notifiedRef.current) {
        notifiedRef.current = true;
        void notifyOffRoute();
        vibrateOffRoute();
      }
    } else {
      notifiedRef.current = false;
    }
  }, [offRoute]);

  if (session.permissionLoading) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.mutedText}>Checking location permission…</Text>
      </View>
    );
  }

  if (session.gpsPhase === "initializing") {
    return (
      <View style={styles.centerScreen}>
        <Ionicons name="compass-outline" size={32} color="#208AEF" />
        <Text style={styles.titleText}>Getting GPS signal…</Text>
        <Text style={styles.mutedText}>
          Waiting for your device to report a position.
        </Text>
      </View>
    );
  }

  if (session.gpsPhase === "improving") {
    return (
      <View style={styles.centerScreen}>
        <Ionicons name="location-outline" size={32} color="#F59E0B" />
        <Text style={styles.titleText}>Improving GPS accuracy…</Text>
        <Text style={styles.mutedText}>
          Accuracy: ±{Math.round(session.improvingAccuracy ?? 0)} m. Waiting for {TrackingConfig.minAccuracyMeters} m or better.
        </Text>
        <Button
          label="Retry GPS"
          variant="secondary"
          onPress={() => {
            triggerMediumTap();
            void session.retryGps();
          }}
          style={{ marginTop: 16 }}
        />
      </View>
    );
  }

  if (session.gpsPhase === "denied" || session.gpsPhase === "timeout" || session.gpsPhase === "unavailable") {
    return (
      <View style={styles.centerScreen}>
        <Ionicons name="alert-circle-outline" size={32} color="#EF4444" />
        <Text style={styles.titleText}>Location Unavailable</Text>
        <Text style={styles.mutedText}>
          {session.gpsError?.message || "GPS signal could not be established."}
        </Text>
        <Button
          label="Retry"
          variant="confirm"
          onPress={() => {
            triggerMediumTap();
            void session.retryGps();
          }}
          style={{ marginTop: 16 }}
        />
      </View>
    );
  }

  if (!hasInitialPosition) {
    return (
      <View style={styles.centerScreen}>
        <Ionicons name="compass-outline" size={32} color="#F59E0B" />
        <Text style={styles.titleText}>No position yet</Text>
        <Text style={styles.mutedText}>Waiting for usable GPS fix.</Text>
        <Button
          label="Retry"
          variant="secondary"
          onPress={() => void session.retryGps()}
          style={{ marginTop: 16 }}
        />
      </View>
    );
  }

  const isReturning = state === "RETURNING";
  const isPaused = state === "PAUSED";
  const isActive = state === "ACTIVE";
  const isIdle = state === "IDLE";
  const arrived = returnState.arrivalState === "CONFIRMED_ARRIVAL";

  const accuracyTier =
    gpsAccuracy <= 12 ? "EXCELLENT" : gpsAccuracy <= 30 ? "GOOD" : gpsAccuracy <= 60 ? "FAIR" : "POOR";

  // Display speed in KM/H (Explicit requirement)
  const currentSpeedDisplay = formatSpeed(currentPosition?.speed ?? 0);
  const avgSpeedDisplay = formatSpeed(stats.avgSpeed);

  const onStart = async () => {
    triggerMediumTap();
    setBusy("start");
    try {
      await session.armTracking();
      await startTrip();
    } finally {
      setBusy(null);
    }
  };

  const onReturn = async () => {
    triggerMediumTap();
    setBusy("return");
    try {
      await returnToStart();
    } finally {
      setBusy(null);
    }
  };

  const handleAddCheckpoint = async () => {
    triggerTap();
    await addCheckpoint();
    toast.show("Checkpoint added", "success");
  };

  const handleEndTrip = async () => {
    setConfirmEnd(false);
    triggerHeavyTap();
    const completed = await endTrip();
    if (completed) {
      toast.show(`Trip saved (${formatDistance(completed.totalDistance)})`, "success");
    }
    router.replace("/path-tracker");
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}
    >
      <View style={styles.headerRow}>
        <Button
          label="Back"
          icon="chevron-back"
          variant="ghost"
          onPress={() => router.replace("/path-tracker")}
        />
        <Text style={styles.headerTitle}>Live Path Tracker</Text>
      </View>

      {!session.online ? (
        <View style={styles.bannerWarning}>
          <Ionicons name="wifi-outline" size={16} color="#F59E0B" />
          <Text style={styles.bannerText}>
            Offline — GPS tracking and path recording continue normally.
          </Text>
        </View>
      ) : null}

      {session.gpsSignalLost ? (
        <View style={styles.bannerWarning}>
          <Ionicons name="navigate-outline" size={16} color="#F59E0B" />
          <Text style={styles.bannerText}>
            GPS signal lost — tracking resumes automatically when position returns.
          </Text>
        </View>
      ) : null}

      {offRoute ? (
        <View style={styles.bannerDanger}>
          <Ionicons name="warning-outline" size={16} color="#EF4444" />
          <Text style={styles.bannerDangerText}>
            Off route — you&apos;re away from your return path.
          </Text>
        </View>
      ) : null}

      {arrived ? (
        <View style={styles.bannerSuccess}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#10B981" />
          <Text style={styles.bannerSuccessText}>
            You&apos;re back at your start point!
          </Text>
        </View>
      ) : null}

      {/* Map View */}
      <View style={styles.mapContainer}>
        <TripMap
          recordedPath={activeTrip?.points ?? []}
          returnCorridor={isReturning ? returnState.returnCorridor : null}
          recoveryRoute={isReturning ? returnState.recoveryRoute : null}
          start={activeTrip?.points[0] ?? currentPosition}
          destination={returnState.destination}
          checkpoints={activeCheckpoints}
          isReturning={isReturning}
          follow={true}
          live={true}
        />
      </View>

      {/* Primary Metrics Grid */}
      <View style={styles.metricsGrid}>
        <MetricCard value={formatDistance(stats.distance)} label="DISTANCE" />
        <MetricCard value={formatDuration(stats.activeDurationMs)} label="TIME" />
        <MetricCard
          value={isActive || isReturning ? formatPace(stats.avgPaceSecPerKm) : "—"}
          label="PACE"
        />
      </View>

      {/* Speed & GPS Detail Bar */}
      <Card style={styles.detailsCard}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>CURRENT SPEED</Text>
          <Text style={styles.detailValueHighlight}>{currentSpeedDisplay}</Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>AVG SPEED</Text>
          <Text style={styles.detailValue}>{avgSpeedDisplay}</Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>GPS ACCURACY</Text>
          <Text style={styles.detailValue}>{accuracyTier} (±{Math.round(gpsAccuracy)}m)</Text>
        </View>
      </Card>

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>POINTS: {pointCount}</Text>
        <Text style={styles.metaText}>CHECKPOINTS: {activeCheckpoints.length}</Text>
        {isActive || isReturning ? (
          <Text style={styles.metaText}>
            STATE: {isCalibrating ? "CALIBRATING" : MOVEMENT_LABEL[movementState] ?? "UNCLEAR"} ({Math.round(movementConfidence * 100)}%)
          </Text>
        ) : null}
      </View>

      {/* Return Navigation Panel */}
      {isReturning ? (
        <Card style={offRoute ? styles.returnCardOffRoute : styles.returnCard}>
          <View style={styles.returnHeader}>
            <Ionicons
              name={offRoute ? "alert-circle" : "arrow-undo-circle"}
              size={20}
              color={offRoute ? "#EF4444" : "#208AEF"}
            />
            <Text style={styles.returnTitle}>
              {isPaused ? "Return Paused" : offRoute ? "Off Route Warning" : "Returning to Start"}
            </Text>
            <Button
              label="Cancel"
              variant="ghost"
              size="sm"
              onPress={() => {
                triggerTap();
                cancelReturn();
              }}
            />
          </View>
          <View style={styles.returnStatsGrid}>
            <View style={styles.returnStat}>
              <Text style={styles.returnStatLabel}>TO START</Text>
              <Text style={styles.returnStatValue}>{formatDistance(returnState.distanceToStart)}</Text>
            </View>
            <View style={styles.returnStat}>
              <Text style={styles.returnStatLabel}>EST. MIN</Text>
              <Text style={styles.returnStatValue}>
                {returnState.estimatedMinutes === null ? "—" : `${returnState.estimatedMinutes} min`}
              </Text>
            </View>
            <View style={styles.returnStat}>
              <Text style={styles.returnStatLabel}>BEARING</Text>
              <Text style={styles.returnStatValue}>{Math.round(returnState.bearingToStart)}°</Text>
            </View>
          </View>
        </Card>
      ) : null}

      {/* Action Controls */}
      {isIdle ? (
        <Button
          label="Start Trip"
          icon="play-outline"
          size="lg"
          fullWidth
          loading={busy === "start"}
          onPress={() => void onStart()}
          style={styles.actionBtn}
        />
      ) : (
        <View style={styles.controlsGrid}>
          <Button
            label="Checkpoint"
            icon="flag-outline"
            variant="secondary"
            style={styles.gridBtn}
            onPress={() => void handleAddCheckpoint()}
          />

          {isPaused ? (
            <Button
              label="Resume"
              icon="play-outline"
              variant="confirm"
              style={styles.gridBtn}
              onPress={() => {
                triggerMediumTap();
                resumeTrip();
              }}
            />
          ) : (
            <Button
              label="Pause"
              icon="pause-outline"
              variant="secondary"
              style={styles.gridBtn}
              onPress={() => {
                triggerMediumTap();
                pauseTrip();
              }}
            />
          )}

          {!isReturning ? (
            <Button
              label="Return to Start"
              icon="arrow-undo-outline"
              variant="secondary"
              loading={busy === "return"}
              style={styles.gridBtn}
              onPress={() => void onReturn()}
            />
          ) : null}

          <Button
            label="End Trip"
            icon="stop-outline"
            variant="danger"
            style={styles.gridBtn}
            onPress={() => {
              triggerHeavyTap();
              setConfirmEnd(true);
            }}
          />
        </View>
      )}

      {/* Confirmation Modal for End Trip */}
      <Modal visible={confirmEnd} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Card style={styles.modalCard}>
            <Text style={styles.modalTitle}>End this trip?</Text>
            <Text style={styles.modalBody}>
              Your route, speed, distance, and checkpoints will be saved to this device.
            </Text>
            <View style={styles.modalActions}>
              <Button
                label="Keep tracking"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => setConfirmEnd(false)}
              />
              <Button
                label="End trip"
                variant="danger"
                style={{ flex: 1 }}
                onPress={() => void handleEndTrip()}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </ScrollView>
  );
}

function MetricCard({ value, label }: { value: string; label: string }) {
  return (
    <Card style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0F1115" },
  content: { paddingHorizontal: 16 },
  centerScreen: { flex: 1, backgroundColor: "#0F1115", alignItems: "center", justifyContent: "center", padding: 24 },
  titleText: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", marginTop: 12 },
  mutedText: { fontSize: 14, color: "#9CA3AF", textAlign: "center", marginTop: 6 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  bannerWarning: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(245,158,11,0.12)", borderWidth: 1, borderColor: "rgba(245,158,11,0.3)", borderRadius: 12, padding: 10, marginBottom: 10 },
  bannerText: { fontSize: 12, color: "#F59E0B", flex: 1 },
  bannerDanger: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(239,68,68,0.12)", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)", borderRadius: 12, padding: 10, marginBottom: 10 },
  bannerDangerText: { fontSize: 12, color: "#EF4444", flex: 1 },
  bannerSuccess: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(16,185,129,0.12)", borderWidth: 1, borderColor: "rgba(16,185,129,0.3)", borderRadius: 12, padding: 10, marginBottom: 10 },
  bannerSuccessText: { fontSize: 12, color: "#10B981", flex: 1 },
  mapContainer: { height: 260, borderRadius: 16, overflow: "hidden", marginBottom: 12 },
  metricsGrid: { flexDirection: "row", gap: 8, marginBottom: 10 },
  metricCard: { flex: 1, alignItems: "center", paddingVertical: 12, paddingHorizontal: 4 },
  metricValue: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
  metricLabel: { fontSize: 10, fontWeight: "700", color: "#9CA3AF", marginTop: 2, letterSpacing: 0.8 },
  detailsCard: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10 },
  detailItem: { flex: 1, alignItems: "center" },
  detailDivider: { width: 1, height: 24, backgroundColor: "#272A30" },
  detailLabel: { fontSize: 9, fontWeight: "700", color: "#9CA3AF", letterSpacing: 0.6 },
  detailValue: { fontSize: 13, fontWeight: "700", color: "#FFFFFF", marginTop: 2 },
  detailValueHighlight: { fontSize: 14, fontWeight: "800", color: "#208AEF", marginTop: 2 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 12, paddingHorizontal: 4 },
  metaText: { fontSize: 10, color: "#9CA3AF", fontWeight: "600" },
  returnCard: { padding: 12, borderColor: "rgba(32,138,239,0.3)", backgroundColor: "rgba(32,138,239,0.08)", marginBottom: 12 },
  returnCardOffRoute: { padding: 12, borderColor: "rgba(239,68,68,0.3)", backgroundColor: "rgba(239,68,68,0.08)", marginBottom: 12 },
  returnHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  returnTitle: { fontSize: 14, fontWeight: "700", color: "#FFFFFF", flex: 1 },
  returnStatsGrid: { flexDirection: "row", gap: 8, marginTop: 10 },
  returnStat: { flex: 1, alignItems: "center" },
  returnStatLabel: { fontSize: 9, fontWeight: "700", color: "#9CA3AF" },
  returnStatValue: { fontSize: 13, fontWeight: "700", color: "#FFFFFF", marginTop: 2 },
  actionBtn: { marginTop: 8 },
  controlsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  gridBtn: { flex: 1, minWidth: "45%" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", marginBottom: 8 },
  modalBody: { fontSize: 14, color: "#9CA3AF", marginBottom: 20 },
  modalActions: { flexDirection: "row", gap: 12 },
});