import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTripStore } from '../store/trip-store';
import {
  Colors,
  FontSize,
  FontWeight,
  BorderRadius,
  Spacing,
  Shadows,
  RouteColors,
} from '../constants/theme';
import { formatDistance, formatDuration, formatPace } from '../utils/geo';
import { triggerHeavyTap, triggerMediumTap, triggerTap } from '../services/alert-service';

/**
 * Dedicated OFFLINE MODE interface. Never a broken/blank map — an intentional,
 * polished tracking + return-guidance surface. GPS, time, distance, points and
 * storage all keep working; only the map tiles and routing API are absent.
 */
export const OfflineScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const state = useTripStore((s) => s.state);
  const stats = useTripStore((s) => s.stats);
  const gpsAccuracy = useTripStore((s) => s.gpsAccuracy);
  const pointCount = useTripStore((s) => s.pointCount);
  const currentPosition = useTripStore((s) => s.currentPosition);
  const hasInitial = useTripStore((s) => s.hasInitialPosition);
  const returnState = useTripStore((s) => s.returnState);
  const hasPoints = useTripStore((s) => (s.activeTrip?.points.length ?? 0) >= 2);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const startTrip = useTripStore((s) => s.startTrip);
  const pause = useTripStore((s) => s.pauseTrip);
  const resume = useTripStore((s) => s.resumeTrip);
  const returnToStart = useTripStore((s) => s.returnToStart);
  const cancelReturn = useTripStore((s) => s.cancelReturn);

  const isReturning = state === 'RETURNING';
  const isActive = state === 'ACTIVE';
  const isPaused = state === 'PAUSED';
  const hasGPS = !!currentPosition;

  const gpsQuality =
    gpsAccuracy <= 30 ? 'Good accuracy'
    : gpsAccuracy <= 60 ? 'Fair accuracy'
    : hasGPS ? 'Acquiring' : 'Searching';

  const gpsColor =
    gpsAccuracy <= 30 ? Colors.success
    : gpsAccuracy <= 60 ? Colors.warning
    : Colors.warning;

  return (
    <View
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <Text style={styles.brand}>PATH TRACKER</Text>
          <View style={styles.offlineBadge}>
            <Ionicons name="cloud-offline" size={13} color={Colors.warning} />
            <Text style={styles.offlineText}>OFFLINE</Text>
          </View>
        </View>

        <View style={styles.stateChip}>
          <View style={[styles.gpsDot, { backgroundColor: hasGPS ? gpsColor : Colors.warning }]} />
          <Text style={[styles.stateText, { color: hasGPS ? gpsColor : Colors.warning }]}>
            {isReturning
              ? 'RETURNING TO START'
              : isActive
              ? 'TRIP IN PROGRESS — GPS TRACKING ACTIVE'
              : isPaused
              ? 'TRIP PAUSED'
              : hasGPS
              ? 'GPS AVAILABLE'
              : 'WAITING FOR GPS'}
          </Text>
        </View>

        {isReturning ? (
          <View style={styles.returnCard}>
            <View style={styles.returnHeader}>
              <Ionicons name="return-down-back" size={18} color={RouteColors.returnRoute} />
              <Text style={styles.returnTitle}>RETURN TO START</Text>
            </View>

            <View style={styles.returnMain}>
              <View style={styles.compassWrap}>
                {returnState.hasHeading ? (
                  <View
                    style={[
                      styles.arrowCircle,
                      {
                        transform: [
                          { rotate: `${returnState.bearingToStart - returnState.heading}deg` },
                        ],
                      },
                    ]}
                  >
                    <Ionicons name="arrow-up" size={34} color="#fff" />
                  </View>
                ) : (
                  <Ionicons name="compass-outline" size={46} color={Colors.textMuted} />
                )}
              </View>
              <View style={styles.returnInfo}>
                <Text style={styles.returnDistance}>
                  {formatDistance(returnState.distanceToStart)}
                </Text>
                <Text style={styles.returnEta}>
                  {returnState.estimatedMinutes !== null
                    ? `~${Math.max(1, Math.round(returnState.estimatedMinutes))} min away`
                    : 'walking time —'}
                </Text>
              </View>
            </View>

            {!returnState.hasHeading ? (
              <Text style={styles.calibrateHint}>
                Move your phone briefly to calibrate your direction.
              </Text>
            ) : (
              <Text style={styles.destLabel}>DESTINATION · START POINT</Text>
            )}

            {returnState.offRoute === 'OFF_ROUTE_CONFIRMED' && (
              <View style={styles.offRouteRow}>
                <Ionicons name="warning" size={16} color="#fff" />
                <Text style={styles.offRouteText}>
                  OFF ROUTE — you have moved away from the return path.
                </Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statBlock}>
                <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>
                  {formatDistance(stats.distance)}
                </Text>
                <Text style={styles.statLabel}>DISTANCE</Text>
              </View>
              <View style={styles.statBlock}>
                <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>
                  {formatDuration(stats.activeDurationMs)}
                </Text>
                <Text style={styles.statLabel}>TIME</Text>
              </View>
              <View style={styles.statBlock}>
                <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>
                  {formatPace(stats.avgPaceSecPerKm || null)}
                </Text>
                <Text style={styles.statLabel}>PACE</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.detailCard}>
          <DetailRow
            icon="locate"
            label="GPS"
            value={hasGPS ? `${gpsQuality}${gpsAccuracy < 999 ? ` · ±${Math.round(gpsAccuracy)} m` : ''}` : 'Searching'}
            valueColor={hasGPS ? gpsColor : Colors.textMuted}
          />
          <DetailRow icon="analytics" label="Points" value={`${pointCount} recorded`} />
          <DetailRow
            icon="save"
            label="Storage"
            value="Saved on this device"
          />
        </View>

        <View style={styles.mapNote}>
          <Ionicons name="map-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.mapNoteText}>
            Map unavailable offline. Tracking, time, distance and return guidance
            keep working — your trip is being saved on this device.
          </Text>
        </View>

        {/* Controls */}
        {state === 'IDLE' && (
          <TouchableOpacity
            style={[styles.primaryBtn, !hasInitial && styles.disabled]}
            disabled={!hasInitial}
            onPress={() => {
              triggerHeavyTap();
              startTrip().catch(() => {});
            }}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Start trip"
          >
            <Ionicons name="play" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryText}>START TRIP</Text>
          </TouchableOpacity>
        )}

        {(isActive || isPaused) && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.secondaryBtn]}
              onPress={() => {
                triggerTap();
                if (isActive) pause();
                else resume();
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={isActive ? 'Pause trip' : 'Resume trip'}
            >
              <Ionicons
                name={isActive ? 'pause' : 'play'}
                size={18}
                color="#fff"
                style={{ marginRight: 6 }}
              />
              <Text style={styles.actionText}>{isActive ? 'PAUSE' : 'RESUME'}</Text>
            </TouchableOpacity>

            {isActive && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.returnOfflineBtn, !hasPoints && styles.disabled]}
                disabled={!hasPoints}
                onPress={() => {
                  triggerMediumTap();
                  returnToStart().catch(() => {});
                }}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Return to start"
              >
                <Ionicons
                  name="return-down-back"
                  size={18}
                  color="#fff"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.actionText}>RETURN TO START</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, styles.dangerBtn]}
              onPress={() => {
                triggerHeavyTap();
                setConfirmEnd(true);
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="End trip"
            >
              <Ionicons name="flag" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.actionText}>END TRIP</Text>
            </TouchableOpacity>
          </View>
        )}

        {isReturning && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.secondaryBtn]}
              onPress={() => {
                triggerMediumTap();
                cancelReturn();
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Cancel return to start"
            >
              <Ionicons name="close-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.actionText}>CANCEL RETURN</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.dangerBtn]}
              onPress={() => {
                triggerHeavyTap();
                setConfirmEnd(true);
              }}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="End trip"
            >
              <Ionicons name="flag" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.actionText}>END TRIP</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'IDLE' && (
          <Text style={styles.savedNote}>
            Your trips are stored locally and work without an internet connection.
          </Text>
        )}
      </ScrollView>

      <ConfirmEndModal
        visible={confirmEnd}
        onCancel={() => setConfirmEnd(false)}
        onConfirm={() => {
          setConfirmEnd(false);
          triggerHeavyTap();
          useTripStore.getState().endTrip().catch(() => {});
        }}
      />
    </View>
  );
};

