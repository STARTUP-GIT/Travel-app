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
  RouteColors,
  ArrivalConfig,
} from '../constants/theme';
import { formatDistance } from '../utils/geo';

/**
 * RETURN TO START navigation card. Shown while RETURNING.
 * When online the map also shows; this card always provides the clear
 * destination + distance info. Offline it becomes the primary guidance UI.
 */
export const ReturnHUD: React.FC = () => {
  const insets = useSafeAreaInsets();
  const state = useTripStore((s) => s.state);
  const rs = useTripStore((s) => s.returnState);

  if (state !== 'RETURNING') return null;

  const displayDistance = rs.remainingCorridorDistance > 0 ? rs.remainingCorridorDistance : rs.distanceToStart;
  const eta = rs.estimatedMinutes;
  const isCandidate = rs.arrivalState === 'CANDIDATE_ARRIVAL';

  return (
    <View
      pointerEvents="none"
      style={[
        styles.card,
        {
          bottom: insets.bottom + 88,
          borderColor: isCandidate ? Colors.success : RouteColors.returnRoute,
        },
      ]}
    >
      <View style={styles.header}>
        <Ionicons
          name={isCandidate ? 'checkmark-circle-outline' : 'return-down-back'}
          size={18}
          color={isCandidate ? Colors.success : RouteColors.returnRoute}
        />
        <Text style={[styles.headerText, isCandidate && { color: Colors.success }]}>
          {isCandidate
            ?             `ARRIVING… (${rs.arrivalConfirmCount}/${ArrivalConfig.confirmTickCount})`
            : 'RETURN TO START (SAME PATH)'}
        </Text>
      </View>

      <View style={styles.directionRow}>
        <CompassArrow direction={rs.bearingToStart} currentHeading={rs.heading} hasHeading={rs.hasHeading} />
        <View style={styles.distWrap}>
          <Text style={styles.distance}>{formatDistance(displayDistance)}</Text>
          {eta !== null && isFinite(eta) && eta > 0 ? (
            <Text style={styles.eta}>~{Math.max(1, Math.round(eta))} min remaining</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.destRow}>
        <Ionicons name="location-sharp" size={14} color={Colors.primary} style={{ marginRight: 4 }} />
        <Text style={styles.destLabel}>DESTINATION · START POINT (FIXED)</Text>
      </View>

      {!rs.hasHeading && (
        <Text style={styles.hint}>
          Move briefly to calibrate your travel direction.
        </Text>
      )}
    </View>
  );
};

const CompassArrow: React.FC<{
  direction: number;
  currentHeading: number;
  hasHeading: boolean;
}> = ({ direction, currentHeading, hasHeading }) => {
  if (!hasHeading) {
    return (
      <View style={styles.compassWrap}>
        <Ionicons name="compass-outline" size={52} color={Colors.textMuted} />
      </View>
    );
  }
  // Rotation = direction to target relative to device heading.
  const rotation = direction - currentHeading;
  return (
    <View style={styles.compassWrap}>
      <View style={[styles.arrowCircle, { transform: [{ rotate: `${rotation}deg` }] }]}>
        <Ionicons name="arrow-up" size={30} color="#fff" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 20,
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerText: {
    color: RouteColors.returnRoute,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1.5,
    marginLeft: 6,
  },
  directionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  compassWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  arrowCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: RouteColors.returnRoute,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distWrap: { flex: 1 },
  distance: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  eta: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
  },
  distanceBig: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  destRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  destLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 1,
    fontWeight: FontWeight.semibold,
  },
  hint: {
    fontSize: FontSize.xs,
    color: Colors.warningLight,
    marginTop: Spacing.sm,
  },
});

export default React.memo(ReturnHUD);
