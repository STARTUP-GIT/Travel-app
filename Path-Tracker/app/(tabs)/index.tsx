import React, { useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useTripStore } from '@/store/trip-store';
import { useTripSession } from '@/hooks/useTripSession';
import TripMap, { TripMapHandle } from '@/maps/TripMap';
import { HeaderBar } from '@/components/HeaderBar';
import { TripStatsCard } from '@/components/TripStatsCard';
import { TripControls } from '@/components/TripControls';
import { ReturnHUD } from '@/components/ReturnHUD';
import { OffRouteBanner } from '@/components/OffRouteBanner';
import { MapLegend } from '@/components/MapLegend';
import { FloatingControls } from '@/components/FloatingControls';
import { HomeIdleCard } from '@/components/HomeIdleCard';
import { TripCompleteModal } from '@/components/TripCompleteModal';
import { LocationPermissionScreen } from '@/components/LocationPermissionScreen';
import { LocationSearchingScreen } from '@/components/LocationSearchingScreen';
import { RecoveryPrompt } from '@/components/RecoveryPrompt';
import { ArrivedBanner } from '@/components/ArrivedBanner';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/theme';
import { Coordinate } from '@/types';

/**
 * Home = the live tracking center.
 *
 * Layout order (never the other way around):
 *   GPS → TripEngine → SQLite → UI/map/stats/return
 *
 * When offline the Google Map is unmounted and replaced by a blank/dark area.
 * GPS, tracking, timer, distance, points and return logic ALL continue working
 * regardless of internet connectivity. Only the map visualization is affected.
 */
export default function HomeScreen() {
  const session = useTripSession();

  const state = useTripStore((s) => s.state);
  const networkState = useTripStore((s) => s.networkState);
  const currentPosition = useTripStore((s) => s.currentPosition);
  const hasInitial = useTripStore((s) => s.hasInitialPosition);
  const isFollowing = useTripStore((s) => s.isFollowing);
  const activeTrip = useTripStore((s) => s.activeTrip);
  const returnState = useTripStore((s) => s.returnState);
  const activeCheckpoints = useTripStore((s) => s.activeCheckpoints);
  const setFollowing = useTripStore((s) => s.setFollowing);
  const requestRecenter = useTripStore((s) => s.requestRecenter);

  const mapRef = useRef<TripMapHandle>(null);

  const isReturning = state === 'RETURNING';
  const hasLiveTrip = state === 'ACTIVE' || state === 'PAUSED' || state === 'RETURNING' || state === 'ARRIVED';
  const isOffline = networkState === 'offline';

  const recordedPath = useMemo(
    () => (activeTrip?.points ?? []) as Coordinate[],
    [activeTrip?.points]
  );
  const start = useMemo(() => recordedPath[0] ?? null, [recordedPath]);
  const destination = useMemo(
    () => (isReturning ? returnState.destination : null),
    [isReturning, returnState.destination]
  );

  const handleRecenter = useCallback(() => {
    requestRecenter();
    mapRef.current?.recenter();
  }, [requestRecenter]);
  const handleUserPan = useCallback(() => {
    setFollowing(false);
  }, [setFollowing]);

  // ---- Permission gates ----
  if (session.permissionLoading) {
    return (
      <View style={styles.container}>
        <LocationSearchingScreen />
      </View>
    );
  }

  if (!session.permissionGranted) {
    return (
      <View style={styles.container}>
        <LocationPermissionScreen
          onEnable={session.requestPermission}
          loading={session.permissionLoading}
        />
      </View>
    );
  }

  // ---- Waiting for initial GPS fix ----
  if (!hasInitial && !currentPosition) {
    return (
      <View style={styles.container}>
        <LocationSearchingScreen />
        <RecoveryPrompt />
      </View>
    );
  }

  // ---- Live map view ----
  return (
    <View style={styles.container}>
      {/* Google Map — only rendered when ONLINE.
          When offline, the map is fully unmounted and a blank dark area is shown.
          GPS tracking, timer, distance, points and return logic continue independently. */}
      {!isOffline ? (
        <TripMap
          ref={mapRef}
          recordedPath={recordedPath}
          returnCorridor={isReturning ? returnState.returnCorridor : null}
          recoveryRoute={isReturning ? returnState.recoveryRoute : null}
          returnRoute={isReturning ? returnState.onlineRoute : null}
          start={start}
          destination={destination}
          checkpoints={activeCheckpoints}
          isReturning={isReturning}
          follow={isFollowing}
          onUserPan={handleUserPan}
        />
      ) : (
        <View style={styles.offlineMap}>
          <Text style={styles.offlineIcon}>MAP UNAVAILABLE</Text>
          <Text style={styles.offlineText}>Offline — map tiles require internet</Text>
          {hasLiveTrip && (
            <Text style={styles.offlineHint}>GPS tracking continues normally</Text>
          )}
        </View>
      )}

      <HeaderBar online={!isOffline} />
      <MapLegend />
      <OffRouteBanner />
      <FloatingControls isReturning={isReturning} onRecenter={handleRecenter} />

      {isReturning ? <ReturnHUD /> : hasLiveTrip ? <TripStatsCard /> : null}

      {hasLiveTrip ? <TripControls /> : <HomeIdleCard />}

      <ArrivedBanner />
      <TripCompleteModal />
      <RecoveryPrompt />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  offlineMap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  offlineIcon: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 2,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },
  offlineText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  offlineHint: {
    fontSize: FontSize.xs,
    color: Colors.success,
    marginTop: Spacing.xs,
    fontWeight: FontWeight.medium,
  },
});
