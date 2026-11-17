import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSize, FontWeight, Spacing } from '../constants/theme';

export const LocationSearchingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <View style={styles.content}>
        <Text style={styles.brand}>PATH TRACKER</Text>
        <ActivityIndicator size="large" color={Colors.primaryLight} />
        <Text style={styles.message}>Finding your location…</Text>
        <Text style={styles.sub}>Acquiring GPS signal</Text>
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
  },
  brand: {
    fontSize: FontSize.xs,
    letterSpacing: 4,
    fontWeight: FontWeight.bold,
    color: Colors.primaryLight,
    marginBottom: Spacing.xxxl,
  },
  message: {
    fontSize: FontSize.lg,
    color: Colors.text,
    marginTop: Spacing.lg,
    fontWeight: FontWeight.semibold,
  },
  sub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
});

export default React.memo(LocationSearchingScreen);
