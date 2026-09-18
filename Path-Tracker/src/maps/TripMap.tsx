import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, {
  Marker,
  Polyline,
  Circle,
  PROVIDER_GOOGLE,
  type Region,
  type Camera,
} from 'react-native-maps';
import { useTripStore } from '../store/trip-store';
import { RouteColors, Colors, FontWeight, Spacing, MapConfig } from '../constants/theme';
import { GOOGLE_MAPS_DARK_STYLE } from './map-config';
import { Coordinate, MapRegion, Checkpoint } from '../types';
import { toRad, bearing, interpolateAngle } from '../utils/geo';

export interface TripMapHandle {
  recenter: () => void;
}

export interface TripMapProps {
  recordedPath: Coordinate[];
  returnCorridor?: Coordinate[] | null;
  recoveryRoute?: Coordinate[] | null;
  returnRoute?: Coordinate[] | null;
  start?: Coordinate | null;
  destination?: Coordinate | null;
  end?: Coordinate | null;
  checkpoints?: Checkpoint[];
  isReturning: boolean;
  follow: boolean;
  live?: boolean;
  initialRegion?: MapRegion | null;
  onUserPan?: () => void;
  onMapReady?: () => void;
}

const CAMERA_THROTTLE_MS = MapConfig.cameraUpdateThrottleMs;
const EARTH_RADIUS_M = 6371000;

function regionToMapRegion(r: MapRegion): Region {
  return {
    latitude: r.latitude,
    longitude: r.longitude,
    latitudeDelta: r.latitudeDelta,
    longitudeDelta: r.longitudeDelta,
  };
}

function regionForTwo(a: Coordinate, b: Coordinate, factor = 1.5): Region {
  const minLat = Math.min(a.latitude, b.latitude);
  const maxLat = Math.max(a.latitude, b.latitude);
  const minLng = Math.min(a.longitude, b.longitude);
  const maxLng = Math.max(a.longitude, b.longitude);
  const cLat = (minLat + maxLat) / 2;
  const cLng = (minLng + maxLng) / 2;
  let latSpan = (maxLat - minLat) * factor;
  let lngSpan = (maxLng - minLng) * factor;
  const minSpan = 0.0012;
  if (latSpan < minSpan) latSpan = minSpan;
  if (lngSpan < minSpan) lngSpan = minSpan;
  return {
    latitude: cLat,
    longitude: cLng,
    latitudeDelta: latSpan,
    longitudeDelta: lngSpan,
  };
}

