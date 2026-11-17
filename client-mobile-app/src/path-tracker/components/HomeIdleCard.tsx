import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTripStore } from '../store/trip-store';
import {
  Colors,
  FontSize,
  FontWeight,
  BorderRadius,
  Spacing,
  Shadows,
} from '../constants/theme';
import { formatDistance } from '../utils/geo';
import { triggerHeavyTap, triggerTap } from '../services/alert-service';

/**
 * Idle state: communicates that the app is ready, shows live GPS health and a
 * shortcut to the most recent trip, and provides the primary START TRIP action.
 */
export const HomeIdleCard: React.FC = () => {
  const insets = useSafeAreaInsets();
  const state = useTripStore((s) => s.state);
  const gpsAccuracy = useTripStore((s) => s.gpsAccuracy);
  const hasPosition = useTripStore((s) => s.hasInitialPosition);
  const tripHistory = useTripStore((s) => s.tripHistory);

  if (state !== 'IDLE' && state !== 'COMPLETED') return null;

  const lastTrip = tripHistory[0];
  const ready = hasPosition && gpsAccuracy < 999;
  const gpsLabel = !hasPosition
    ? 'Finding GPS…'
    : gpsAccuracy <= 30
    ? 'GPS Ready'
    : gpsAccuracy <= 60
    ? 'GPS Acquiring'
    : 'Weak GPS signal';

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + 16 }]}>
      <View style={styles.card}>
        <Text style={styles.tagline}>Your outdoor trips, recorded reliably.</Text>
        <View style={styles.statusRow}>
          <View style={[styles.dot, { backgroundColor: ready ? Colors.success : Colors.warning }]} />
          <Text style={[styles.statusText, { color: ready ? Colors.success : Colors.warning }]}>
            {gpsLabel}
          </Text>
          {hasPosition && (
            <Text style={styles.accuracyText}>±{Math.max(3, Math.round(gpsAccuracy))} m</Text>
          )}
        </View>

        {lastTrip && (
          <TouchableOpacity
            style={styles.lastTripRow}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Open your most recent trip"
            onPress={() => {
              triggerTap();
              router.push(`/trip/${lastTrip.id}`);
            }}
          >
            <View style={styles.lastTripIcon}>
              <Ionicons name="time-outline" size={16} color={Colors.primaryLight} />
            </View>
            <Text style={styles.lastTripText} numberOfLines={1}>
              Last trip · {formatDistance(lastTrip.totalDistance)} ·{' '}
              {new Date(lastTrip.startTime).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
              })}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.startButton, !ready && styles.disabledBtn]}
          disabled={!ready}
          onPress={() => {
            triggerHeavyTap();
            useTripStore.getState().startTrip().catch(() => {});
          }}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Start trip"
          accessibilityHint="Begins recording your GPS path"
        >
          <Ionicons name="play" size={20} color="#fff" />
          <Text style={styles.startText}>START TRIP</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 20,
  },
  card: {
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.lg,
    ...Shadows.lg,
  },
  tagline: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1.2,
    flex: 1,
  },
  accuracyText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: FontWeight.semibold,
  },
  lastTripRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  lastTripIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(32,138,239,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  lastTripText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    minHeight: 56,
    ...Shadows.md,
  },
  startText: {
    color: '#fff',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    letterSpacing: 2,
    marginLeft: Spacing.sm,
  },
  disabledBtn: { opacity: 0.45 },
});

export default React.memo(HomeIdleCard);
