/**
 * Choose Destination (State -> District).
 * Exact mobile replica of frontend/app/explore/page.tsx and frontend/app/explore/explore-view.tsx
 */

import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
import { TopBar } from "@/components/shared/TopBar";
import { ScreenHeader } from "@/components/shared/ScreenHeader";

export default function ExploreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [selectedState, setSelectedState] = useState<StateSummary | null>(null);

  const states = useQuery<StateSummary[]>(() => getStates(), []);
  const districts = useQuery<DistrictSummary[]>(() => getDistricts(), []);

  const districtsByState = useMemo(() => {
    const map = new Map<string, DistrictSummary[]>();
    for (const d of districts.data ?? []) {
      const list = map.get(d.stateId) ?? [];
      list.push(d);
      map.set(d.stateId, list);
    }
    return map;
  }, [districts.data]);

  const stateDistricts = useMemo(() => {
    if (!selectedState) return [];
    return districtsByState.get(selectedState.id) ?? [];
  }, [districtsByState, selectedState]);

  const loading = states.loading || districts.loading;

  function handleChooseState(state: StateSummary) {
    setSelectedState(state);
  }

  function handleChangeState() {
    setSelectedState(null);
  }

  function handleChooseDistrict(district: DistrictSummary) {
    if (!selectedState) return;
    router.push(`/d/${selectedState.slug}/${district.slug}` as any);
  }

  return (
    <View style={styles.screen}>
      {/* 1. Universal TopBar matching Web */}
      <TopBar />

      {/* 2. Web ScreenHeader */}
      <ScreenHeader
        title="Choose Destination"
        subtitle={
          selectedState
            ? `Districts in ${selectedState.name}`
            : "Pick a state, then a district"
        }
        onBack={() => (selectedState ? handleChangeState() : router.back())}
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >

      {/* Step Indicator */}
      <View style={styles.stepIndicator}>
        <View style={styles.stepItem}>
          <View
            style={[
              styles.stepBadge,
              selectedState
                ? styles.stepBadgeDone
                : styles.stepBadgeCurrent,
            ]}
          >
            {selectedState ? (
              <Ionicons name="checkmark" size={14} color="#059669" />
            ) : (
              <Text style={styles.stepBadgeTextCurrent}>1</Text>
            )}
          </View>
          <Text
            style={[
              styles.stepText,
              !selectedState && styles.stepTextCurrent,
            ]}
          >
            STATE
          </Text>
        </View>

        <View style={styles.stepLine} />

        <View style={styles.stepItem}>
          <View
            style={[
              styles.stepBadge,
              selectedState ? styles.stepBadgeCurrent : styles.stepBadgeMuted,
            ]}
          >
            <Text
              style={
                selectedState
                  ? styles.stepBadgeTextCurrent
                  : styles.stepBadgeTextMuted
              }
            >
              2
            </Text>
          </View>
          <Text
            style={[
              styles.stepText,
              selectedState && styles.stepTextCurrent,
            ]}
          >
            DISTRICT
          </Text>
        </View>
      </View>

      {loading ? (
        <LoadingState label="Loading destinations…" />
      ) : states.error && !states.data ? (
        <ErrorState
          message={states.error}
          onRetry={() => {
            void states.reload();
            void districts.reload();
          }}
        />
      ) : selectedState ? (
        /* STEP 2: District Step */
        <View style={styles.stepContainer}>
          {/* Selected state banner */}
          <View style={styles.selectedStateBanner}>
            <View style={styles.selectedStateIcon}>
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.selectedStateInfo}>
              <Text style={styles.selectedStateEyebrow}>Selected state</Text>
              <Text style={styles.selectedStateName}>{selectedState.name}</Text>
            </View>
            <Pressable
              onPress={handleChangeState}
              style={({ pressed }) => [
                styles.changeStateBtn,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Change state"
            >
              <Ionicons name="arrow-back" size={14} color={colors.primary} />
              <Text style={styles.changeStateText}>Change</Text>
            </Pressable>
          </View>

          {/* District list header */}
          <View style={styles.stepSectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>
                Choose a district in {selectedState.name}
              </Text>
              <Text style={styles.sectionDesc}>
                Only districts available in {selectedState.name} are listed.
              </Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>
                {stateDistricts.length} available
              </Text>
            </View>
          </View>

          {stateDistricts.length === 0 ? (
            <EmptyState
              title="No districts available"
              description={`There are no districts available in ${selectedState.name} right now.`}
              icon="map-outline"
              action={{
                label: "Choose another state",
                onPress: handleChangeState,
              }}
            />
          ) : (
            <View style={styles.districtsGrid}>
              {stateDistricts.map((district) => (
                <Pressable
                  key={district.id}
                  onPress={() => handleChooseDistrict(district)}
                  style={({ pressed }) => [
                    styles.districtCard,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Explore ${district.name}`}
                >
                  <View style={styles.districtCardTop}>
                    <View style={styles.districtIconBox}>
                      <Ionicons name="location" size={20} color={colors.primary} />
                    </View>
                    <View style={styles.exploreLink}>
                      <Text style={styles.exploreLinkText}>Explore</Text>
                      <Ionicons
                        name="arrow-forward"
                        size={14}
                        color={colors.primary}
                      />
                    </View>
                  </View>

                  <View style={styles.districtCardBody}>
                    <Text style={styles.districtCardTitle} numberOfLines={1}>
                      {district.name}
                    </Text>
                    <Text style={styles.districtCardSubtitle}>
                      {selectedState.name} · India
                    </Text>
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.metaBadge}>
                      <Ionicons
                        name="location-outline"
                        size={12}
                        color={colors.textMuted}
                      />
                      <Text style={styles.metaBadgeText}>
                        {district.placeCount} places
                      </Text>
                    </View>
                    <View style={styles.metaBadge}>
                      <Ionicons
                        name="bed-outline"
                        size={12}
                        color={colors.textMuted}
                      />
                      <Text style={styles.metaBadgeText}>
                        {district.hotelCount} hotels
                      </Text>
                    </View>
                    <View style={styles.metaBadge}>
                      <Ionicons
                        name="restaurant-outline"
                        size={12}
                        color={colors.textMuted}
                      />
                      <Text style={styles.metaBadgeText}>
                        {district.restaurantCount} restaurants
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          <Pressable
            onPress={() => {
              void states.reload();
              void districts.reload();
            }}
            style={({ pressed }) => [
              styles.refreshBtn,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="refresh" size={16} color={colors.textSecondary} />
            <Text style={styles.refreshBtnText}>Refresh districts</Text>
          </Pressable>
        </View>
      ) : (
        /* STEP 1: State Step */
        <View style={styles.stepContainer}>
          <View style={styles.stepSectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Choose your state</Text>
              <Text style={styles.sectionDesc}>
                Only states that are currently available can be selected.
              </Text>
            </View>
          </View>

          {(states.data ?? []).length === 0 ? (
            <EmptyState
              title="No destinations available yet"
              description="States appear here as soon as an admin enables them for the app."
              icon="globe-outline"
            />
          ) : (
            <View style={styles.statesGrid}>
              {(states.data ?? []).map((state) => (
                <Pressable
                  key={state.id}
                  onPress={() => handleChooseState(state)}
                  style={({ pressed }) => [
                    styles.stateCard,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${state.name}`}
                >
                  <View style={styles.stateImageContainer}>
                    <RemoteImage
                      uri={state.primaryImage}
                      style={styles.stateImage}
                      fallbackLabel={state.name}
                      accessibilityLabel={state.name}
                    />
                    <View style={styles.countryBadge}>
                      <Ionicons name="globe-outline" size={12} color={colors.primary} />
                      <Text style={styles.countryBadgeText}>
                        {state.country?.name ?? "India"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stateCardBody}>
                    <View style={styles.stateTitleRow}>
                      <Text style={styles.stateName} numberOfLines={1}>
                        {state.name}
                      </Text>
                      <Ionicons
                        name="arrow-forward"
                        size={16}
                        color={colors.primary}
                      />
                    </View>

                    <View style={styles.metaRow}>
                      <View style={styles.metaBadge}>
                        <Ionicons
                          name="location-outline"
                          size={12}
                          color={colors.textMuted}
                        />
                        <Text style={styles.metaBadgeText}>
                          {state.districtCount} district
                          {state.districtCount === 1 ? "" : "s"}
                        </Text>
                      </View>
                      <View style={styles.metaBadge}>
                        <Ionicons
                          name="compass-outline"
                          size={12}
                          color={colors.textMuted}
                        />
                        <Text style={styles.metaBadgeText}>
                          {state.placeCount} places & stays
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeCurrent: {
    backgroundColor: colors.primary,
  },
  stepBadgeDone: {
    backgroundColor: "rgba(5, 150, 105, 0.15)",
  },
  stepBadgeMuted: {
    backgroundColor: colors.surfaceMuted,
  },
  stepBadgeTextCurrent: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  stepBadgeTextMuted: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
  },
  stepText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.8,
  },
  stepTextCurrent: {
    color: colors.text,
  },
  stepLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  stepContainer: {
    gap: 16,
  },
  stepSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.2,
  },
  sectionDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  countBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  countBadgeText: {
    color: "#059669",
    fontSize: 11,
    fontWeight: "700",
  },
  selectedStateBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(11, 37, 69, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(11, 37, 69, 0.2)",
    borderRadius: 16,
    padding: 12,
  },
  selectedStateIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedStateInfo: {
    flex: 1,
  },
  selectedStateEyebrow: {
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  selectedStateName: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
    marginTop: 1,
  },
  changeStateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  changeStateText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  statesGrid: {
    gap: 14,
  },
  stateCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  stateImageContainer: {
    width: "100%",
    height: 160,
    position: "relative",
    backgroundColor: "#0B2545",
  },
  stateImage: {
    width: "100%",
    height: "100%",
  },
  countryBadge: {
    position: "absolute",
    left: 10,
    top: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  countryBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: colors.primary,
  },
  stateCardBody: {
    padding: 14,
    gap: 8,
  },
  stateTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stateName: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.2,
  },
  districtsGrid: {
    gap: 12,
  },
  districtCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  districtCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  districtIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(11, 37, 69, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  exploreLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  exploreLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  districtCardBody: {
    gap: 2,
  },
  districtCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
  },
  districtCardSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  metaBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textMuted,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 8,
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