const TripMap = forwardRef<TripMapHandle, TripMapProps>(
  (
    {
      recordedPath,
      returnCorridor,
      recoveryRoute,
      returnRoute,
      start,
      destination,
      end,
      checkpoints,
      isReturning,
      follow,
      live = true,
      initialRegion,
      onUserPan,
      onMapReady,
    },
    ref
  ) => {
    const insets = useSafeAreaInsets();
    const currentPosition = useTripStore((s) => s.currentPosition);
    const acceptedPosition = useTripStore((s) => s.acceptedPosition);
    const movementState = useTripStore((s) => s.movementState);
    const offRouteConfirmed = useTripStore(
      (s) => s.returnState.offRoute === 'OFF_ROUTE_CONFIRMED'
    );

    const mapRef = useRef<MapView>(null);
    const mapReadyRef = useRef(false);
    const centeredOnceRef = useRef(false);
    const lastCameraAtRef = useRef(0);
    const currentHeadingRef = useRef(0);

    const currentPositionRef = useRef(currentPosition);
    currentPositionRef.current = currentPosition;
    const acceptedPositionRef = useRef(acceptedPosition);
    acceptedPositionRef.current = acceptedPosition;
    const movementStateRef = useRef(movementState);
    movementStateRef.current = movementState;
    const destinationRef = useRef<Coordinate | null>(destination ?? start ?? null);
    destinationRef.current = destination ?? start ?? null;
    const isReturningRef = useRef(isReturning);
    isReturningRef.current = isReturning;
    const followRef = useRef(follow);
    followRef.current = follow;

    const [hasMapLoaded, setHasMapLoaded] = useState(false);

    const returnState = useTripStore((s) => s.returnState);

    useImperativeHandle(
      ref,
      () => ({
        recenter: () => {
          const pos = currentPositionRef.current;
          if (mapRef.current && pos) {
            mapRef.current.animateCamera(
              {
                center: { latitude: pos.latitude, longitude: pos.longitude },
                zoom: MapConfig.defaultZoom,
              },
              { duration: 500 }
            );
            lastCameraAtRef.current = Date.now();
          }
        },
      }),
      []
    );

    const frameReturn = useCallback(() => {
      const pos = currentPositionRef.current;
      const dest = destinationRef.current;
      if (!mapReadyRef.current || !mapRef.current || !pos || !dest) return;
      mapRef.current.fitToCoordinates(
        [
          { latitude: pos.latitude, longitude: pos.longitude },
          { latitude: dest.latitude, longitude: dest.longitude },
        ],
        {
          edgePadding: { top: 220, right: 90, bottom: 320, left: 90 },
          animated: true,
        }
      );
      lastCameraAtRef.current = Date.now();
    }, []);

    const fitRegion = useCallback((region: MapRegion) => {
      if (!mapReadyRef.current || !mapRef.current) return;
      mapRef.current.animateToRegion(regionToMapRegion(region), 0);
    }, []);

    const handleMapReady = useCallback(() => {
      mapReadyRef.current = true;
      setHasMapLoaded(true);
      const pos = currentPositionRef.current;
      if (live) {
        if (pos && !centeredOnceRef.current) {
          centeredOnceRef.current = true;
          mapRef.current?.animateCamera(
            {
              center: { latitude: pos.latitude, longitude: pos.longitude },
              zoom: MapConfig.defaultZoom,
            },
            { duration: 0 }
          );
        }
        if (isReturningRef.current) frameReturn();
      } else {
        const region = initialRegion;
        if (region) fitRegion(region);
      }
      onMapReady?.();
    }, [live, frameReturn, fitRegion, onMapReady, initialRegion]);

    // Camera follow logic — updated when GPS position changes
    // CRITICAL: Only update camera heading when the engine reports MOVING state.
    // While STATIONARY or UNCERTAIN, freeze the heading to prevent continuous
    // map rotation caused by GPS noise and compass jitter.
    useEffect(() => {
      if (!live || !follow) return;
      // Use accepted position for camera to avoid raw-spike camera jumps
      const pos = acceptedPositionRef.current ?? currentPositionRef.current;
      if (!mapReadyRef.current || !mapRef.current || !pos) return;
      const now = Date.now();
      if (now - lastCameraAtRef.current < CAMERA_THROTTLE_MS) return;
      lastCameraAtRef.current = now;

      const movement = movementStateRef.current;

      // Only recalculate heading when genuinely moving
      if (movement === 'MOVING') {
        let targetHeading = currentHeadingRef.current;

        if (isReturning && returnCorridor && returnCorridor.length >= 2) {
          // Return direction: bear toward next waypoint along corridor
          targetHeading = bearing(returnCorridor[0], returnCorridor[1]);
        } else if (isReturning && destination) {
          targetHeading = bearing(pos, destination);
        } else if (recordedPath.length >= 2) {
          // Use displacement between last two accepted recorded points
          const last = recordedPath[recordedPath.length - 1];
          const prev = recordedPath[recordedPath.length - 2];
          targetHeading = bearing(prev, last);
        } else if (pos.heading !== undefined && pos.heading >= 0) {
          // Fall back to GPS bearing only when moving and no better source
          targetHeading = pos.heading;
        } else if (returnState.heading !== undefined) {
          targetHeading = returnState.heading;
        }

        const smoothed = interpolateAngle(
          currentHeadingRef.current,
          targetHeading,
          0.25
        );

        // Only animate camera if heading changed meaningfully (> 3°)
        const headingDiff = Math.abs(
          ((smoothed - currentHeadingRef.current + 540) % 360) - 180
        );
        if (headingDiff > 3) {
          currentHeadingRef.current = smoothed;
        }
      }
      // When STATIONARY or UNCERTAIN: keep currentHeadingRef.current unchanged.

      // Project camera center ~35m ahead in direction of travel
      const headingRad = toRad(currentHeadingRef.current);
      const centerLat =
        pos.latitude +
        ((35 * Math.cos(headingRad)) / EARTH_RADIUS_M) * (180 / Math.PI);
      const centerLng =
        pos.longitude +
        ((35 * Math.sin(headingRad)) /
          (EARTH_RADIUS_M * Math.cos(toRad(pos.latitude)))) *
          (180 / Math.PI);

      mapRef.current.animateCamera(
        {
          center: { latitude: centerLat, longitude: centerLng },
          heading: currentHeadingRef.current,
          zoom: MapConfig.defaultZoom,
        },
        { duration: 450 }
      );
    }, [
      currentPosition,
      acceptedPosition,
      movementState,
      follow,
      live,
      isReturning,
      returnCorridor,
      recordedPath,
      destination,
      returnState.heading,
    ]);

    // Frame return view when entering return mode
    useEffect(() => {
      if (!live || !isReturning) return;
      frameReturn();
    }, [isReturning, live, frameReturn]);

    // Static / history mode: frame initial region
    useEffect(() => {
      if (live) return;
      if (mapReadyRef.current && initialRegion) fitRegion(initialRegion);
    }, [initialRegion, live, fitRegion]);

    // ---- Convert coordinates to react-native-maps format ----
    const recordedCoords = useMemo(
      () =>
        recordedPath.map((c) => ({
          latitude: c.latitude,
          longitude: c.longitude,
        })),
      [recordedPath]
    );

    const activeCorridor = returnCorridor && returnCorridor.length >= 2
      ? returnCorridor
      : returnRoute && returnRoute!.length >= 2
      ? returnRoute
      : null;

    const corridorCoords = useMemo(
      () =>
        activeCorridor
          ? activeCorridor.map((c) => ({
              latitude: c.latitude,
              longitude: c.longitude,
            }))
          : [],
      [activeCorridor]
    );

    const recoveryCoords = useMemo(
      () =>
        isReturning && recoveryRoute && recoveryRoute.length >= 2
          ? recoveryRoute.map((c) => ({
              latitude: c.latitude,
              longitude: c.longitude,
            }))
          : [],
      [isReturning, recoveryRoute]
    );

    // ---- Accuracy ring uses raw currentPosition (shows real uncertainty to user) ----
    const accuracyCenter = live && currentPosition ? currentPosition : null;
    const accuracyRadius =
      accuracyCenter && accuracyCenter.accuracy
        ? Math.max(accuracyCenter.accuracy, 8)
        : 0;

    // ---- User marker uses ACCEPTED position (never shows rejected-spike location) ----
    // If no accepted position yet, fall back to current (before first filter pass)
    const markerPosition = live ? (acceptedPosition ?? currentPosition) : null;
    const userCoord = markerPosition
      ? { latitude: markerPosition.latitude, longitude: markerPosition.longitude }
      : null;

    // Show heading cone only when actually moving (not when stationary)
    const markerHeading = markerPosition?.heading;
    const showHeadingCone =
      movementState === 'MOVING' &&
      markerHeading !== undefined &&
      markerHeading >= 0;

    // ---- Start / End markers ----
    const startCoord = start
      ? { latitude: start.latitude, longitude: start.longitude }
      : null;
    const endCoord =
      end &&
      (!start ||
        end.latitude !== start.latitude ||
        end.longitude !== start.longitude)
        ? { latitude: end.latitude, longitude: end.longitude }
        : null;

    const returnStrokeColor = offRouteConfirmed
      ? RouteColors.deviation
      : RouteColors.returnRoute;
    const returnStrokeWidth = MapConfig.returnInnerWidth;

    const historyRegion = useMemo<Region | undefined>(() => {
      if (live || !initialRegion) return undefined;
      return regionToMapRegion(initialRegion);
    }, [live, initialRegion]);

    return (
      <View style={styles.container}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_GOOGLE}
          customMapStyle={GOOGLE_MAPS_DARK_STYLE}
          showsUserLocation={false}
          showsMyLocationButton={false}
          showsCompass={false}
          showsScale={false}
          showsTraffic={false}
          showsBuildings={false}
          showsIndoors={false}
          pitchEnabled={false}
          rotateEnabled={true}
          scrollEnabled={true}
          zoomEnabled={true}
          initialRegion={historyRegion}
          onMapReady={handleMapReady}
          onPanDrag={() => {
            if (live && followRef.current) onUserPan?.();
          }}
        >
          {/* Accuracy circle (live) */}
          {live && accuracyCenter && accuracyRadius > 0 && (
            <Circle
              center={{
                latitude: accuracyCenter.latitude,
                longitude: accuracyCenter.longitude,
              }}
              radius={accuracyRadius}
              fillColor="rgba(32,138,239,0.10)"
              strokeColor="rgba(32,138,239,0.4)"
              strokeWidth={1.5}
            />
          )}

          {/* Recorded / travelled path — solid BLUE */}
          {recordedCoords.length >= 2 && (
            <Polyline
              coordinates={recordedCoords}
              strokeColor={RouteColors.recorded}
              strokeWidth={MapConfig.routeInnerWidth}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {/* Same-path return corridor — highlighted AMBER */}
          {isReturning && corridorCoords.length >= 2 && (
            <Polyline
              coordinates={corridorCoords}
              strokeColor={returnStrokeColor}
              strokeWidth={returnStrokeWidth}
              lineCap="round"
              lineJoin="round"
            />
          )}

          {/* Recovery route (when off-route) — red dashed reconnect path */}
          {isReturning && recoveryCoords.length >= 2 && (
            <Polyline
              coordinates={recoveryCoords}
              strokeColor={Colors.danger}
              strokeWidth={MapConfig.returnInnerWidth}
              lineCap="round"
              lineJoin="round"
              lineDashPattern={[6, 4]}
            />
          )}

          {/* START marker */}
          {startCoord && (
            <Marker
              coordinate={startCoord}
              anchor={{ x: 0.5, y: 1 }}
              flat
            >
              <OriginBadge
                label={isReturning ? 'START / DEST' : 'START'}
                color={isReturning ? RouteColors.destination : RouteColors.start}
              />
            </Marker>
          )}

          {/* END marker (history view) */}
          {endCoord && (
            <Marker
              coordinate={endCoord}
              anchor={{ x: 0.5, y: 1 }}
              flat
            >
              <OriginBadge label="END" color={RouteColors.destination} />
            </Marker>
          )}

          {/* Checkpoint markers */}
          {checkpoints && checkpoints.map((cp) => (
            <Marker
              key={cp.checkpointId}
              coordinate={{ latitude: cp.latitude, longitude: cp.longitude }}
              anchor={{ x: 0.5, y: 1 }}
              flat
            >
              <OriginBadge
                label={`CP${cp.checkpointNumber}`}
                color="#A855F7"
              />
            </Marker>
          ))}

          {/* Live current-location indicator — uses ACCEPTED position */}
          {live && userCoord && (
            <Marker
              coordinate={userCoord}
              anchor={{ x: 0.5, y: 0.5 }}
              flat
            >
              <UserMarker
                hasHeading={showHeadingCone}
                heading={markerHeading ?? 0}
              />
            </Marker>
          )}
        </MapView>

        {/* Map attribution */}
        <View
          pointerEvents="none"
          style={live ? [styles.attribution, { top: insets.top + 58 }] : styles.attributionCard}
        >
          <Text style={styles.attributionText} numberOfLines={1}>
            Google Maps
          </Text>
        </View>
      </View>
    );
  }
);

/** START / END badge — a labelled pill over a dot. */
const OriginBadge: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <View style={styles.originColumn}>
    <View style={[styles.originPill, { backgroundColor: color }]}>
      <Text style={styles.originPillText}>{label}</Text>
    </View>
    <View style={[styles.originStem, { borderTopColor: color }]} />
    <View style={styles.originDotOuter}>
      <View style={[styles.originDot, { backgroundColor: color }]} />
    </View>
  </View>
);

