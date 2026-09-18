import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Trip, Checkpoint, Coordinate } from '../types';
import { getShareStats } from '../utils/share-image';
import { regionForCoordinates } from '../utils/geo';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing, RouteColors } from '../constants/theme';
import { GOOGLE_MAPS_DARK_STYLE } from '../maps/map-config';

const MAP_WIDTH = 600;
const MAP_HEIGHT = 700;

interface Props {
  trip: Trip;
  checkpoints: Checkpoint[];
  onDone: () => void;
}

/**
 * Share image for a completed trip.
 * Uses a native MapView snapshot via react-native-maps takeSnapshot()
 * to capture the actual Google Maps rendering with route, markers, and checkpoints.
 */
export const ShareTripImage: React.FC<Props> = ({ trip, checkpoints, onDone }) => {
  const viewShotRef = useRef<ViewShot>(null);
  const mapRef = useRef<MapView>(null);
  const [capturing, setCapturing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [snapshotUri, setSnapshotUri] = useState<string | null>(null);
  const doneRef = useRef(false);
  const snapshotTakenRef = useRef(false);

  const duration = trip.endTime
    ? trip.endTime - trip.startTime
    : trip.activeDurationMs;

  const start = trip.points[0] ?? null;
  const end =
    trip.points.length > 1 ? trip.points[trip.points.length - 1] : null;

  const stats = getShareStats(trip.totalDistance, duration);

  const allCoords: Coordinate[] = [...trip.points];
  if (start) allCoords.push(start);
  if (end) allCoords.push(end);
  for (const cp of checkpoints) {
    const cpCoord: Coordinate = { latitude: cp.latitude, longitude: cp.longitude, timestamp: 0 };
    if (trip.points.length >= 2) {
      const cpLat = cp.latitude;
      const cpLng = cp.longitude;
      let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
      for (const p of trip.points) {
        if (p.latitude < minLat) minLat = p.latitude;
        if (p.latitude > maxLat) maxLat = p.latitude;
        if (p.longitude < minLng) minLng = p.longitude;
        if (p.longitude > maxLng) maxLng = p.longitude;
      }
      const span = Math.max(maxLat - minLat, maxLng - minLng);
      const margin = Math.max(span * 5, 0.05);
      if (cpLat < minLat - margin || cpLat > maxLat + margin ||
          cpLng < minLng - margin || cpLng > maxLng + margin) {
        continue;
      }
    }
    allCoords.push(cpCoord);
  }

  const region = regionForCoordinates(allCoords.length > 0 ? allCoords : [{ latitude: 0, longitude: 0, timestamp: 0 }]);

  const mapRegion: Region | undefined = useMemo(() => region
    ? {
        latitude: region.latitude,
        longitude: region.longitude,
        latitudeDelta: region.latitudeDelta,
        longitudeDelta: region.longitudeDelta,
      }
    : undefined, [region]);

  const recordedCoords = trip.points.map((c) => ({
    latitude: c.latitude,
    longitude: c.longitude,
  }));

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

  const fitMapRegion = useCallback(() => {
    if (!mapRef.current || !mapRegion) return;
    mapRef.current.animateToRegion(mapRegion, 0);
  }, [mapRegion]);

  const captureMap = useCallback(async () => {
    if (!mapRef.current || snapshotTakenRef.current) return;
    snapshotTakenRef.current = true;
    try {
      const uri = await mapRef.current.takeSnapshot({
        width: MAP_WIDTH,
        height: MAP_HEIGHT,
        format: 'png',
        quality: 1,
      });
      setSnapshotUri(uri);
    } catch {
      if (!doneRef.current) {
        setError('Failed to capture map snapshot');
      }
    }
  }, []);

  const captureCard = useCallback(async () => {
    if (doneRef.current || !snapshotUri) return;
    try {
      const uri = await viewShotRef.current?.capture?.();
      if (!uri || doneRef.current) return;
      doneRef.current = true;

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share Trip',
        });
      }
    } catch {
      if (!doneRef.current) {
        setError('Failed to generate share image');
      }
    } finally {
      setCapturing(false);
      onDone();
    }
  }, [snapshotUri, onDone]);

  // After map is ready, wait for tiles to render then take snapshot
  useEffect(() => {
    if (!mapReady) return;
    const timer = setTimeout(() => {
      captureMap();
    }, 1500);
    return () => clearTimeout(timer);
  }, [mapReady, captureMap, fitMapRegion]);

  // After snapshot is captured, wait for Image to load then capture card
  useEffect(() => {
    if (!snapshotUri) return;
    const timer = setTimeout(() => {
      captureCard();
    }, 800);
    return () => clearTimeout(timer);
  }, [snapshotUri, captureCard]);

  if (error) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Hidden native map that renders the actual route */}
      {!snapshotUri && (
        <View style={styles.hiddenMapContainer}>
          <MapView
            ref={mapRef}
            style={styles.hiddenMap}
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
            rotateEnabled={false}
            scrollEnabled={false}
            zoomEnabled={false}
            initialRegion={mapRegion}
            onMapReady={() => {
              fitMapRegion();
              setMapReady(true);
            }}
          >
            {recordedCoords.length >= 2 && (
              <Polyline
                coordinates={recordedCoords}
                strokeColor={RouteColors.recorded}
                strokeWidth={8}
                lineCap="round"
                lineJoin="round"
              />
            )}
            {startCoord && (
              <Marker
                coordinate={startCoord}
                anchor={{ x: 0.5, y: 1 }}
                flat
              >
                <View style={styles.markerBadge}>
                  <View style={[styles.markerPill, { backgroundColor: RouteColors.start }]}>
                    <Text style={styles.markerText}>START</Text>
                  </View>
                  <View style={[styles.markerStem, { borderTopColor: RouteColors.start }]} />
                  <View style={styles.markerDotOuter}>
                    <View style={[styles.markerDot, { backgroundColor: RouteColors.start }]} />
                  </View>
                </View>
              </Marker>
            )}
            {endCoord && (
              <Marker
                coordinate={endCoord}
                anchor={{ x: 0.5, y: 1 }}
                flat
              >
                <View style={styles.markerBadge}>
                  <View style={[styles.markerPill, { backgroundColor: RouteColors.destination }]}>
                    <Text style={styles.markerText}>END</Text>
                  </View>
                  <View style={[styles.markerStem, { borderTopColor: RouteColors.destination }]} />
                  <View style={styles.markerDotOuter}>
                    <View style={[styles.markerDot, { backgroundColor: RouteColors.destination }]} />
                  </View>
                </View>
              </Marker>
            )}
            {checkpoints.map((cp) => (
              <Marker
                key={cp.checkpointId}
                coordinate={{ latitude: cp.latitude, longitude: cp.longitude }}
                anchor={{ x: 0.5, y: 1 }}
                flat
              >
                <View style={styles.markerBadge}>
                  <View style={[styles.markerPill, { backgroundColor: '#A855F7' }]}>
                    <Text style={styles.markerText}>CP{cp.checkpointNumber}</Text>
                  </View>
                  <View style={[styles.markerStem, { borderTopColor: '#A855F7' }]} />
                  <View style={styles.markerDotOuter}>
                    <View style={[styles.markerDot, { backgroundColor: '#A855F7' }]} />
                  </View>
                </View>
              </Marker>
            ))}
          </MapView>
        </View>
      )}

      {/* Share card with snapshot */}
      <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
        <View style={styles.imageCard}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.brand}>PATH TRACKER</Text>
          </View>

          {/* Map image */}
          {snapshotUri ? (
            <Image
              source={{ uri: snapshotUri }}
              style={styles.mapImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.mapImage, styles.mapPlaceholder]}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.mapPlaceholderText}>Rendering map...</Text>
            </View>
          )}

          {/* Stats bar */}
          <View style={styles.statsBar}>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{stats.distance}</Text>
              <Text style={styles.statLabel}>DISTANCE</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{stats.duration}</Text>
              <Text style={styles.statLabel}>DURATION</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{stats.speed}</Text>
              <Text style={styles.statLabel}>SPEED</Text>
            </View>
          </View>

          {/* Route info */}
          <View style={styles.routeInfo}>
            <View style={styles.routeInfoRow}>
              <View style={[styles.dot, { backgroundColor: RouteColors.start }]} />
              <Text style={styles.routeInfoText}>START</Text>
            </View>
            {checkpoints.length > 0 && (
              <View style={styles.routeInfoRow}>
                <View style={[styles.dot, { backgroundColor: '#A855F7' }]} />
                <Text style={styles.routeInfoText}>
                  {checkpoints.length} CHECKPOINT{checkpoints.length > 1 ? 'S' : ''}
                </Text>
              </View>
            )}
            <View style={styles.routeInfoRow}>
              <View style={[styles.dot, { backgroundColor: RouteColors.destination }]} />
              <Text style={styles.routeInfoText}>END</Text>
            </View>
          </View>
        </View>
      </ViewShot>

      {capturing && (
        <View style={styles.capturingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.capturingText}>Generating image...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: -9999,
    top: 0,
  },
  hiddenMapContainer: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
    overflow: 'hidden',
  },
  hiddenMap: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
  },
  imageCard: {
    width: MAP_WIDTH,
    backgroundColor: '#0F1115',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  brand: {
    fontSize: FontSize.xs,
    letterSpacing: 3,
    color: Colors.primaryLight,
    fontWeight: FontWeight.bold,
  },
  mapImage: {
    width: MAP_WIDTH,
    height: MAP_HEIGHT,
  },
  mapPlaceholder: {
    backgroundColor: '#15181E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholderText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    marginTop: Spacing.md,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1E25',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 9,
    color: '#6C7280',
    letterSpacing: 1,
    marginTop: 4,
  },
  routeInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xl,
    backgroundColor: '#1A1E25',
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.sm,
  },
  routeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  routeInfoText: {
    fontSize: 9,
    color: '#B9C0CC',
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.5,
  },
  capturingOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15,17,21,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  capturingText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: Spacing.md,
  },
  // Map marker styles (matching TripMap.tsx)
  markerBadge: { alignItems: 'center' },
  markerPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  markerText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  markerStem: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  markerDotOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginTop: 1,
  },
  markerDot: { width: 12, height: 12, borderRadius: 6 },
});

export default React.memo(ShareTripImage);
