import React, {
  forwardRef,
  useImperativeHandle,
} from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Coordinate } from '../types';
import { formatDistance, calculateTotalDistance } from '../utils/geo';
import { Colors, FontSize, FontWeight, BorderRadius, Spacing } from '../constants/theme';

/**
 * Web fallback for TripMap. The Path Tracker product targets native mobile
 * (background GPS, notifications, vibration). On web we render an intentional,
 * non-broken status panel instead of a broken map.
 */
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
  isReturning: boolean;
  follow?: boolean;
  live?: boolean;
  initialRegion?: any | null;
  onUserPan?: () => void;
  onMapReady?: () => void;
}

const TripMap = forwardRef<TripMapHandle, TripMapProps>(
  ({ recordedPath, start, destination, end, isReturning, onMapReady }, ref) => {
    useImperativeHandle(ref, () => ({ recenter: () => {} }));

    const recordedDist = calculateTotalDistance(recordedPath);
    const startCoord = start;
    const destCoord = destination && isReturning ? destination : null;
    const endCoord = end && !isReturning ? end : null;

    return (
      <View style={styles.container}>
        <View style={styles.panel}>
          <Text style={styles.brand}>PATH TRACKER</Text>
          <Text style={styles.note}>
            Interactive maps are available in the mobile app.
          </Text>
          <View style={styles.row}>
            <Info label="RECORDED PATH" value={formatDistance(recordedDist)} />
            <Info label="POINTS" value={String(recordedPath.length)} />
          </View>
          {startCoord && (
            <View style={styles.coordBox}>
              <Text style={styles.coordLabel}>START</Text>
              <Text style={styles.coordText}>
                {startCoord.latitude.toFixed(5)}, {startCoord.longitude.toFixed(5)}
              </Text>
            </View>
          )}
          {destCoord && (
            <View style={styles.coordBox}>
              <Text style={[styles.coordLabel, { color: '#FF6B35' }]}>DESTINATION</Text>
              <Text style={styles.coordText}>
                {destCoord.latitude.toFixed(5)}, {destCoord.longitude.toFixed(5)}
              </Text>
            </View>
          )}
          {endCoord && (
            <View style={styles.coordBox}>
              <Text style={[styles.coordLabel, { color: '#FF6B35' }]}>END</Text>
              <Text style={styles.coordText}>
                {endCoord.latitude.toFixed(5)}, {endCoord.longitude.toFixed(5)}
              </Text>
            </View>
          )}
          {onMapReady && <MapReadyNotifier onReady={onMapReady} />}
        </View>
      </View>
    );
  }
);

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.info}>
    <Text style={styles.infoValue}>{value}</Text>
    <Text style={styles.infoLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: '#0F1115' },
  panel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  brand: {
    fontSize: FontSize.xs,
    letterSpacing: 3,
    color: Colors.primaryLight,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.lg,
  },
  note: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 320,
    marginBottom: Spacing.xl,
  },
  info: { alignItems: 'center' },
  infoValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, color: Colors.text },
  infoLabel: { fontSize: FontSize.xs, color: Colors.textMuted, letterSpacing: 1, marginTop: 4 },
  coordBox: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    width: '100%',
    maxWidth: 320,
    marginBottom: Spacing.sm,
  },
  coordLabel: {
    fontSize: FontSize.xs,
    color: '#22C55E',
    letterSpacing: 1,
    fontWeight: FontWeight.bold,
  },
  coordText: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
});

const MapReadyNotifier: React.FC<{ onReady: () => void }> = ({ onReady }) => {
  React.useEffect(() => {
    onReady();
  }, [onReady]);
  return null;
};

TripMap.displayName = 'TripMapWeb';
export default React.memo(TripMap);
