import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
} from 'react-native';
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

/**
 * Shown after an app restart if an ACTIVE trip was found in the local database,
 * so the user never loses a recorded trip.
 */
export const RecoveryPrompt: React.FC = () => {
  const recovered = useTripStore((s) => s.recoveredActive);
  const resume = useTripStore((s) => s.resumeRecoveredTrip);
  const discard = useTripStore((s) => s.discardRecoveredTrip);

  if (!recovered) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>ACTIVE TRIP RECOVERED</Text>
          <Text style={styles.distance}>
            {formatDistance(recovered.totalDistance)} recorded
          </Text>
          <Text style={styles.meta}>
            {recovered.points.length} points · started{' '}
            {new Date(recovered.startTime).toLocaleTimeString()}
          </Text>
          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.discardBtn}
              onPress={() => discard()}
              activeOpacity={0.8}
            >
              <Text style={styles.discardText}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={() => resume(recovered)}
              activeOpacity={0.85}
            >
              <Text style={styles.continueText}>Continue Trip</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.lg,
  },
  title: {
    fontSize: FontSize.xs,
    letterSpacing: 2,
    color: Colors.primaryLight,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  distance: {
    fontSize: FontSize.xxxl,
    color: Colors.text,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  meta: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  buttons: { flexDirection: 'row', gap: Spacing.md },
  discardBtn: {
    flex: 1,
    minHeight: 52,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  discardText: { color: Colors.textSecondary, fontWeight: FontWeight.semibold },
  continueBtn: {
    flex: 1.4,
    minHeight: 52,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: { color: '#fff', fontWeight: FontWeight.bold },
});

export default React.memo(RecoveryPrompt);
