import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';
import { Platform, Vibration } from 'react-native';
import { AlertConfig, Branding } from '../constants/theme';

/**
 * Alert service: local notifications + vibration.
 * Enforces cooldown / per-session caps so we never spam the user.
 */

let permissionGranted = false;
let sentThisSession = 0;
let lastVibrationAt = 0;
const VIBRATION_COOLDOWN_MS = 30000;

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Device.isDevice) return false;
  try {
    const existing = await Notifications.getPermissionsAsync();
    let status = existing.status;
    if (status !== 'granted') {
      const res = await Notifications.requestPermissionsAsync();
      status = res.status;
    }
    permissionGranted = status === 'granted';

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('path-tracker-alerts', {
        name: 'Path Tracker Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [...AlertConfig.vibrationPattern],
        lightColor: '#FF3B30',
      });
    }
    return permissionGranted;
  } catch {
    return false;
  }
}

export function hasNotificationPermission(): boolean {
  return permissionGranted;
}

export function resetAlertBudget(): void {
  sentThisSession = 0;
}

/** Send an "off route" local notification (debounced by session cap). */
export async function notifyOffRoute(): Promise<void> {
  if (!permissionGranted) return;
  if (sentThisSession >= AlertConfig.maxNotificationsPerSession) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: Branding.appName,
        body: "⚠️ Off route — You're away from your return path. Tap to view return guidance.",
        sound: true,
        ...(Platform.OS === 'android'
          ? { channelId: 'path-tracker-alerts' }
          : {}),
      },
      trigger: null,
    });
    sentThisSession++;
  } catch {
    // fail silently
  }
}

/** Vibration pattern for a confirmed off-route event, with cooldown. */
export function vibrateOffRoute(): void {
  const now = Date.now();
  if (now - lastVibrationAt < VIBRATION_COOLDOWN_MS) return;
  lastVibrationAt = now;

  if (Platform.OS === 'android') {
    Vibration.vibrate([...AlertConfig.vibrationPattern]);
  } else if (Platform.OS === 'ios') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  }
}

export function triggerTap(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

export function triggerMediumTap(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export function triggerHeavyTap(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
}
