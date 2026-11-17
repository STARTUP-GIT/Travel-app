import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTripStore } from '../store/trip-store';
import {
  Colors,
  FontSize,
  FontWeight,
  BorderRadius,
  Spacing,
  RouteColors,
} from '../constants/theme';
import { formatDistance, formatDuration, formatPace } from '../utils/geo';

/**
 * Live trip statistics sheet shown during ACTIVE / PAUSED.
 * Shows distance, elapsed time, pace and GPS status without covering the map.
 */
export const TripStatsCard: React.FC = () => {
  const insets = useSafeAreaInsets();
  const state = useTripStore((s) => s.state);
  const stats = useTripStore((s) => s.stats);
  const gpsAccuracy = useTripStore((s) => s.gpsAccuracy);
  const pointCount = useTripStore((s) => s.pointCount);
  const isReturning = state === 'RETURNING';
  const isActive = state === 'ACTIVE' || state === 'PAUSED' || isReturning;

  const pace = useMemo(() => formatPace(stats.avgPaceSecPerKm || null), [stats.avgPaceSecPerKm]);

  if (!isActive) return null;

  const gpsQuality =
    gpsAccuracy <= 12 ? 'Excellent'
    : gpsAccuracy <= 30 ? 'Good'
    : gpsAccuracy <= 60 ? 'Fair'
    : 'Weak';

  const gpsColor =
    gpsAccuracy <= 30 ? Colors.success : gpsAccuracy <= 60 ? Colors.warning : Colors.danger;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.sheet,
        {
          bottom: insets.bottom + 88,
          borderColor: isReturning ? RouteColors.returnRoute : Colors.borderLight,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.stateLabel}>
          {isReturning ? 'RETURNING TO START' : state === 'PAUSED' ? 'PAUSED' : 'TRIP IN PROGRESS'}
        </Text>
        <View style={styles.accRow}>
          <View style={[styles.accDot, { backgroundColor: gpsColor }]} />
          <Text style={styles.accText}>GPS {gpsQuality}</Text>
        </View>
      </View>

      <View style={styles.mainRow}>
        <StatsBlock value={formatDistance(stats.distance)} label="DISTANCE" />
        <StatsBlock value={formatDuration(stats.activeDurationMs)} label="TIME" />
        <StatsBlock value={pace} label="PACE" />
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>{pointCount} points recorded</Text>
        <Text style={styles.footerText}>±{Math.round(gpsAccuracy)} m</Text>
      </View>
    </View>
  );
};

const StatsBlock: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <View style={styles.block}>
    <Text style={styles.blockValue} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.blockLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 20,
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  stateLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    color: Colors.primaryLight,
    letterSpacing: 1.5,
  },
  accRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  accText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
  },
  mainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  block: {
    flex: 1,
    alignItems: 'center',
  },
  blockValue: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  blockLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginTop: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  footerText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
});

export default React.memo(TripStatsCard);
