import * as Haptics from 'expo-haptics';

let lastOffRouteNotificationAt = 0;
const OFF_ROUTE_ALERT_BUDGET_MS = 30000;

export function triggerTap(): void {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  } catch {
    // safe fallback
  }
}

export function triggerMediumTap(): void {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  } catch {
    // safe fallback
  }
}

export function triggerHeavyTap(): void {
  try {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  } catch {
    // safe fallback
  }
}

export function vibrateOffRoute(): void {
  const now = Date.now();
  if (now - lastOffRouteNotificationAt < OFF_ROUTE_ALERT_BUDGET_MS) return;
  lastOffRouteNotificationAt = now;
  try {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  } catch {
    // safe fallback
  }
}

export function notifyOffRoute(): void {
  // Handled via vibrateOffRoute for native alerts
}

export function hasNotificationPermission(): boolean {
  return true;
}

export function resetAlertBudget(): void {
  lastOffRouteNotificationAt = 0;
}
