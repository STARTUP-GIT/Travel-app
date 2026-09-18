import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import { useTripStore } from '@/store/trip-store';
import {
  hasPermissions as hasLocationPermission,
  ensurePermissions,
} from '@/services/location-service';
import { requestNotificationPermission } from '@/services/alert-service';
import {
  Colors,
  FontSize,
  FontWeight,
  BorderRadius,
  Spacing,
} from '@/constants/theme';
import { formatDistance } from '@/utils/geo';

/** Profile: permission health, live status and local-data facts. */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const networkState = useTripStore((s) => s.networkState);
  const tripHistory = useTripStore((s) => s.tripHistory);
  const [locationGranted, setLocationGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const [checking, setChecking] = useState(false);

  const refresh = useCallback(async () => {
    const loc = await hasLocationPermission();
    setLocationGranted(loc);
    try {
      const n = await Notifications.getPermissionsAsync();
      setNotifGranted(n.status === 'granted');
    } catch {
      setNotifGranted(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const totals = tripHistory.reduce(
    (acc, t) => ({
      distance: acc.distance + t.totalDistance,
      duration: acc.duration + (t.endTime ? t.endTime - t.startTime : t.activeDurationMs),
      returned: acc.returned + (t.returnedToStart ? 1 : 0),
    }),
    { distance: 0, duration: 0, returned: 0 }
  );

  const enableLocation = async () => {
    setChecking(true);
    try {
      const ok = await ensurePermissions();
      setLocationGranted(ok);
    } finally {
      setChecking(false);
    }
  };

  const enableNotifications = async () => {
    const ok = await requestNotificationPermission();
    setNotifGranted(ok);
  };

  const networkLabel =
    networkState === 'online' ? 'Online'
    : networkState === 'offline' ? 'Offline'
    : 'Checking…';

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Permissions, status & your data</Text>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Lifetime totals */}
        <View style={styles.totalsCard}>
          <TotalBlock value={tripHistory.length.toString()} label="TRIPS" />
          <TotalBlock value={formatDistance(totals.distance)} label="TOTAL DISTANCE" />
          <TotalBlock value={totals.returned.toString()} label="RETURNED" />
        </View>

        {/* Live status */}
        <SectionTitle text="STATUS" />
        <View style={styles.card}>
          <StatusRow
            icon="radio"
            label="GPS"
            value={locationGranted ? 'Available' : 'Not granted'}
            ok={locationGranted}
          />
          <StatusRow
            icon="wifi"
            label="Network"
            value={networkLabel}
            ok={networkState === 'online'}
            neutral={networkState === 'unknown'}
          />
          <StatusRow
            icon="notifications"
            label="Off-route alerts"
            value={notifGranted ? 'Enabled' : 'Disabled'}
            ok={notifGranted}
          />
        </View>

        {/* Permissions */}
        <SectionTitle text="PERMISSIONS" />
        <View style={styles.card}>
          <PermissionRow
            icon="location"
            title="Location"
            subtitle="Records your path and guides you back to the start."
            granted={locationGranted}
            onPress={enableLocation}
            loading={checking}
          />
          <View style={styles.divider} />
          <PermissionRow
            icon="notifications"
            title="Notifications"
            subtitle="Alerts you when you leave your return path."
            granted={notifGranted}
            onPress={enableNotifications}
          />
        </View>

        <TouchableOpacity
          style={styles.settingsBtn}
          activeOpacity={0.8}
          accessibilityRole="button"
          onPress={() => Linking.openSettings().catch(() => {})}
        >
          <Ionicons name="settings-outline" size={18} color={Colors.text} />
          <Text style={styles.settingsText}>Open system settings</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* Data & privacy */}
        <SectionTitle text="YOUR DATA" />
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark-outline" size={22} color={Colors.success} />
          <View style={styles.infoTextWrap}>
            <Text style={styles.infoTitle}>Private by design</Text>
            <Text style={styles.infoBody}>
              Trips, GPS points and routes are stored only on this device. Path
              Tracker has no account and sends your location to no server.
            </Text>
          </View>
        </View>
        <View style={styles.infoCard}>
          <Ionicons name="cloud-offline-outline" size={22} color={Colors.primaryLight} />
          <View style={styles.infoTextWrap}>
            <Text style={styles.infoTitle}>Works offline</Text>
            <Text style={styles.infoBody}>
              Tracking, distance, time and return-to-start guidance keep working
              with no internet. Only the map and route calculation need a
              connection.
            </Text>
          </View>
        </View>

        <Text style={styles.version}>
          Path Tracker v{Constants.expoConfig?.version ?? '1.0.0'} · background
          tracking requires a development or production build
        </Text>
      </ScrollView>
    </View>
  );
}

const SectionTitle: React.FC<{ text: string }> = ({ text }) => (
  <Text style={styles.sectionTitle}>{text}</Text>
);

const TotalBlock: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <View style={styles.totalBlock}>
    <Text style={styles.totalValue} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
    <Text style={styles.totalLabel}>{label}</Text>
  </View>
);

