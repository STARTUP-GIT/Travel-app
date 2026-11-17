import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTripStore } from '../store/trip-store';
import {
  Colors,
  FontSize,
  FontWeight,
  BorderRadius,
  Spacing,
} from '../constants/theme';

/**
 * Clear in-app "OFF ROUTE" alert. Uses icon + text (not color alone) for
 * accessibility. Shown only once for a confirmed off-route event.
 */
export const OffRouteBanner: React.FC = () => {
  const insets = useSafeAreaInsets();
  const returnState = useTripStore((s) => s.returnState);
  const state = useTripStore((s) => s.state);

  const show =
    state === 'RETURNING' && returnState.offRoute === 'OFF_ROUTE_CONFIRMED';

  if (!show) return null;

  return (
    <View
      accessibilityRole="alert"
      style={[styles.banner, { top: insets.top + 58 }]}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="warning" size={22} color="#fff" />
      </View>
      <View style={styles.textWrap}>
        <Text style={styles.title}>OFF ROUTE</Text>
        <Text style={styles.message}>
          You have moved away from the return path. Recalculating…
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.danger,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  textWrap: { flex: 1 },
  title: {
    color: '#fff',
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: 2,
  },
  message: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: FontSize.sm,
  },
});

export default React.memo(OffRouteBanner);
