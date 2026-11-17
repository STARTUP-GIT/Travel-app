import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { getNotifications } from '@/services/notification-helper';
import { useTripStore } from '@/store/trip-store';
import { requestNotificationPermission } from '@/services/alert-service';
import { Colors } from '@/constants/theme';

// Register the background-location task before it can be started. Safe to
// import on every platform; the task is only defined on native.
import '@/services/background-trip-task';

// Foreground notification behaviour (safe for Expo Go and bare native)
const Notifications = getNotifications();
if (Notifications?.setNotificationHandler) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch {}
}

export default function RootLayout() {
  useEffect(() => {
    requestNotificationPermission().catch(() => {});
    const store = useTripStore.getState();
    store
      .bootstrap()
      .then(() => {
        useTripStore.getState().loadHistory().catch(() => {});
      })
      .catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="trip/[id]"
          options={{
            presentation: 'card',
            animation: 'slide_from_right',
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
