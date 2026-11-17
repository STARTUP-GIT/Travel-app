import React from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "@/providers/auth-provider";
import { Logo } from "@/components/ui/logo";
import { colors, radius, spacing } from "@/theme";

/**
 * Universal TopBar matching `frontend/components/shared/top-bar.tsx` 1:1.
 * Displays:
 *  - Left: Atlas Wanders Logo (variant="dark")
 *  - Right: Notification Bell icon (links to /about)
 *  - Right: User avatar or "Login" blue pill button
 */
export function TopBar() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSignedIn, profile } = useAuth();

  const firstName = profile?.name ? profile.name.split(" ")[0] : "Customer";

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 8) }]}>
      <View style={styles.inner}>
        {/* Logo */}
        <Pressable
          onPress={() => router.push("/")}
          style={({ pressed }) => [styles.logoBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Atlas Wanders Home"
        >
          <Logo variant="dark" size="sm" />
        </Pressable>

        {/* Action icons: Bell & Login/Profile */}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() => router.push("/about")}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Notifications & About"
          >
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
          </Pressable>

          {isSignedIn ? (
            <Pressable
              onPress={() => router.push("/profile")}
              style={({ pressed }) => [styles.avatarBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="My Profile"
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {firstName.charAt(0).toUpperCase()}
                </Text>
              </View>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.push("/login")}
              style={({ pressed }) => [styles.loginBtn, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Login"
            >
              <Text style={styles.loginBtnText}>Login</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    zIndex: 40,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.04,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
      },
      android: {
        elevation: 2,
      },
    }),
  },
  inner: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  logoBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  avatarBtn: {
    borderRadius: 18,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(37, 99, 235, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  loginBtn: {
    height: 34,
    paddingHorizontal: 16,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  loginBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.75,
  },
});
