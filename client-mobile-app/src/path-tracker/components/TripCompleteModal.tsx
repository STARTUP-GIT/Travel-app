import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTripStore } from '../store/trip-store';
import {
  Colors,
  FontSize,
  FontWeight,
  BorderRadius,
  Spacing,
  Shadows,
  RouteColors,
} from '../constants/theme';
import {
  formatDistance,
  formatDuration,
  formatSpeed,
} from '../utils/geo';
import { triggerMediumTap, triggerTap } from '../services/alert-service';

/** TRIP COMPLETE summary with VIEW TRIP / RETURN HOME actions. */
export const TripCompleteModal: React.FC = () => {
  const trip = useTripStore((s) => s.lastCompletedTrip);
  const clear = useTripStore((s) => s.setLastCompletedTrip);

  if (!trip) return null;

  const duration = trip.endTime ? trip.endTime - trip.startTime : trip.activeDurationMs;
  const speed = formatSpeed(trip.totalDistance, duration);
  const first = trip.points[0];
  const last = trip.points[trip.points.length - 1];

  const dismiss = () => clear(null);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={36} color="#fff" />
          </View>
          <Text style={styles.title}>TRIP COMPLETE</Text>
          <Text style={styles.subtitle}>Saved to your device</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
            <View style={styles.statsRow}>
              <StatBlock value={formatDistance(trip.totalDistance)} label="DISTANCE" />
              <StatBlock value={formatDuration(duration)} label="DURATION" />
              <StatBlock value={speed} label="SPEED" />
            </View>

            {trip.returnedToStart && (
              <View style={styles.returnBadge}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                <Text style={styles.returnBadgeText}>RETURNED TO START</Text>
              </View>
            )}

            <InfoRow label="STARTED" value={new Date(trip.startTime).toLocaleString()} />
            {trip.endTime && (
              <InfoRow label="ENDED" value={new Date(trip.endTime).toLocaleString()} />
            )}
            {first && (
              <InfoRow
                label="FROM"
                value={`${first.latitude.toFixed(5)}, ${first.longitude.toFixed(5)}`}
                dotColor={RouteColors.start}
              />
            )}
            {last && last !== first && (
              <InfoRow
                label="TO"
                value={`${last.latitude.toFixed(5)}, ${last.longitude.toFixed(5)}`}
              />
            )}
            <InfoRow label="POINTS" value={`${trip.points.length} recorded`} />
          </ScrollView>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.homeBtn}
              onPress={() => {
                triggerTap();
                dismiss();
              }}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Return home"
            >
              <Text style={styles.homeText}>RETURN HOME</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.viewBtn}
              onPress={() => {
                triggerMediumTap();
                const id = trip.id;
                dismiss();
                router.push(`/trip/${id}`);
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="View trip details"
            >
              <Text style={styles.viewText}>VIEW TRIP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const StatBlock: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <View style={styles.statBlock}>
    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const InfoRow: React.FC<{
  label: string;
  value: string;
  dotColor?: string;
}> = ({ label, value, dotColor }) => (
  <View style={styles.infoRow}>
    {dotColor && <View style={[styles.infoDot, { backgroundColor: dotColor }]} />}
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '86%',
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.lg,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xs,
    letterSpacing: 3,
    color: Colors.success,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Spacing.lg,
  },
  body: { marginBottom: Spacing.lg },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.md,
  },
  statBlock: { flex: 1, alignItems: 'center' },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    maxWidth: '92%',
  },
  statLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginTop: 4,
  },
  returnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,197,94,0.14)',
    borderRadius: BorderRadius.full,
    paddingVertical: 6,
    marginBottom: Spacing.md,
  },
  returnBadgeText: {
    color: Colors.success,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    marginLeft: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  infoDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  infoLabel: {
    width: 72,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.5,
  },
  infoValue: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'right',
  },
  buttons: { flexDirection: 'row', gap: Spacing.md },
  homeBtn: {
    flex: 1,
    minHeight: 54,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  homeText: { color: Colors.textSecondary, fontWeight: FontWeight.bold, letterSpacing: 0.5 },
  viewBtn: {
    flex: 1,
    minHeight: 54,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewText: { color: '#fff', fontWeight: FontWeight.bold, letterSpacing: 0.5 },
});

export default React.memo(TripCompleteModal);
