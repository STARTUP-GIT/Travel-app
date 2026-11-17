import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
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
} from '../constants/theme';
import { triggerTap, triggerMediumTap, triggerHeavyTap } from '../services/alert-service';

/**
 * Contextual trip controls for ACTIVE / PAUSED / RETURNING. A single action
 * cluster tailored to the current state — the map stays visible and clean.
 */
export const TripControls: React.FC = () => {
  const insets = useSafeAreaInsets();
  const state = useTripStore((s) => s.state);
  const hasPoints = useTripStore((s) => (s.activeTrip?.points.length ?? 0) >= 2);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const pause = useTripStore((s) => s.pauseTrip);
  const resume = useTripStore((s) => s.resumeTrip);
  const returnToStart = useTripStore((s) => s.returnToStart);
  const cancelReturn = useTripStore((s) => s.cancelReturn);
  const addCheckpoint = useTripStore((s) => s.addCheckpoint);
  const checkpointCount = useTripStore((s) => s.activeCheckpoints.length);

  if (state === 'IDLE' || state === 'COMPLETED' || state === 'ARRIVED') return null;

  const bottom = insets.bottom + 16;

  const endButton = (
    <TouchableOpacity
      style={[styles.actionBtn, styles.endBtn]}
      onPress={() => {
        triggerHeavyTap();
        setConfirmEnd(true);
      }}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="End trip"
    >
      <Ionicons name="flag" size={18} color="#fff" />
      <Text style={styles.actionText}>END TRIP</Text>
    </TouchableOpacity>
  );

  if (state === 'RETURNING') {
    return (
      <View style={[styles.actions, { bottom }]}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.cancelReturnBtn]}
          onPress={() => {
            triggerMediumTap();
            cancelReturn();
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Cancel return to start"
        >
          <Ionicons name="close-circle" size={18} color="#fff" />
          <Text style={styles.actionText}>CANCEL RETURN</Text>
        </TouchableOpacity>
        {endButton}
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
  }

  return (
    <View style={[styles.actionsColumn, { bottom }]}>
      {state === 'ACTIVE' && (
        <TouchableOpacity
          style={styles.checkpointBtn}
          onPress={() => {
            triggerTap();
            addCheckpoint();
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Add checkpoint"
        >
          <Ionicons name="bookmark" size={16} color={Colors.primary} />
          <Text style={styles.checkpointText}>
            CHECKPOINT{checkpointCount > 0 ? ` (${checkpointCount})` : ''}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.pauseBtn]}
          onPress={() => {
            triggerTap();
            if (state === 'ACTIVE') pause();
            else resume();
          }}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={state === 'ACTIVE' ? 'Pause trip' : 'Resume trip'}
        >
          <Ionicons
            name={state === 'ACTIVE' ? 'pause' : 'play'}
            size={18}
            color="#fff"
          />
          <Text style={styles.actionText}>{state === 'ACTIVE' ? 'PAUSE' : 'RESUME'}</Text>
        </TouchableOpacity>

        {state === 'ACTIVE' && (
          <TouchableOpacity
            style={[
              styles.actionBtn,
              styles.returnBtn,
              !hasPoints && styles.disabledBtn,
            ]}
            disabled={!hasPoints}
            onPress={() => {
              triggerMediumTap();
              returnToStart().catch(() => {});
            }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Return to start"
          >
            <Ionicons name="return-down-back" size={18} color="#fff" />
            <Text style={styles.actionText}>RETURN TO START</Text>
          </TouchableOpacity>
        )}

        {endButton}
      </View>

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
          Tracking will stop and your trip will be saved to history.
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

const styles = StyleSheet.create({
  actionsColumn: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 20,
    gap: Spacing.sm,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  checkpointBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: Spacing.md,
  },
  checkpointText: {
    color: Colors.primary,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  actions: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 20,
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
    paddingHorizontal: Spacing.xs,
    ...Shadows.md,
  },
  actionText: {
    color: '#fff',
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
    marginLeft: 4,
    textAlign: 'center',
    flexShrink: 1,
  },
  pauseBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  returnBtn: {
    backgroundColor: Colors.primary,
  },
  cancelReturnBtn: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  endBtn: {
    backgroundColor: Colors.danger,
  },
  disabledBtn: {
    opacity: 0.4,
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
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
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
  cancelBtnText: {
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
  },
  confirmBtn: {
    flex: 1,
    minHeight: 52,
    backgroundColor: Colors.danger,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    color: '#fff',
    fontWeight: FontWeight.bold,
  },
});

export default React.memo(TripControls);
