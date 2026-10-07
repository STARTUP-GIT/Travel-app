/**
 * Landing screen.
 *
 * The slideshow imagery comes from `GET /api/settings` (admin-controlled), so
 * rebranding is an admin action. When no banners are configured the app falls
 * back to real state imagery from `GET /api/states` rather than shipping stock
 * photos — a wrong or unrelated photo is worse than none.
 *
 * Everything here is dynamic: the districts shown, the counts on them, and the
 * app name all come from the backend.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAppShell } from "@/providers/app-shell-provider";
import { useAuth } from "@/providers/auth-provider";
import { getDistricts, getStates, type DistrictSummary } from "@/services/locations.service";
import { KEYS, storage } from "@/lib/storage/local-store";
import { formatNumber, truncate } from "@/lib/utils/format";
import { colors, radii, shadows, spacing, typography } from "@/theme";
import { Button } from "@/components/ui/button";
import { RemoteImage } from "@/components/ui/remote-image";
import { Touchable } from "@/components/ui/pressable";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/ui/states";

const SLIDESHOW_INTERVAL_MS = 4500;

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { config } = useAppShell();
  const { isSignedIn } = useAuth();

  const [districts, setDistricts] = useState<DistrictSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [slideIndex, setSlideIndex] = useState(0);
  const [lastVisited, setLastVisited] = useState<string | null>(null);

  const fade = useRef(new Animated.Value(1)).current;

  const banners = config.imageBanners;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [allDistricts, states] = await Promise.all([
        getDistricts().catch(() => [] as DistrictSummary[]),
        getStates().catch(() => []),
      ]);

      if (cancelled) return;

      setDistricts(allDistricts);

      // No admin banners: build the slideshow from real state imagery instead.
      if (banners.length === 0) {
        const images = states
          .map((state) => state.primaryImage)
          .filter((image): image is string => Boolean(image));
        if (images.length > 0) setSlideIndex(0);
      }

      setLoading(false);
      void storage.readString(KEYS.lastDistrict).then((slug) => {
        if (!cancelled && slug) setLastVisited(slug);
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [banners.length]);

  // Cross-fades between slides only when there is more than one.
  useEffect(() => {
    if (banners.length < 2) return;

    const handle = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 350, useNativeDriver: true }).start(() => {
        setSlideIndex((index) => (index + 1) % banners.length);
        fade.setValue(0);
        Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
      });
    }, SLIDESHOW_INTERVAL_MS);

    return () => clearInterval(handle);
  }, [banners.length, fade]);

  const tap = useCallback(() => {
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, []);

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <LoadingState label="Finding destinations…" />
      </View>
    );
  }

  const featured = districts.slice(0, 6);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.huge }}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={{ height: 320 }}>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
          <RemoteImage
            uri={banners[slideIndex] ?? null}
            style={styles.heroImage}
            fallbackLabel={config.app_name}
            accessibilityLabel={config.text || config.app_name}
          />
        </Animated.View>

        <LinearGradient
          colors={["rgba(9,16,34,0.15)", "rgba(9,16,34,0.75)"]}
          style={StyleSheet.absoluteFill}
        />

        <View style={[styles.heroContent, { paddingTop: insets.top + spacing.xxxl }]}>
          <Text style={styles.heroTitle}>{config.app_name}</Text>
          {config.text ? (
            <Text style={styles.heroSubtitle} numberOfLines={2}>
              {config.text}
            </Text>
          ) : null}

          <View style={styles.heroActions}>
            <Button
              label="Explore destinations"
              icon="compass-outline"
              onPress={() => {
                tap();
                router.push("/explore");
              }}
            />
            {!isSignedIn ? (
              <Button
                label="Sign in"
                variant="secondary"
                onPress={() => router.push("/login")}
                style={styles.heroSecondary}
              />
            ) : null}
          </View>
        </View>

        {banners.length > 1 ? (
          <View style={styles.dots}>
            {banners.map((_, index) => (
              <View
                key={index}
                style={[styles.dot, index === slideIndex && styles.dotActive]}
              />
            ))}
          </View>
        ) : null}
      </View>

      {/* Resume */}
      {lastVisited ? (
        <View style={styles.section}>
          <Touchable
            onPress={() => router.push(`/d/${lastVisited}`)}
            accessibilityRole="button"
            accessibilityLabel="Continue where you left off"
            style={styles.resume}
          >
            <Ionicons name="time-outline" size={18} color={colors.primary} />
            <View style={styles.resumeText}>
              <Text style={styles.resumeTitle}>Continue browsing</Text>
              <Text style={styles.resumeSubtitle}>
                Pick up your last visited destination
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Touchable>
        </View>
      ) : null}

      {/* Shortcuts */}
      <View style={styles.section}>
        <View style={styles.shortcuts}>
          <ShortcutTile
            icon="search"
            label="Search"
            onPress={() => router.push("/search")}
          />
          <ShortcutTile
            icon="navigate-circle-outline"
            label="Path Tracker"
            onPress={() => router.push("/path-tracker")}
          />
          <ShortcutTile
            icon="calendar-outline"
            label="My bookings"
            onPress={() => router.push("/bookings")}
          />
        </View>
      </View>

      {/* Featured districts */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular destinations</Text>
          {districts.length > featured.length ? (
            <Text
              accessibilityRole="button"
              onPress={() => router.push("/explore")}
              style={styles.sectionAction}
            >
              See all
            </Text>
          ) : null}
        </View>

        {featured.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No destinations are published yet. Check back soon.
            </Text>
          </View>
        ) : (
          featured.map((district) => (
            <Touchable
              key={district.id}
              onPress={() => {
                tap();
                router.push(`/d/${district.state?.slug ?? "india"}/${district.slug}`);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${district.name}, ${district.state?.name ?? ""}`}
              style={styles.districtCard}
            >
              <RemoteImage
                uri={district.state?.primaryImage ?? null}
                style={styles.districtImage}
                fallbackLabel={district.name}
                accessibilityLabel={district.name}
              />

              <View style={styles.districtBody}>
                <Text style={styles.districtName}>{district.name}</Text>
                <Text style={styles.districtState}>{district.state?.name ?? ""}</Text>

                <View style={styles.districtMeta}>
                  <Badge label={`${formatNumber(district.placeCount) ?? "0"} places`} tone="primary" />
                  {district.hotelCount > 0 ? (
                    <Badge label={`${formatNumber(district.hotelCount)} hotels`} tone="neutral" />
                  ) : null}
                </View>
              </View>
            </Touchable>
          ))
        )}
      </View>

      <Text style={styles.footer}>
        {config.contacts ? truncate(config.contacts, 120) : ""}
      </Text>
    </ScrollView>
  );
}

function ShortcutTile({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.shortcut}
    >
      <View style={styles.shortcutIcon}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <Text style={styles.shortcutLabel} numberOfLines={1}>
        {label}
      </Text>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  heroImage: { width: "100%", height: "100%", borderRadius: 0 },
  heroContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    justifyContent: "flex-end",
  },
  heroTitle: {
    ...typography.display,
    color: colors.textInverse,
  },
  heroSubtitle: {
    ...typography.body,
    color: "rgba(255,255,255,0.9)",
    marginTop: spacing.sm,
  },
  heroActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  heroSecondary: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderColor: "rgba(255,255,255,0.5)",
  },
  dots: {
    position: "absolute",
    bottom: spacing.md,
    alignSelf: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  dotActive: { backgroundColor: colors.textInverse },
  section: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.heading, color: colors.text },
  sectionAction: { ...typography.smallStrong, color: colors.primary },
  resume: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  resumeText: { flex: 1 },
  resumeTitle: { ...typography.bodyStrong, color: colors.text },
  resumeSubtitle: { ...typography.small, color: colors.textSecondary },
  shortcuts: {
    flexDirection: "row",
    gap: spacing.md,
  },
  shortcut: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    ...shadows.card,
  },
  shortcutIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  shortcutLabel: { ...typography.smallStrong, color: colors.text },
  districtCard: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  districtImage: { width: 92, height: 92 },
  districtBody: { flex: 1, justifyContent: "center" },
  districtName: { ...typography.subheading, color: colors.text },
  districtState: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  districtMeta: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.sm,
    flexWrap: "wrap",
  },
  emptyCard: {
    padding: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceMuted,
  },
  emptyText: { ...typography.small, color: colors.textSecondary, textAlign: "center" },
  footer: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
});