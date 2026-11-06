/**
 * Customer profile screen (top-level parity with frontend /profile).
 *
 * Displays account identity, edit profile link, shortcuts to saved places,
 * bookings, path tracker, problem reporting, about, and log out.
 */

import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthGate } from "@/components/auth-gate";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RemoteImage } from "@/components/ui/remote-image";
import { Touchable } from "@/components/ui/pressable";
import { useAuth } from "@/providers/auth-provider";
import { useAppShell } from "@/providers/app-shell-provider";
import { useFavorites } from "@/hooks/use-favorites";
import { useToast } from "@/providers/toast-provider";
import { KEYS, storage } from "@/lib/storage/local-store";
import { initials } from "@/lib/utils/format";
import { colors, radii, spacing, typography } from "@/theme";

export default function ProfileScreen() {
  return (
    <AuthGate returnTo="/profile">
      <ProfileContent />
    </AuthGate>
  );
}

function ProfileContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, signOut } = useAuth();
  const { config } = useAppShell();
  const favorites = useFavorites();
  const toast = useToast();

  const [lastDistrict, setLastDistrict] = useState<string | null>(null);

  useEffect(() => {
    void storage.readString(KEYS.lastDistrict).then((slug) => {
      if (slug) setLastDistrict(slug);
    });
  }, []);

  const handleLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out of your account?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          toast.show("Logged out successfully", "info");
          router.replace("/");
        },
      },
    ]);
  };

  const displayName = profile?.name ?? "Traveller";
  const displayEmail = profile?.email ?? "Signed in";
  const displayPhone = profile?.phonenumber || "Not provided";

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + spacing.xxxl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Identity Card */}
      <Card style={styles.identityCard}>
        <RemoteImage
          uri={profile?.profilepic ?? null}
          style={styles.avatar}
          fallbackLabel={initials(displayName)}
          radius={radii.pill}
        />
        <View style={styles.identityBody}>
          <Text style={styles.name}>{displayName}</Text>
          {profile?.username ? (
            <Text style={styles.handle}>@{profile.username}</Text>
          ) : null}
          <Text style={styles.metaText}>{displayEmail}</Text>
          <Text style={styles.metaSub}>Phone: {displayPhone}</Text>
        </View>
      </Card>

      {/* Edit Profile Action */}
      <Touchable
        onPress={() => router.push("/account/edit")}
        accessibilityRole="button"
        style={styles.menuItem}
      >
        <View style={styles.menuIconCircle}>
          <Ionicons name="create-outline" size={20} color={colors.primary} />
        </View>
        <View style={styles.menuText}>
          <Text style={styles.menuTitle}>Edit Profile</Text>
          <Text style={styles.menuSubtitle}>Update name, username, phone & photo</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Touchable>

      {/* Navigation Group */}
      <View style={styles.section}>
        <Text style={styles.sectionHeading}>My Content & Trips</Text>

        <Touchable
          onPress={() => router.push("/favorites")}
          accessibilityRole="button"
          style={styles.menuItem}
        >
          <View style={styles.menuIconCircle}>
            <Ionicons name="heart-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>Saved Places & Guides</Text>
            <Text style={styles.menuSubtitle}>
              {favorites.total} {favorites.total === 1 ? "item" : "items"} in your list
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Touchable>

        <Touchable
          onPress={() => router.push("/bookings")}
          accessibilityRole="button"
          style={styles.menuItem}
        >
          <View style={styles.menuIconCircle}>
            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>My Bookings</Text>
            <Text style={styles.menuSubtitle}>Guides, hotel stays & reservations</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Touchable>

        <Touchable
          onPress={() => router.push("/path-tracker")}
          accessibilityRole="button"
          style={styles.menuItem}
        >
          <View style={styles.menuIconCircle}>
            <Ionicons name="navigate-circle-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>Path Tracker</Text>
            <Text style={styles.menuSubtitle}>Real-time GPS trip recorder & return navigation</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Touchable>
      </View>

      {/* Support & About */}
      <View style={styles.section}>
        <Text style={styles.sectionHeading}>App & Support</Text>

        <Touchable
          onPress={() => router.push("/explore")}
          accessibilityRole="button"
          style={styles.menuItem}
        >
          <View style={styles.menuIconCircle}>
            <Ionicons name="compass-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>Choose Destination</Text>
            <Text style={styles.menuSubtitle}>
              {lastDistrict ? `Last visited: ${lastDistrict}` : "Browse states & districts"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Touchable>

        <Touchable
          onPress={() => router.push("/report")}
          accessibilityRole="button"
          style={styles.menuItem}
        >
          <View style={styles.menuIconCircle}>
            <Ionicons name="flag-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>Report a Problem</Text>
            <Text style={styles.menuSubtitle}>Feedback, listing accuracy or issues</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Touchable>

        <Touchable
          onPress={() => router.push("/about")}
          accessibilityRole="button"
          style={styles.menuItem}
        >
          <View style={styles.menuIconCircle}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>About {config.app_name}</Text>
            <Text style={styles.menuSubtitle}>Version, credits and policies</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Touchable>
      </View>

      {/* Log out button */}
      <Button
        label="Log out"
        variant="secondary"
        icon="log-out-outline"
        onPress={handleLogout}
        fullWidth
        size="lg"
        style={styles.logoutBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.xl,
    marginBottom: spacing.lg,
  },
  avatar: { width: 64, height: 64 },
  identityBody: { flex: 1 },
  name: { ...typography.heading, color: colors.text },
  handle: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  metaText: { ...typography.small, color: colors.textSecondary, marginTop: spacing.xs },
  metaSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  section: { marginTop: spacing.xl },
  sectionHeading: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  menuIconCircle: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: { flex: 1 },
  menuTitle: { ...typography.bodyStrong, color: colors.text },
  menuSubtitle: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  logoutBtn: { marginTop: spacing.xxl },
});
