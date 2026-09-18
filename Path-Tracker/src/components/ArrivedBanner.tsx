import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTripStore } from '../store/trip-store';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, Shadows } from '../constants/theme';
import { triggerHeavyTap, triggerMediumTap } from '../services/alert-service';

export const ArrivedBanner: React.FC = () => {
  const state = useTripStore((s) => s.state);
  const cancelReturn = useTripStore((s) => s.cancelReturn);

  if (state !== 'ARRIVED') return null;

  return (
    <Modal visible={true} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
          </View>
          <Text style={styles.title}>ARRIVED AT START!</Text>
          <Text style={styles.subtitle}>
            You have successfully travelled back to your original trip start destination.
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => {
                triggerMediumTap();
                cancelReturn();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.continueText}>Continue Recording</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.endBtn}
              onPress={() => {
                triggerHeavyTap();
                useTripStore.getState().endTrip().catch(() => {});
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.endText}>End & Save Trip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.xxl,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.success,
    ...Shadows.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  continueBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    color: Colors.textSecondary,
    fontWeight: FontWeight.bold,
    fontSize: FontSize.xs,
  },
  endBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endText: {
    color: '#fff',
    fontWeight: FontWeight.bold,
    fontSize: FontSize.xs,
  },
});
