/**
 * District bottom navigation.
 *
 * Mirrors the customer web app's five destinations — Home, Places, Guides, Saved,
 * Profile — inside the district context so every tab shows content for the
 * district the user chose rather than for a hardcoded default.
 *
 * A custom tab bar is used instead of the platform default so the saved count is
 * visible (it is the one piece of state worth surfacing) and so every item keeps
 * a comfortable touch target. The bar sits inside the bottom safe-area inset,
 * which matters most on gesture-navigation devices.
 */

import { Tabs, useRouter } from "expo-router";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFavorites } from "@/hooks/use-favorites";
import { Touchable } from "@/components/ui/pressable";
import { colors, spacing, typography } from "@/theme";
import { TopBar } from "@/components/shared/TopBar";

type TabItem = {
  name: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline: keyof typeof Ionicons.glyphMap;
};

const TABS: TabItem[] = [
  { name: "index", title: "Home", icon: "home", iconOutline: "home-outline" },
  { name: "places", title: "Places", icon: "location", iconOutline: "location-outline" },
  { name: "guides", title: "Guides", icon: "compass", iconOutline: "compass-outline" },
  { name: "saved", title: "Saved", icon: "bookmark", iconOutline: "bookmark-outline" },
  { name: "profile", title: "Profile", icon: "person", iconOutline: "person-outline" },
];

export default function DistrictTabs() {
  const insets = useSafeAreaInsets();
  const favorites = useFavorites();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TopBar />
      <Tabs
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
      tabBar={(props: any) => {
        const { state, emitter, navigateToTab, navigation } = props;
        return (
          <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
            {state.routes.map((route: any, index: number) => {
              const item = TABS.find((tab) => tab.name === route.name);
              if (!item) return null;

              const focused = state.index === index;

              return (
                <Touchable
                  key={route.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: focused }}
                  accessibilityLabel={
                    route.name === "saved" && favorites.total > 0
                      ? `${item.title}, ${favorites.total} saved`
                      : item.title
                  }
                  onPress={() => {
                    let defaultPrevented = false;
                    if (emitter?.emit) {
                      const event = emitter.emit({
                        type: "tabPress",
                        target: route.key,
                        canPreventDefault: true,
                      });
                      defaultPrevented = !!event?.defaultPrevented;
                    } else if (navigation?.emit) {
                      const event = navigation.emit({
                        type: "tabPress",
                        target: route.key,
                        canPreventDefault: true,
                      });
                      defaultPrevented = !!event?.defaultPrevented;
                    }

                    if (!focused && !defaultPrevented) {
                      if (typeof navigateToTab === "function") {
                        navigateToTab(route.key);
                      } else if (navigation?.navigate) {
                        navigation.navigate(route.name);
                      } else {
                        router.navigate(route.name);
                      }
                    }
                  }}
                  style={styles.item}
                >
                  <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
                    <Ionicons
                      name={focused ? item.icon : item.iconOutline}
                      size={20}
                      color={focused ? colors.primary : colors.textMuted}
                    />
                    {route.name === "saved" && favorites.total > 0 ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {favorites.total > 99 ? "99+" : favorites.total}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={[styles.label, focused && styles.labelActive]}>{item.title}</Text>
                </Touchable>
              );
            })}
          </View>
        );
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
      ))}
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    ...Platform.select({
      android: { elevation: 12 },
      default: {},
    }),
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    // Guarantees the 44pt minimum touch target on both platforms.
    minHeight: 44,
    justifyContent: "center",
  },
  iconWrap: {
    width: 48,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: "rgba(37, 99, 235, 0.12)",
  },
  label: { ...typography.caption, fontSize: 10, fontWeight: "500", color: colors.textMuted },
  labelActive: { color: colors.primary, fontWeight: "600" },
  badge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { ...typography.caption, color: colors.textInverse, fontSize: 9 },
});