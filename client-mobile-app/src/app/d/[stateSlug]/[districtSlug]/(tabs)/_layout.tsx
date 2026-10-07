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

import { Tabs } from "expo-router";
import { Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFavorites } from "@/hooks/use-favorites";
import { Touchable } from "@/components/ui/pressable";
import { colors, spacing, typography } from "@/theme";

type TabItem = {
  name: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconOutline: keyof typeof Ionicons.glyphMap;
};

const TABS: TabItem[] = [
  { name: "index", title: "Home", icon: "home", iconOutline: "home-outline" },
  { name: "places", title: "Places", icon: "compass", iconOutline: "compass-outline" },
  { name: "guides", title: "Guides", icon: "people", iconOutline: "people-outline" },
  { name: "saved", title: "Saved", icon: "heart", iconOutline: "heart-outline" },
  { name: "profile", title: "Profile", icon: "person", iconOutline: "person-outline" },
];

export default function DistrictTabs() {
  const insets = useSafeAreaInsets();
  const favorites = useFavorites();

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
      tabBar={({ state, navigation }) => (
        <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          {state.routes.map((route, index) => {
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
                  const event = navigation.emit({
                    type: "tabPress",
                    target: route.key,
                    canPreventDefault: true,
                  });

                  // Re-tapping the active tab should not rebuild the screen.
                  if (!focused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
                style={styles.item}
              >
                <View>
                  <Ionicons
                    name={focused ? item.icon : item.iconOutline}
                    size={22}
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
      )}
    >
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
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
  label: { ...typography.caption, color: colors.textMuted },
  labelActive: { color: colors.primary },
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