const StatusRow: React.FC<{
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  ok?: boolean;
  neutral?: boolean;
}> = ({ icon, label, value, ok, neutral }) => (
  <View style={styles.statusRow}>
    <Ionicons name={icon} size={18} color={Colors.primaryLight} />
    <Text style={styles.statusLabel}>{label}</Text>
    <View style={styles.statusValueRow}>
      {!neutral && (
        <View
          style={[styles.statusDot, { backgroundColor: ok ? Colors.success : Colors.danger }]}
        />
      )}
      <Text style={[styles.statusValue, { color: ok ? Colors.text : neutral ? Colors.textSecondary : Colors.danger }]}>
        {value}
      </Text>
    </View>
  </View>
);

const PermissionRow: React.FC<{
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  granted: boolean;
  loading?: boolean;
  onPress: () => void;
}> = ({ icon, title, subtitle, granted, loading, onPress }) => (
  <View style={styles.permRow}>
    <View style={styles.permIcon}>
      <Ionicons name={icon} size={18} color={Colors.primaryLight} />
    </View>
    <View style={styles.permInfo}>
      <Text style={styles.permTitle}>{title}</Text>
      <Text style={styles.permSubtitle}>{subtitle}</Text>
    </View>
    {granted ? (
      <View style={styles.grantedBadge}>
        <Ionicons name="checkmark" size={12} color={Colors.success} />
        <Text style={styles.grantedText}>ON</Text>
      </View>
    ) : (
      <TouchableOpacity
        style={styles.enableBtn}
        onPress={onPress}
        disabled={loading}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Enable ${title}`}
      >
        <Text style={styles.enableText}>{loading ? '…' : 'ENABLE'}</Text>
      </TouchableOpacity>
    )}
  </View>
);

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
  scroll: { padding: Spacing.lg, paddingBottom: 48 },
  totalsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  totalBlock: { flex: 1, alignItems: 'center' },
  totalValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.text },
  totalLabel: { fontSize: 9, color: Colors.textMuted, letterSpacing: 1, marginTop: 4 },
  sectionTitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  statusLabel: { flex: 1, color: Colors.textSecondary, marginLeft: Spacing.sm, fontSize: FontSize.sm },
  statusValueRow: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusValue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  permIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(32,138,239,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  permInfo: { flex: 1 },
  permTitle: { color: Colors.text, fontWeight: FontWeight.semibold, fontSize: FontSize.md },
  permSubtitle: { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2, lineHeight: 16 },
  grantedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34,197,94,0.12)',
    borderRadius: BorderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  grantedText: { color: Colors.success, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5, marginLeft: 4 },
  enableBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  enableText: { color: '#fff', fontSize: FontSize.xs, fontWeight: FontWeight.bold, letterSpacing: 0.8 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    marginBottom: Spacing.md,
  },
  settingsText: { flex: 1, color: Colors.text, fontWeight: FontWeight.semibold, marginLeft: Spacing.sm, fontSize: FontSize.sm },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  infoTextWrap: { flex: 1, marginLeft: Spacing.md },
  infoTitle: { color: Colors.text, fontWeight: FontWeight.semibold, fontSize: FontSize.md },
  infoBody: { color: Colors.textMuted, fontSize: FontSize.sm, marginTop: 3, lineHeight: 19 },
  version: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    textAlign: 'center',
    marginTop: Spacing.lg,
    lineHeight: 17,
    paddingHorizontal: Spacing.lg,
  },
});
