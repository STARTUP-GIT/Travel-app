/**
 * My bookings.
 *
 * Aggregates the four authenticated booking endpoints the backend already
 * provides — hotel bookings, restaurant reservations, specific-guide bookings and
 * Tour Guide bookings — into one chronological list.
 *
 * Each list degrades to empty on its own failure so one endpoint being down does
 * not hide the other three; the screen shows what loaded and says which part
 * failed, rather than presenting an empty account.
 */

import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthGate } from "@/components/auth-gate";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { Touchable } from "@/components/ui/pressable";
import { useQuery } from "@/hooks/use-query";
import { listAllBookings, type AllBookings } from "@/services/bookings.service";
import { formatCurrency, formatDate, formatDateTime, formatTime } from "@/lib/utils/format";
import { colors, spacing, typography } from "@/theme";

type Tab = "all" | "stays" | "tables" | "guides";

const TABS: { id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "all", label: "All", icon: "apps-outline" },
  { id: "stays", label: "Stays", icon: "bed-outline" },
  { id: "tables", label: "Tables", icon: "restaurant-outline" },
  { id: "guides", label: "Guides", icon: "people-outline" },
];

export default function BookingsScreen() {
  return (
    <AuthGate returnTo="/bookings">
      <BookingsContent />
    </AuthGate>
  );
}

function BookingsContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>("all");

  const { data, loading, error, reload } = useQuery<AllBookings>(() => listAllBookings(), []);

  const visible = useMemo(() => {
    if (!data) return [];
    if (tab === "stays") return data.hotelBookings;
    if (tab === "tables") return data.restaurantReservations;
    if (tab === "guides") {
      return [...data.specificGuideBookings, ...data.tourGuideBookings];
    }
    return [
      ...data.hotelBookings,
      ...data.restaurantReservations,
      ...data.specificGuideBookings,
      ...data.tourGuideBookings,
    ];
  }, [data, tab]);

  if (loading) return <LoadingState label="Loading your bookings…" />;

  if (error && !data) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
    >
      <View style={styles.tabs}>
        {TABS.map((item) => (
          <Touchable
            key={item.id}
            onPress={() => setTab(item.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item.id }}
            style={[styles.tab, tab === item.id && styles.tabActive]}
          >
            <Ionicons
              name={item.icon}
              size={16}
              color={tab === item.id ? colors.textInverse : colors.textSecondary}
            />
            <Text style={[styles.tabLabel, tab === item.id && styles.tabLabelActive]}>
              {item.label}
            </Text>
          </Touchable>
        ))}
      </View>

      {error ? (
        <Text style={styles.partialError} accessibilityRole="alert">
          Some bookings could not be loaded. Pull to retry.
        </Text>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          description="Booked guides, stays and tables will appear here."
          icon="calendar-outline"
          action={{ label: "Explore destinations", onPress: () => router.push("/explore") }}
        />
      ) : (
        visible.map((booking) => {
          if ("hotel" in booking) {
            return (
              <Card key={booking.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="bed-outline" size={18} color={colors.primary} />
                  <Text style={styles.cardTitle}>{booking.hotel?.name ?? "Stay"}</Text>
                  <StatusBadge status={booking.status} />
                </View>

                <Text style={styles.cardLine}>
                  {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)} ·{" "}
                  {booking.guests} {booking.guests === 1 ? "guest" : "guests"}
                </Text>

                {booking.totalAmount > 0 ? (
                  <Text style={styles.amount}>
                    {formatCurrency(booking.totalAmount)}
                  </Text>
                ) : null}
              </Card>
            );
          }

          if ("restaurent" in booking) {
            return (
              <Card key={booking.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="restaurant-outline" size={18} color={colors.primary} />
                  <Text style={styles.cardTitle}>
                    {booking.restaurent?.name ?? "Table"}
                  </Text>
                  <StatusBadge status={booking.status} />
                </View>

                <Text style={styles.cardLine}>
                  {formatDate(booking.reservationDate)} at{" "}
                  {formatTime(booking.reservationDate)} · {booking.guests}{" "}
                  {booking.guests === 1 ? "guest" : "guests"}
                </Text>
              </Card>
            );
          }

          if ("specificGuide" in booking) {
            return (
              <Card key={booking.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="person-outline" size={18} color={colors.primary} />
                  <Text style={styles.cardTitle}>
                    {booking.specificGuide?.full_name ?? "Guide"}
                  </Text>
                  <StatusBadge status={booking.status} />
                </View>

                <Text style={styles.cardLine}>
                  {booking.place?.name ?? "Place"} · {formatDate(booking.bookingDate)}
                  {booking.bookingTime ? ` at ${booking.bookingTime}` : ""}
                </Text>
              </Card>
            );
          }

          return (
            <Card key={booking.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="people-outline" size={18} color={colors.primary} />
                <Text style={styles.cardTitle}>
                  {booking.commonGuide?.full_name ?? "Tour Guide"}
                </Text>
                <StatusBadge status={booking.status} />
              </View>

              <Text style={styles.cardLine}>
                {formatDateTime(booking.bookingDate)}
                {booking.bookingTime ? ` · ${booking.bookingTime}` : ""}
              </Text>

              {booking.selectedPlaces?.length ? (
                <Text style={styles.cardSub}>
                  {booking.selectedPlaces.length}{" "}
                  {booking.selectedPlaces.length === 1 ? "place" : "places"} on this tour
                </Text>
              ) : null}
            </Card>
          );
        })
      )}

      {data && data.total > 0 ? (
        <Button
          label="Explore more destinations"
          variant="secondary"
          onPress={() => router.push("/explore")}
          fullWidth
          style={styles.footerAction}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  tabs: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabLabel: { ...typography.smallStrong, color: colors.textSecondary },
  tabLabelActive: { color: colors.textInverse },
  partialError: {
    ...typography.small,
    color: colors.warning,
    marginBottom: spacing.md,
  },
  card: { marginBottom: spacing.md },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  cardTitle: { ...typography.bodyStrong, color: colors.text, flex: 1 },
  cardLine: { ...typography.small, color: colors.textSecondary },
  cardSub: { ...typography.small, color: colors.textMuted, marginTop: spacing.xs },
  amount: { ...typography.bodyStrong, color: colors.successDark, marginTop: spacing.sm },
  footerAction: { marginTop: spacing.lg },
});