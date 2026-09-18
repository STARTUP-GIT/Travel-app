import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTripStore } from '../store/trip-store';
import { Colors, BorderRadius, Shadows, Spacing } from '../constants/theme';
import { triggerTap } from '../services/alert-service';

interface Props {
  isReturning: boolean;
  onRecenter: () => void;
}

/**
 * Floating map control (recenter). Appears after the user manually pans away,
 * so the camera never fights the user but recovery is one tap away.
 */
export const FloatingControls: React.FC<Props> = ({ isReturning, onRecenter }) => {
  const insets = useSafeAreaInsets();
  const isFollowing = useTripStore((s) => s.isFollowing);

  if (isFollowing && !isReturning) return null;

  // While RETURNING the recenter control sits below the off-route alert zone;
  // otherwise it sits below the map attribution chip (top-right).
  const top = isReturning ? insets.top + 140 : insets.top + 100;

  return (
    <View style={[styles.container, { top }]}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => {
          triggerTap();
          onRecenter();
        }}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Recenter on current location"
      >
        <Ionicons name="locate" size={24} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: Spacing.lg,
    zIndex: 25,
  },
  button: {
    width: 50,
    height: 50,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surfaceGlass,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.md,
  },
});

export default React.memo(FloatingControls);
