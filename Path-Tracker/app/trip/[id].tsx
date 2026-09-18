import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTripStore } from '@/store/trip-store';
import { startNetworkListener } from '@/services/network-service';
import { formatDistance, formatDuration, formatSpeed, regionForCoordinates } from '@/utils/geo';
import {
  Colors,
  FontSize,
  FontWeight,
  BorderRadius,
  Spacing,
  RouteColors,
} from '@/constants/theme';
import { NetworkState, Trip, Checkpoint, MapRegion } from '@/types';
import { triggerHeavyTap } from '@/services/alert-service';
import { loadCheckpoints as dbLoadCheckpoints } from '@/services/database-service';
import TripMap from '@/maps/TripMap';
import { ShareTripImage } from '@/components/ShareTripImage';

function formatClock(ts?: number): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function TripDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const loadTrip = useTripStore((s) => s.loadTrip);
  const deleteTrip = useTripStore((s) => s.deleteTrip);

  const [trip, setTrip] = useState<Trip | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [online, setOnline] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!id) return;
    setLoading(true);
    loadTrip(id)
      .then((t) => {
        if (!mounted) return;
        if (!t) setNotFound(true);
        else {
          setTrip(t);
          dbLoadCheckpoints(id).then((cps) => {
            if (mounted) setCheckpoints(cps);
          }).catch(() => {});
        }
      })
      .catch(() => mounted && setNotFound(true))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [id, loadTrip]);

  // Track connectivity so we never show a broken map for a saved trip.
  useEffect(() => {
    const unsub = startNetworkListener((s: NetworkState) => {
      setOnline(s !== 'offline');
    });
    return unsub;
  }, []);

  const points = useMemo(() => trip?.points ?? [], [trip]);
  const start = points[0] ?? null;
  const endPoint = points.length > 1 ? points[points.length - 1] : null;

  const region = useMemo<MapRegion | null>(() => {
    if (points.length < 2) return null;
    return regionForCoordinates(points);
  }, [points]);

  const duration = trip
    ? trip.endTime
      ? trip.endTime - trip.startTime
      : trip.activeDurationMs
    : 0;
  const speed = formatSpeed(trip?.totalDistance ?? 0, duration);
  const avgSpeed = trip?.avgSpeed ?? (trip && duration > 0 ? trip.totalDistance / (duration / 1000) : 0);

  const handleDelete = () => {
    if (!trip) return;
    Alert.alert(
      'Delete this trip?',
      'This permanently removes the trip and its recorded path from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            triggerHeavyTap();
            deleteTrip(trip.id)
              .catch(() => {})
              .finally(() => router.back());
          },
        },
      ]
    );
  };

  const handleShare = () => {
    if (!trip) return;
    setSharing(true);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Details</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={Colors.primaryLight} />
        </View>
      ) : notFound || !trip ? (
        <View style={styles.centerFill}>
          <Ionicons name="alert-circle-outline" size={52} color={Colors.textMuted} />
          <Text style={styles.notFoundText}>This trip could not be found.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.backBtnText}>GO BACK</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <Text style={styles.dateHeading}>{formatClock(trip.startTime)}</Text>

          <View style={styles.statsCard}>
            <Stat value={formatDistance(trip.totalDistance)} label="DISTANCE" />
            <Stat value={formatDuration(duration)} label="DURATION" />
            <Stat value={speed} label="SPEED" />
          </View>

          {trip.returnedToStart && (
            <View style={styles.returnBadge}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
              <Text style={styles.returnBadgeText}>RETURNED TO START</Text>
            </View>
          )}

          {/* Route map (online only) */}
          {online && points.length >= 2 && region ? (
            <View style={styles.mapCard}>
              <TripMap
                recordedPath={points}
                start={start}
                end={endPoint}
                checkpoints={checkpoints}
                isReturning={false}
                follow={false}
                live={false}
                initialRegion={region}
              />
              <View style={styles.mapLegend}>
                <LegendItem color={RouteColors.recorded} label="RECORDED PATH" />
                <LegendItem color={RouteColors.start} label="START" />
                {checkpoints.length > 0 && (
                  <LegendItem color="#A855F7" label={`${checkpoints.length} CP`} />
                )}
                <LegendItem color={RouteColors.destination} label="END" />
              </View>
            </View>
          ) : (
            <View style={styles.mapCard}>
              <View style={styles.offlineMapPlaceholder}>
                {points.length >= 2 ? (
                  <>
                    <Ionicons name="cloud-offline" size={30} color={Colors.textMuted} />
                    <Text style={styles.offlineMapTitle}>Route map unavailable</Text>
                    <Text style={styles.offlineMapText}>
                      Connect to the internet to see the route you travelled.
                      Your trip data is saved on this device.
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="map-outline" size={30} color={Colors.textMuted} />
                    <Text style={styles.offlineMapTitle}>No recorded route</Text>
                    <Text style={styles.offlineMapText}>
                      This trip has no recorded points.
                    </Text>
                  </>
                )}
              </View>
            </View>
          )}

          <View style={styles.infoSection}>
            <InfoRow label="STARTED" value={formatClock(trip.startTime)} />
            <InfoRow label="ENDED" value={formatClock(trip.endTime)} />
            <InfoRow label="ACTIVE TIME" value={formatDuration(trip.activeDurationMs)} />
            <InfoRow
              label="AVG SPEED"
              value={isFinite(avgSpeed) ? `${(avgSpeed * 3.6).toFixed(1)} km/h` : '—'}
            />
            {trip.maxSpeed !== undefined && (
              <InfoRow label="MAX SPEED" value={`${(trip.maxSpeed * 3.6).toFixed(1)} km/h`} />
            )}
            <InfoRow label="POINTS" value={`${points.length}`} />
            {start && (
              <InfoRow
                label="FROM"
                value={`${start.latitude.toFixed(5)}, ${start.longitude.toFixed(5)}`}
                dotColor={RouteColors.start}
              />
            )}
            {endPoint && (
              <InfoRow
                label="TO"
                value={`${endPoint.latitude.toFixed(5)}, ${endPoint.longitude.toFixed(5)}`}
                dotColor={RouteColors.destination}
              />
            )}
          </View>

          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Share this trip"
          >
            <Ionicons name="share-outline" size={18} color={Colors.primary} />
            <Text style={styles.shareText}>SHARE TRIP</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDelete}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Delete this trip"
          >
            <Ionicons name="trash-outline" size={18} color={Colors.danger} />
            <Text style={styles.deleteText}>DELETE TRIP</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {sharing && trip && (
        <ShareTripImage
          trip={trip}
          checkpoints={checkpoints}
          onDone={() => setSharing(false)}
        />
      )}
    </View>
  );
}

