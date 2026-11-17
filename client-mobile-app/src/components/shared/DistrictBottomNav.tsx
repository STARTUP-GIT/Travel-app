import React from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing } from "@/theme";

type DistrictTabKey = "home" | "places" | "guides" | "saved" | "profile";

interface DistrictBottomNavProps {
  activeTab?: DistrictTabKey;
  stateSlug?: string;
  districtSlug?: string;
}

interface NavItem {
  key: DistrictTabKey;
  label: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
  getTargetHref: (stateSlug?: string, districtSlug?: string) => string;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: "home",
    label: "Home",
    iconActive: "home",
    iconInactive: "home-outline",
    getTargetHref: (s, d) => (s && d ? `/d/${s}/${d}` : "/explore"),
  },
  {
    key: "places",
    label: "Places",
    iconActive: "location",
    iconInactive: "location-outline",
    getTargetHref: (s, d) => (s && d ? `/d/${s}/${d}/places` : "/explore"),
  },
  {
    key: "guides",
    label: "Guides",
    iconActive: "compass",
    iconInactive: "compass-outline",
    getTargetHref: (s, d) => (s && d ? `/d/${s}/${d}/guides` : "/explore"),
  },
  {
    key: "saved",
    label: "Saved",
    iconActive: "bookmark",
    iconInactive: "bookmark-outline",
    getTargetHref: (s, d) => (s && d ? `/d/${s}/${d}/saved` : "/favorites"),
  },
  {
    key: "profile",
    label: "Profile",
    iconActive: "person",
    iconInactive: "person-outline",
    getTargetHref: (s, d) => (s && d ? `/d/${s}/${d}/profile` : "/profile"),
  },
];

/**
 * Universal District bottom navigation matching `frontend/components/shared/bottom-navigation.tsx` 1:1.
 * Shows: Home, Places, Guides, Saved, Profile.
 * Active item gets the light blue oval pill behind the icon (`rgba(37, 99, 235, 0.12)`).
 */
export function DistrictBottomNav({
  activeTab = "home",
  stateSlug,
  districtSlug,
}: DistrictBottomNavProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, 6) },
      ]}
    >
      <View style={styles.grid}>
        {NAV_ITEMS.map((item) => {
          const isActive = item.key === activeTab;
          const href = item.getTargetHref(stateSlug, districtSlug);

          return (
            <Pressable
              key={item.key}
              onPress={() => router.push(href as any)}
              style={styles.tabItem}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={item.label}
            >
              <View
                style={[
                  styles.iconPill,
                  isActive && styles.iconPillActive,
                ]}
              >
                <Ionicons
                  name={isActive ? item.iconActive : item.iconInactive}
                  size={20}
                  color={isActive ? colors.primary : colors.textMuted}
                />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 4,
    ...Platform.select({
      ios: {
        shadowColor: "#0F1E5A",
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: -4 },
      },
      android: {
        elevation: 8,
      },
    }),
  },
  grid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    height: 48,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    height: "100%",
  },
  iconPill: {
    width: 48,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  iconPillActive: {
    backgroundColor: "rgba(37, 99, 235, 0.12)",
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: -1,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: "700",
  },
  tabLabelInactive: {
    color: colors.textMuted,
    fontWeight: "500",
  },
});
