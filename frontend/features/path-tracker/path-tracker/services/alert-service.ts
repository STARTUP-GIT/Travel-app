import { AlertConfig, Branding } from '../constants/theme';

/**
 * Platform boundary for the original Path-Tracker alert service.
 *
 * The original (Path-Tracker/src/services/alert-service.ts) uses
 * expo-notifications + expo-haptics / react-native Vibration. On the web those
 * have no runtime, so the browser equivalents are used:
 *   - notifications -> the Web Notifications API
 *   - vibration     -> navigator.vibrate() with the SAME AlertConfig pattern
 *
 * Everything that governs behaviour is preserved verbatim: the permission
 * gate, `hasNotificationPermission()`, the per-session notification cap
 * (`AlertConfig.maxNotificationsPerSession`), `resetAlertBudget()`, the
 * 30 s vibration cooldown and the exact notification title / body strings.
 * Alerting is advisory only — it never feeds distance, timer or route state.
 */

let permissionGranted = false;
let sentThisSession = 0;
let lastVibrationAt = 0;
const VIBRATION_COOLDOWN_MS = 30000;

const OFF_ROUTE_BODY =
  "⚠️ Off route — You're away from your return path. Tap to view return guidance.";

function hasNotificationApi(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!hasNotificationApi()) return false;
  try {
    let status = Notification.permission;
    if (status !== 'granted') {
      status = await Notification.requestPermission();
    }
    permissionGranted = status === 'granted';
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
    new Notification(Branding.appName, {
      body: OFF_ROUTE_BODY,
      icon: '/icon.svg',
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

  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate([...AlertConfig.vibrationPattern]);
  }
}

export function triggerTap(): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(10);
  }
}

export function triggerMediumTap(): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(20);
  }
}

export function triggerHeavyTap(): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(35);
  }
}