const Stat: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <View style={styles.statBlock}>
    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const InfoRow: React.FC<{ label: string; value: string; dotColor?: string }> = ({
  label,
  value,
  dotColor,
}) => (
  <View style={styles.infoRow}>
    {dotColor && <View style={[styles.infoDot, { backgroundColor: dotColor }]} />}
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={1}>
      {value}
    </Text>
  </View>
);

const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendSwatch, { backgroundColor: color }]} />
    <Text style={styles.legendText}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, color: Colors.text },
  scroll: { padding: Spacing.lg, paddingBottom: 48 },
  dateHeading: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.md,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statBlock: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.text, maxWidth: '92%' },
  statLabel: { fontSize: 9, color: Colors.textMuted, letterSpacing: 1, marginTop: 4 },
  returnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: Spacing.md,
  },
  returnBadgeText: {
    color: Colors.success,
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.8,
    marginLeft: 5,
  },
  mapCard: {
    height: 280,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
    marginBottom: Spacing.md,
  },
  mapLegend: {
    position: 'absolute',
    left: Spacing.md,
    bottom: Spacing.md,
    flexDirection: 'row',
    gap: Spacing.md,
    backgroundColor: 'rgba(15,17,21,0.82)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendSwatch: { width: 12, height: 4, borderRadius: 2, marginRight: 4 },
  legendText: { color: Colors.textSecondary, fontSize: 9, fontWeight: FontWeight.semibold },
  offlineMapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  offlineMapTitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: FontWeight.semibold,
    marginTop: Spacing.sm,
  },
  offlineMapText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 19,
  },
  infoSection: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  infoDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  infoLabel: {
    width: 96,
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.5,
  },
  infoValue: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'right' },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(32,138,239,0.4)',
    backgroundColor: 'rgba(32,138,239,0.08)',
    marginBottom: Spacing.sm,
  },
  shareText: { color: Colors.primary, fontWeight: FontWeight.bold, marginLeft: 6, letterSpacing: 0.5 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.4)',
    backgroundColor: 'rgba(255,59,48,0.08)',
  },
  deleteText: { color: Colors.danger, fontWeight: FontWeight.bold, marginLeft: 6, letterSpacing: 0.5 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxl },
  notFoundText: { color: Colors.textSecondary, fontSize: FontSize.md, marginTop: Spacing.md },
  backBtn: {
    marginTop: Spacing.lg,
    minHeight: 48,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: '#fff', fontWeight: FontWeight.bold, letterSpacing: 1 },
});