/** Current-location dot with optional heading cone. */
const UserMarker: React.FC<{ hasHeading: boolean; heading: number }> = ({
  hasHeading,
  heading,
}) => (
  <View
    style={[
      styles.userWrap,
      hasHeading ? { transform: [{ rotate: `${heading}deg` }] } : null,
    ]}
  >
    {hasHeading && <View style={styles.cone} />}
    <View style={styles.userDotOuter}>
      <View style={styles.userDotCore} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.background },
  attribution: {
    position: 'absolute',
    right: Spacing.lg,
    maxWidth: '62%',
    backgroundColor: 'rgba(15,17,21,0.72)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  attributionCard: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    maxWidth: '80%',
    backgroundColor: 'rgba(15,17,21,0.72)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  attributionText: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 8,
    fontWeight: FontWeight.medium,
  },
  originColumn: { alignItems: 'center' },
  originPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  originPillText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  originStem: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  originDotOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 1,
  },
  originDot: { width: 12, height: 12, borderRadius: 6 },
  userWrap: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cone: {
    position: 'absolute',
    top: 1,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: Colors.primary,
  },
  userDotOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(32,138,239,0.18)',
    borderWidth: 3,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  userDotCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
});

TripMap.displayName = 'TripMap';
export default React.memo(TripMap);
