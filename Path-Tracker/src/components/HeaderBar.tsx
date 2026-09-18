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

interface Props {
  online: boolean;
}

/** Top status header with brand and live state indicator. */
export const HeaderBar: React.FC<Props> = ({ online }) => {
  const insets = useSafeAreaInsets();
  const state = useTripStore((s) => s.state);

  const status =
    state === 'RETURNING' ? { text: 'RETURNING', color: Colors.warning }
    : state === 'ACTIVE' ? { text: 'RECORDING', color: Colors.success }
    : state === 'PAUSED' ? { text: 'PAUSED', color: Colors.warning }
    : { text: '', color: Colors.textMuted };

  return (
    <View style={[styles.container, { top: insets.top + 8 }]}>
      <View style={styles.brandBadge}>
        <Text style={styles.brand}>PATH TRACKER</Text>
        {!online && (
          <Ionicons name="cloud-offline" size={12} color={Colors.warning} style={{ marginLeft: 6 }} />
        )}
      </View>
      {status.text !== '' && (
        <View style={styles.statusBadge}>
          <View style={[styles.dot, { backgroundColor: status.color }]} />
          <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  brand: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1.5,
    color: Colors.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    letterSpacing: 1,
  },
});

export default React.memo(HeaderBar);
