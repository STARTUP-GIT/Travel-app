/**
 * District Path Tracker Hub.
 * Exact mobile equivalent of frontend/app/[stateSlug]/[districtSlug]/path-tracker/path-tracker-hub.tsx
 */

import React, { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useDistrict } from "@/providers/district-provider";
import { useTripStore } from "@/store/trip-store";
import { formatDistance, formatDuration } from "@/path-tracker/utils/geo";
import { triggerMediumTap, triggerTap } from "@/path-tracker/services/alert-service";
import type { Place } from "@/types/api";
import { colors, radii, spacing, typography } from "@/theme";

function trackerPlacePrice(place: Place): string {
  const bands = place.pricing ?? [];
  if (bands.length > 0) {
    return `From ₹${Math.round(Math.min(...bands.map((band) => band.amount)))}`;
  }
  return place.entryfee === null
    ? "Free entry"
    : `₹${Math.round(place.entryfee)} entry`;
}

export default function DistrictPathTrackerHub() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { district, places } = useDistrict();
  const params = useLocalSearchParams<{ stateSlug?: string; districtSlug?: string }>();
  const base = `/d/${params.stateSlug ?? ""}/${params.districtSlug ?? ""}`;

  const [selectedPlace, setSelectedPlace] = useState<Place | null>(places[0] ?? null);

  const tripHistory = useTripStore((s) => s.tripHistory);
  const loadHistory = useTripStore((s) => s.loadHistory);
  const deleteTrip = useTripStore((s) => s.deleteTrip);
  const bootstrap = useTripStore((s) => s.bootstrap);
  const recoveredActive = useTripStore((s) => s.recoveredActive);
  const resumeRecoveredTrip = useTripStore((s) => s.resumeRecoveredTrip);
  const discardRecoveredTrip = useTripStore((s) => s.discardRecoveredTrip);

  useEffect(() => {
    void bootstrap();
    void loadHistory();
  }, [bootstrap, loadHistory]);

  useEffect(() => {
    if (!selectedPlace && places.length > 0) {
      setSelectedPlace(places[0]);
    }
  }, [places, selectedPlace]);

  function handleStartTracking() {
    if (!selectedPlace) return;
    triggerMediumTap();
    router.push({
      pathname: `${base}/path-tracker/live` as any,
      params: {
        placeId: selectedPlace.id,
        name: selectedPlace.name,
      },
    });
  }

  function handleDeleteTrip(id: string) {
    triggerTap();
    Alert.alert(
      "Delete Trip",
      "Are you sure you want to delete this saved route record?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void deleteTrip(id);
          },
        },
      ]
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: Math.max(insets.bottom, 20) + 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header bar */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
        </Pressable>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Path Tracker</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {district?.name ?? params.districtSlug} · real GPS, never simulated
          </Text>
        </View>
      </View>

      {/* How it works banner */}
      <View style={styles.infoCard}>
        <View style={styles.infoIconBox}>
          <Ionicons name="navigate-outline" size={22} color={colors.primary} />
        </View>
        <View style={styles.infoTextBox}>
          <Text style={styles.infoTitle}>Track your journey for real</Text>
          <Text style={styles.infoBody}>
            Pick a destination, start tracking, and the app records your route using
            your phone's GPS. Your path never leaves this device.
          </Text>
        </View>
      </View>

      {/* Recovered active trip banner if exists */}
      {recoveredActive ? (
        <View style={styles.warningCard}>
          <Ionicons name="alert-circle-outline" size={22} color="#B45309" />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Unfinished Trip Found</Text>
            <Text style={styles.warningText}>
              You have an unfinished trip ({formatDistance(recoveredActive.totalDistance)}) from{" "}
              {new Date(recoveredActive.startTime).toLocaleString()}.
            </Text>
            <View style={styles.warningActions}>
              <Pressable
                onPress={() => {
                  void resumeRecoveredTrip(recoveredActive);
                  router.push(`${base}/path-tracker/live` as any);
                }}
                style={styles.resumeBtn}
              >
                <Text style={styles.resumeBtnText}>Resume Trip</Text>
              </Pressable>
              <Pressable
                onPress={() => void discardRecoveredTrip()}
                style={styles.discardBtn}
              >
                <Text style={styles.discardBtnText}>Discard</Text>
              </Pressable>
            </View>
          </View>
        </View>
      ) : null}

      {/* Destination picker section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Where are you heading?</Text>
          <Text style={styles.sectionSubtitle}>
            Places in {district?.name ?? params.districtSlug}
          </Text>
        </View>

        {places.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="trail-sign-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No places yet</Text>
            <Text style={styles.emptyDesc}>
              Places will appear here once published for {district?.name}.
            </Text>
          </View>
        ) : (
          <View style={styles.placeList}>
            {places.map((place) => {
              const active = selectedPlace?.id === place.id;
              return (
                <Pressable
                  key={place.id}
                  onPress={() => {
                    triggerTap();
                    setSelectedPlace(place);
                  }}
                  style={({ pressed }) => [
                    styles.placeItem,
                    active && styles.placeItemActive,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <View
                    style={[
                      styles.placeIconBox,
                      active && styles.placeIconBoxActive,
                    ]}
                  >
                    <Ionicons
                      name="flag"
                      size={18}
                      color={active ? colors.primary : colors.textMuted}
                    />
                  </View>
                  <View style={styles.placeInfo}>
                    <Text
                      style={[
                        styles.placeName,
                        active && styles.placeNameActive,
                      ]}
                      numberOfLines={1}
                    >
                      {place.name}
                    </Text>
                    <Text style={styles.placeMeta} numberOfLines={1}>
                      {place.category ?? "Place"} · {trackerPlacePrice(place)}
                    </Text>
                  </View>
                  {active ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.primary}
                    />
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.border}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Start tracking button */}
        <Pressable
          onPress={handleStartTracking}
          disabled={!selectedPlace}
          style={({ pressed }) => [
            styles.startBtn,
            !selectedPlace && styles.startBtnDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Ionicons name="navigate" size={18} color="#FFFFFF" />
          <Text style={styles.startBtnText}>Start tracking</Text>
        </Pressable>
      </View>

      {/* Trip history section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your trips</Text>
          <Text style={styles.sectionSubtitle}>
            Completed routes on this device
          </Text>
        </View>

        {tripHistory.length === 0 ? (
          <View style={styles.emptyTripCard}>
            <Ionicons name="trophy-outline" size={22} color={colors.textMuted} />
            <Text style={styles.emptyTripText}>
              Complete a route and it will be saved here.
            </Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {tripHistory.map((trip) => (
              <View key={trip.id} style={styles.historyItem}>
                <View style={styles.historyIconBox}>
                  <Ionicons name="map-outline" size={20} color="#059669" />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyTime} numberOfLines={1}>
                    {new Date(trip.startTime).toLocaleString()}
                  </Text>
                  <Text style={styles.historyStats} numberOfLines={1}>
                    {formatDistance(trip.totalDistance)} ·{" "}
                    {formatDuration(trip.activeDurationMs)} · {trip.pointCount} points
                    {trip.returnedToStart ? " · returned" : ""}
                  </Text>
                </View>
                <Pressable
                  onPress={() => handleDeleteTrip(trip.id)}
                  style={({ pressed }) => [
                    styles.deleteBtn,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Delete trip record"
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Privacy footer link */}
      <Pressable
        onPress={() => router.push("/about")}
        style={styles.aboutLink}
      >
        <Text style={styles.aboutLinkText}>How path tracking & privacy work</Text>
      </Pressable>
    </ScrollView>
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
  headerTitleCol: {
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
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "rgba(11, 37, 69, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(11, 37, 69, 0.15)",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(11, 37, 69, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoTextBox: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  infoBody: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
    marginTop: 2,
  },
  warningCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#92400E",
  },
  warningText: {
    fontSize: 12,
    color: "#78350F",
    marginTop: 2,
    lineHeight: 16,
  },
  warningActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  resumeBtn: {
    backgroundColor: "#D97706",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resumeBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  discardBtn: {
    backgroundColor: "transparent",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D97706",
  },
  discardBtnText: {
    color: "#92400E",
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    marginTop: 16,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  placeList: {
    gap: 8,
  },
  placeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  placeItemActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(11, 37, 69, 0.04)",
  },
  placeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  placeIconBoxActive: {
    backgroundColor: "rgba(11, 37, 69, 0.1)",
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: colors.text,
  },
  placeNameActive: {
    color: colors.primary,
  },
  placeMeta: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#059669",
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 12,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  startBtnDisabled: {
    opacity: 0.5,
  },
  startBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  historyList: {
    gap: 8,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(5, 150, 105, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  historyInfo: {
    flex: 1,
  },
  historyTime: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  historyStats: {
    fontSize: 11.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 2,
  },
  emptyTripCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  emptyTripText: {
    fontSize: 12.5,
    color: colors.textMuted,
    flex: 1,
  },
  aboutLink: {
    marginTop: 24,
    alignSelf: "center",
    paddingVertical: 6,
  },
  aboutLinkText: {
    fontSize: 12,
    color: colors.textMuted,
    textDecorationLine: "underline",
  },
  pressed: {
    opacity: 0.75,
    transform: [{ scale: 0.98 }],
  },
});