const ConfirmEndModal: React.FC<{
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ visible, onCancel, onConfirm }) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>End this trip?</Text>
        <Text style={styles.modalSubtitle}>
          Tracking will stop and your trip will be saved to history on this device.
        </Text>
        <View style={styles.modalButtons}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
            <Text style={styles.cancelBtnText}>Keep Recording</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.confirmBtn} onPress={onConfirm} activeOpacity={0.85}>
            <Text style={styles.confirmBtnText}>End & Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const DetailRow: React.FC<{
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  valueColor?: string;
}> = ({ icon, label, value, valueColor }) => (
  <View style={styles.detailRow}>
    <Ionicons name={icon} size={18} color={Colors.primaryLight} />
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={[styles.detailValue, { color: valueColor ?? Colors.text }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  topRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  brand: {
    fontSize: FontSize.xs,
    letterSpacing: 3,
    fontWeight: FontWeight.bold,
    color: Colors.primaryLight,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  offlineText: {
    color: Colors.warning,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
    marginLeft: 5,
  },
  stateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  gpsDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  stateText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
  },
  statsCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statsRow: { flexDirection: 'row' },
  statBlock: { flex: 1, alignItems: 'center' },
  statValue: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    maxWidth: '95%',
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 1,
    marginTop: 4,
  },
  returnCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: RouteColors.returnRoute,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  returnHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  returnTitle: {
    color: RouteColors.returnRoute,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    letterSpacing: 1.5,
    marginLeft: 6,
  },
  returnMain: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  compassWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  arrowCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: RouteColors.returnRoute,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  returnInfo: { flex: 1 },
  returnDistance: { fontSize: 44, fontWeight: FontWeight.bold, color: Colors.text },
  returnEta: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
    marginTop: 2,
  },
  calibrateHint: {
    fontSize: FontSize.xs,
    color: Colors.warningLight,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  destLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  offRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.danger,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.md,
  },
  offRouteText: {
    color: '#fff',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    marginLeft: 6,
    flex: 1,
  },
  detailCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  detailLabel: {
    flex: 1,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
    fontSize: FontSize.sm,
  },
  detailValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  mapNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
    maxWidth: 420,
  },
  mapNoteText: {
    flex: 1,
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginLeft: Spacing.sm,
    lineHeight: 17,
  },
  primaryBtn: {
    width: '100%',
    maxWidth: 420,
    minHeight: 58,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...Shadows.md,
  },
  primaryText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    letterSpacing: 1.5,
  },
  actionRow: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    minHeight: 54,
    borderRadius: BorderRadius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    ...Shadows.md,
  },
  secondaryBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  returnOfflineBtn: { backgroundColor: Colors.primary },
  dangerBtn: { backgroundColor: Colors.danger },
  actionText: {
    color: '#fff',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
    textAlign: 'center',
    flexShrink: 1,
  },
  disabled: { opacity: 0.45 },
  savedNote: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.lg,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  modalSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  modalButtons: { flexDirection: 'row', gap: Spacing.md },
  cancelBtn: {
    flex: 1,
    minHeight: 52,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: FontWeight.semibold },
  confirmBtn: {
    flex: 1,
    minHeight: 52,
    backgroundColor: Colors.danger,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: { color: '#fff', fontWeight: FontWeight.bold },
});

export default React.memo(OfflineScreen);
