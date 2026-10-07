/**
 * Destination picker: State -> District.
 *
 * This is the app's entry point for browsing and is entirely dynamic: states and
 * districts come from the backend's public location endpoints, already filtered
 * to what an admin has enabled. There is no default state and no pre-selected
 * district — the user always starts at the top of the real list.
 *
 * Search filters the loaded list client-side; these lists are small (tens of
 * entries) and already in memory, so a round trip per keystroke would be slower
 * and no more accurate.
 */

import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TextField } from "@/components/ui/text-field";
import { Badge, Chip } from "@/components/ui/badge";
import { Touchable } from "@/components/ui/pressable";
import { RemoteImage } from "@/components/ui/remote-image";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import {
  getDistricts,
  getStates,
  type DistrictSummary,
  type StateSummary,
} from "@/services/locations.service";
import { colors, radii, spacing, typography } from "@/theme";

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedStateId, setSelectedStateId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const states = useQuery<StateSummary[]>(() => getStates(), []);
  const districts = useQuery<DistrictSummary[]>(() => getDistricts(), []);

  const activeState = useMemo(() => {
    if (!selectedStateId) return null;
    return states.data?.find((state) => state.id === selectedStateId) ?? null;
  }, [selectedStateId, states.data]);

  const visibleDistricts = useMemo(() => {
    const all = districts.data ?? [];
    const scoped = selectedStateId ? all.filter((d) => d.stateId === selectedStateId) : all;
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return scoped;
    return scoped.filter((district) => district.name.toLowerCase().includes(needle));
  }, [districts.data, selectedStateId, query]);

  const loading = states.loading || districts.loading;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{ padding: spacing.xl, paddingBottom: insets.bottom + spacing.huge }}
      keyboardShouldPersistTaps="handled"
    >
      {loading ? (
        <LoadingState label="Loading destinations…" />
      ) : states.error && !states.data ? (
        <ErrorState message={states.error} onRetry={states.reload} />
      ) : (
        <>
          <Text style={styles.stepLabel}>Step 1 · Choose a state</Text>
          <View style={styles.chips}>
            {(states.data ?? []).map((state) => (
              <Chip
                key={state.id}
                label={state.name}
                selected={state.id === selectedStateId}
                onPress={() =>
                  setSelectedStateId((current) => (current === state.id ? null : state.id))
                }
              />
            ))}
            {(states.data ?? []).length === 0 ? (
              <Text style={styles.noStates}>
                No states are published for tourism yet.
              </Text>
            ) : null}
          </View>

          <Text style={styles.stepLabel}>
            Step 2 · {activeState ? `Districts in ${activeState.name}` : "Choose a district"}
          </Text>

          <TextField
            label="Search districts"
            value={query}
            onChangeText={setQuery}
            placeholder="Type at least two letters"
            autoCapitalize="none"
          />

          {districts.error && !districts.data ? (
            <ErrorState message={districts.error} onRetry={districts.reload} />
          ) : visibleDistricts.length === 0 ? (
            <EmptyState
              title="No districts found"
              description={
                query.trim().length >= 2
                  ? "Try a different name, or clear the search."
                  : "No districts are published yet."
              }
              icon="map-outline"
              action={
                query.trim().length >= 2
                  ? { label: "Clear search", onPress: () => setQuery("") }
                  : undefined
              }
            />
          ) : (
            visibleDistricts.map((district) => (
              <DistrictRow
                key={district.id}
                district={district}
                onPress={() =>
                  router.push(`/d/${district.state?.slug ?? "india"}/${district.slug}`)
                }
              />
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

function DistrictRow({
  district,
  onPress,
}: {
  district: DistrictSummary;
  onPress: () => void;
}) {
  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${district.name}${district.state?.name ? `, ${district.state.name}` : ""}`}
      style={styles.row}
    >
      <RemoteImage
        uri={district.state?.primaryImage ?? null}
        style={styles.image}
        fallbackLabel={district.name}
        accessibilityLabel={district.name}
      />

      <View style={styles.rowBody}>
        <Text style={styles.rowName}>{district.name}</Text>
        {district.state?.name ? (
          <Text style={styles.rowState}>{district.state.name}</Text>
        ) : null}

        <View style={styles.rowBadges}>
          <Badge label={`${district.placeCount} places`} tone="primary" />
          {district.hotelCount > 0 ? (
            <Badge label={`${district.hotelCount} hotels`} tone="neutral" />
          ) : null}
          {district.restaurantCount > 0 ? (
            <Badge label={`${district.restaurantCount} restaurants`} tone="neutral" />
          ) : null}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Touchable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  stepLabel: {
    ...typography.subheading,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.lg },
  noStates: { ...typography.small, color: colors.textMuted },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  image: { width: 64, height: 64 },
  rowBody: { flex: 1 },
  rowName: { ...typography.subheading, color: colors.text },
  rowState: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  rowBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
});