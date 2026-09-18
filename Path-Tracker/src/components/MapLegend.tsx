import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTripStore } from '../store/trip-store';
import {
  Colors,
  FontWeight,
  BorderRadius,
  Spacing,
  RouteColors,
} from '../constants/theme';

/** Subtle legend for the map explaining semantic route colors. */
export const MapLegend: React.FC = () => {
  const insets = useSafeAreaInsets();
  const state = useTripStore((s) => s.state);
  const hasTrip = state === 'ACTIVE' || state === 'PAUSED' || state === 'RETURNING';
  const isReturning = state === 'RETURNING';
  const offRoute = useTripStore((s) => s.returnState.offRoute) === 'OFF_ROUTE_CONFIRMED';

  if (!hasTrip || offRoute) return null;

  return (
    <View style={[styles.legend, { top: insets.top + 58 }]}>
      <View style={styles.item}>
        <View style={[styles.dot, { backgroundColor: RouteColors.start }]} />
        <Text style={styles.text}>START</Text>
      </View>
      <View style={styles.item}>
        <View style={[styles.line, { backgroundColor: RouteColors.recorded }]} />
        <Text style={styles.text}>RECORDED</Text>
      </View>
      {isReturning && (
        <View style={styles.item}>
          <View style={[styles.line, { backgroundColor: RouteColors.returnRoute }]} />
          <Text style={styles.text}>RETURN</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  legend: {
    position: 'absolute',
    left: Spacing.lg,
    backgroundColor: 'rgba(15,17,21,0.82)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  item: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 4 },
  line: { width: 14, height: 4, borderRadius: 2, marginRight: 4 },
  text: {
    color: Colors.textSecondary,
    fontSize: 9,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.5,
  },
});

export default React.memo(MapLegend);
