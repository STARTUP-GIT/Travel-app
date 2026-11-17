/**
 * Safe notification loader.
 * In development builds and production binaries, expo-notifications works natively.
 * In Expo Go, expo-notifications / ExpoApplication native module is not linked;
 * this loader catches the missing native module and returns null to prevent
 * fatal top-level crashes.
 */

type ExpoNotifications = typeof import('expo-notifications');

let notificationsModule: ExpoNotifications | null = null;
let isLoaded = false;

export function getNotifications(): ExpoNotifications | null {
  if (isLoaded) return notificationsModule;
  isLoaded = true;
  try {
    const mod = require('expo-notifications');
    if (mod && (typeof mod.scheduleNotificationAsync === 'function' || typeof mod.setNotificationHandler === 'function')) {
      notificationsModule = mod;
    }
  } catch {
    notificationsModule = null;
  }
  return notificationsModule;
}
