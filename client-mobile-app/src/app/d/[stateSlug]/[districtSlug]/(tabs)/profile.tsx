/**
 * Profile tab.
 *
 * Signed out, this is a clear invitation to sign in or create an account rather
 * than a dead end. Signed in, it shows the backend profile plus the account-level
 * actions: bookings, saved items, Path Tracker history and sign out.
 *
 * `GET /users/profile/api/getprofile` may fail even with a valid session (a slow
 * or overloaded backend), so the tab still renders its actions in that case
 * instead of replacing the whole screen with an error.
 */

import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import { RemoteImage } from "@/components/ui/remote-image";
import { Touchable } from "@/components/ui/pressable";
import { useAuth } from "@/providers/auth-provider";
import { useAppShell } from "@/providers/app-shell-provider";
import { useFavorites } from "@/hooks/use-favorites";
import { useDistrict } from "@/providers/district-provider";
import { initials } from "@/lib/utils/format";
import { colors, radii, spacing, typography } from "@/theme";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { status, profile, signOut } = useAuth();
  const favorites = useFavorites();
  const { district } = useDistrict();
  const { config } = useAppShell();

  const base = district ? `/d/${district.state?.slug ?? "india"}/${district.slug}` : null;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxxl },
      ]}
    >
      {status === "checking" ? (
        <Text style={styles.checking}>Checking your session…</Text>
      ) : status === "signed-out" ? (
        <View style={styles.signedOut}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person-outline" size={30} color={colors.primary} />
          </View>

          <Text style={styles.name}>You're browsing as a guest</Text>
          <Text style={styles.subtitle}>
            Sign in to book guides, reserve stays and save places to this device.
          </Text>

          <Button label="Log in" onPress={() => router.push("/login")} fullWidth size="lg" />
          <Button
            label="Create an account"
            variant="secondary"
            onPress={() => router.push("/signup")}
            fullWidth
            size="lg"
            style={styles.secondary}
          />
        </View>
      ) : (
        <>
          <View style={styles.identity}>
            <RemoteImage
              uri={profile?.profilepic ?? null}
              style={styles.avatar}
              fallbackLabel={initials(profile?.name ?? profile?.username)}
              accessibilityLabel={profile?.name ?? "Your profile photo"}
              radius={radii.pill}
            />

            <Text style={styles.name}>{profile?.name ?? "Your profile"}</Text>
            {profile?.username ? (
              <Text style={styles.handle}>@{profile.username}</Text>
            ) : null}
            {profile?.email ? <Text style={styles.email}>{profile.email}</Text> : null}

            <Button
              label="Edit profile"
              variant="secondary"
              size="sm"
              icon="create-outline"
              onPress={() => router.push("/account/edit")}
              style={styles.edit}
            />
          </View>

          <View style={styles.stats}>
            <StatTile
              icon="heart"
              label="Saved"
              value={favorites.total}
              onPress={() => base && router.push(`${base}/saved`)}
            />
            <StatTile
              icon="calendar"
              label="Bookings"
              value={undefined}
              onPress={() => router.push("/bookings")}
            />
            <StatTile
              icon="navigate"
              label="Trips"
              value={undefined}
              onPress={() => router.push("/path-tracker")}
            />
          </View>

          <View style={styles.actions}>
            <ActionRow
              icon="calendar-outline"
              label="My bookings"
              onPress={() => router.push("/bookings")}
            />
            <ActionRow
              icon="heart-outline"
              label="Saved items"
              value={favorites.total > 0 ? `${favorites.total}` : undefined}
              onPress={() => base && router.push(`${base}/saved`)}
            />
            <ActionRow
              icon="navigate-circle-outline"
              label="Path Tracker"
              onPress={() => router.push("/path-tracker")}
            />
            <ActionRow
              icon="information-circle-outline"
              label="About"
              onPress={() => router.push("/about")}
            />
            <ActionRow
              icon="flag-outline"
              label="Report a listing"
              onPress={() => router.push("/report")}
            />
          </View>

          <Button
            label="Sign out"
            variant="danger"
            icon="log-out-outline"
            onPress={() => void signOut()}
            fullWidth
            style={styles.signOut}
          />
        </>
      )}

      <Text style={styles.version}>{config.app_name}</Text>
    </ScrollView>
  );
}

function StatTile({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: number;
  onPress: () => void;
}) {
  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.statTile}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.statValue}>{typeof value === "number" ? value : "—"}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Touchable>
  );
}

function ActionRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.actionRow}
    >
      <Ionicons name={icon} size={20} color={colors.textSecondary} />
      <Text style={styles.actionLabel}>{label}</Text>
      {value ? <Text style={styles.actionValue}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.xl },
  checking: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  signedOut: { alignItems: "center" },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  identity: { alignItems: "center", marginBottom: spacing.xxl },
  avatar: { width: 84, height: 84 },
  name: { ...typography.title, color: colors.text, marginTop: spacing.md, textAlign: "center" },
  handle: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  email: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
  },
  edit: { marginTop: spacing.lg },
  secondary: { marginTop: spacing.md },
  stats: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.xxl },
  statTile: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
  },
  statValue: { ...typography.heading, color: colors.text, marginTop: spacing.xs },
  statLabel: { ...typography.caption, color: colors.textMuted },
  actions: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    minHeight: 52,
  },
  actionLabel: { ...typography.body, color: colors.text, flex: 1 },
  actionValue: { ...typography.small, color: colors.textMuted },
  signOut: { marginTop: spacing.xxl },
  version: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xxxl,
  },
});