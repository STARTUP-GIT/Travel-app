import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTripStore } from '@/store/trip-store';
import {
  Colors,
  FontSize,
  FontWeight,
  BorderRadius,
  Spacing,
} from '@/constants/theme';
import { formatDistance, formatDuration } from '@/utils/geo';
import { triggerTap } from '@/services/alert-service';
import { TripSummary } from '@/types';

const STATE_META: Record<string, { label: string; color: string; icon: any }> = {
  ACTIVE: { label: 'RECORDING', color: Colors.success, icon: 'radio-button-on' },
  PAUSED: { label: 'PAUSED', color: Colors.warning, icon: 'pause-circle' },
  RETURNING: { label: 'RETURNING', color: Colors.warning, icon: 'return-down-back' },
};

export default function TripsScreen() {
  const insets = useSafeAreaInsets();
  const tripHistory = useTripStore((s) => s.tripHistory);
  const loadHistory = useTripStore((s) => s.loadHistory);
  const deleteTrip = useTripStore((s) => s.deleteTrip);

  useFocusEffect(
    useCallback(() => {
      loadHistory().catch(() => {});
    }, [loadHistory])
  );

  const confirmDelete = (item: TripSummary) => {
    if (item.state !== 'COMPLETED') {
      Alert.alert(
        'Trip still active',
        'Finish this trip from Home before deleting it.',
        [{ text: 'OK' }]
      );
      return;
    }
    Alert.alert(
      'Delete trip?',
      'This will permanently remove the trip and its recorded path from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTrip(item.id).catch(() => {}),
        },
      ]
    );
  };

  const renderCard = ({ item }: { item: TripSummary }) => {
    const duration = item.endTime
      ? item.endTime - item.startTime
      : item.activeDurationMs ?? 0;
    const meta = STATE_META[item.state];
    const isActive = item.state !== 'COMPLETED';

    return (
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.cardMain}
          onPress={() => {
            triggerTap();
            router.push(`/trip/${item.id}`);
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Open trip from ${new Date(item.startTime).toLocaleDateString()}`}
        >
          <View style={styles.cardDate}>
            <Text style={styles.dateDay}>{new Date(item.startTime).getDate()}</Text>
            <Text style={styles.dateMonth}>
              {new Date(item.startTime).toLocaleString('default', { month: 'short' })}
            </Text>
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardDistance}>
              {formatDistance(item.totalDistance)}
            </Text>
            <Text style={styles.cardMeta}>
              {formatDuration(duration)} · {item.pointCount} points
            </Text>
            <View style={styles.badges}>
              {item.returnedToStart && (
                <View style={[styles.badge, { backgroundColor: 'rgba(34,197,94,0.12)' }]}>
                  <Ionicons name="checkmark-circle" size={11} color={Colors.success} />
                  <Text style={[styles.badgeText, { color: Colors.success }]}>RETURNED</Text>
                </View>
              )}
              {isActive && meta && (
                <View style={[styles.badge, { backgroundColor: 'rgba(32,138,239,0.12)' }]}>
                  <Ionicons name={meta.icon} size={11} color={meta.color} />
                  <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
                </View>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => confirmDelete(item)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Delete trip"
          accessibilityHint="Permanently removes this trip from the device"
        >
          <Ionicons name="trash-outline" size={18} color={Colors.dangerLight} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>Trips</Text>
      <Text style={styles.subtitle}>Your recorded outdoor trips</Text>

      <FlatList
        data={tripHistory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="map-outline" size={56} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptySub}>
              Start a trip from Home to record your first path.
            </Text>
          </View>
        }
        renderItem={renderCard}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: {
    fontSize: FontSize.xxxl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    paddingHorizontal: Spacing.lg,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.lg,
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  empty: { alignItems: 'center', paddingVertical: 80 },
  emptyTitle: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.md,
  },
  emptySub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.xxl,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: Spacing.sm,
  },
  cardDate: {
    width: 48,
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  dateDay: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.primaryLight },
  dateMonth: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  cardInfo: { flex: 1 },
  cardDistance: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  cardMeta: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  badges: { flexDirection: 'row', marginTop: 6, gap: 6, flexWrap: 'wrap' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
    marginLeft: 3,
  },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,59,48,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
