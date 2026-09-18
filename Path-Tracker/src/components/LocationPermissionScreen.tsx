import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontSize,
  FontWeight,
  BorderRadius,
  Spacing,
  Shadows,
} from '../constants/theme';

interface Props {
  onEnable: () => void;
  loading?: boolean;
}

export const LocationPermissionScreen: React.FC<Props> = ({ onEnable, loading }) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="navigate" size={44} color={Colors.primaryLight} />
        </View>
        <Text style={styles.title}>LOCATION ACCESS</Text>
        <Text style={styles.heading}>Path Tracker needs your location</Text>
        <Text style={styles.message}>
          Your GPS position is used to record the path you travel, show your
          live position on the map, and guide you back to the starting point.
          Your trip is stored on your device and works without internet.
        </Text>
        <TouchableOpacity
          style={[styles.button, loading && styles.disabled]}
          onPress={onEnable}
          disabled={loading}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>
            {loading ? 'REQUESTING…' : 'ALLOW LOCATION'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(32,138,239,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xs,
    color: Colors.primaryLight,
    letterSpacing: 3,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },
  heading: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  message: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: Spacing.xxxl,
  },
  button: {
    minHeight: 56,
    minWidth: 240,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  disabled: { opacity: 0.5 },
  buttonText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
});

export default React.memo(LocationPermissionScreen);
