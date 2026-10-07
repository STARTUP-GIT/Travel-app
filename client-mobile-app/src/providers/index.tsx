/**
 * Provider composition.
 *
 * Order matters and is fixed here so no route has to remember it:
 *
 *   AppShell      outermost — branding and the backend-configured check
 *   Auth          depends on the API client, which the shell does not
 *   Toast         depends on nothing, but must sit above every screen so a
 *                 message survives a navigation
 *
 * District is deliberately *not* here: it is scoped to the district route group
 * so a full-screen non-district screen (Sign in, About) never mounts a provider
 * that would issue location requests for a district nobody asked for.
 */

import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppShellProvider } from "./app-shell-provider";
import { AuthProvider } from "./auth-provider";
import { ToastProvider } from "./toast-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppShellProvider>
          <AuthProvider>
            <ToastProvider>
              <View style={{ flex: 1 }}>{children}</View>
            </ToastProvider>
          </AuthProvider>
        </AppShellProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}