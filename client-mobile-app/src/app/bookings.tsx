/**
 * My Bookings.
 * Exact mobile equivalent of frontend/app/bookings/page.tsx
 */

import React from "react";
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

import { AuthGate } from "@/components/auth-gate";
import { StatusBadge } from "@/components/ui/badge";
import { RemoteImage } from "@/components/ui/remote-image";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useQuery } from "@/hooks/use-query";
import { listAllBookings, type AllBookings } from "@/services/bookings.service";
import type {
  CommonGuideBooking,
  HotelBooking,
  RestaurantReservation,
  SpecificGuideBooking,
} from "@/types/api";
import { formatDate } from "@/lib/utils/format";
import { colors, radii, spacing, typography } from "@/theme";

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
  const { data, loading, error, reload } = useQuery<AllBookings>(
    () => listAllBookings(),
    []
  );

  const isEmpty =
    !data ||
    (data.hotelBookings.length === 0 &&
      data.restaurantReservations.length === 0 &&
      data.specificGuideBookings.length === 0 &&
      data.tourGuideBookings.length === 0);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: insets.bottom + spacing.xxxl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header bar */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
        </Pressable>
        <View style={styles.headerTextCol}>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <Text style={styles.headerSubtitle}>
            {loading ? "Loading…" : "Everything you've requested"}
          </Text>
        </View>
      </View>

      {loading ? (
        <LoadingState label="Loading your bookings…" />
      ) : error && !data ? (
        <ErrorState message={error} onRetry={reload} />
      ) : isEmpty ? (
        <EmptyState
          icon="calendar-outline"
          title="No bookings yet"
          description="Book a guide for your next visit, or a hotel or table, and it will show up here."
        />
      ) : (
        <View style={styles.groupsContainer}>
          {/* Hotels Group */}
          {data?.hotelBookings && data.hotelBookings.length > 0 ? (
            <BookingGroup
              title="Hotels"
              count={data.hotelBookings.length}
              icon="bed-outline"
            >
              {data.hotelBookings.map((b) => (
                <HotelRow key={b.id} booking={b} onOpen={() => router.push(`/bookings/${b.id}` as any)} />
              ))}
            </BookingGroup>
          ) : null}

          {/* Restaurants Group */}
          {data?.restaurantReservations && data.restaurantReservations.length > 0 ? (
            <BookingGroup
              title="Restaurants"
              count={data.restaurantReservations.length}
              icon="restaurant-outline"
            >
              {data.restaurantReservations.map((b) => (
                <ReservationRow key={b.id} booking={b} onOpen={() => router.push(`/bookings/${b.id}` as any)} />
              ))}
            </BookingGroup>
          ) : null}

          {/* Specific Guides Group */}
          {data?.specificGuideBookings && data.specificGuideBookings.length > 0 ? (
            <BookingGroup
              title="Specific guides"
              count={data.specificGuideBookings.length}
              icon="compass-outline"
            >
              {data.specificGuideBookings.map((b) => (
                <SpecificRow key={b.id} booking={b} onOpen={() => router.push(`/bookings/${b.id}` as any)} />
              ))}
            </BookingGroup>
          ) : null}

          {/* Tour Guides Group */}
          {data?.tourGuideBookings && data.tourGuideBookings.length > 0 ? (
            <BookingGroup
              title="Tour guides"
              count={data.tourGuideBookings.length}
              icon="compass-outline"
            >
              {data.tourGuideBookings.map((b) => (
                <CommonRow key={b.id} booking={b} onOpen={() => router.push(`/bookings/${b.id}` as any)} />
              ))}
            </BookingGroup>
          ) : null}

          {/* Refresh Button */}
          <Pressable
            onPress={() => void reload()}
            style={({ pressed }) => [
              styles.refreshBtn,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="refresh" size={16} color={colors.textSecondary} />
            <Text style={styles.refreshBtnText}>Refresh bookings</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function BookingGroup({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count: number;
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.groupSection}>
      <View style={styles.groupHeader}>
        <Ionicons name={icon} size={18} color={colors.primary} />
        <Text style={styles.groupTitle}>{title}</Text>
        <View style={styles.groupCountBadge}>
          <Text style={styles.groupCountText}>{count}</Text>
        </View>
      </View>
      <View style={styles.groupContent}>{children}</View>
    </View>
  );
}

function HotelRow({
  booking,
  onOpen,
}: {
  booking: HotelBooking;
  onOpen: () => void;
}) {
  const imageUri = booking.hotel?.images?.[0] ?? booking.hotel?.profile_logo;
  const subtitle = `${booking.checkIn ? `Check-in ${formatDate(booking.checkIn)}` : ""}${
    booking.checkOut ? ` → ${formatDate(booking.checkOut)}` : ""
  }`;
  const meta = `${booking.rooms || 1} room(s) · ${booking.guests || 1} guest(s)`;

  return (
    <View style={styles.cardContainer}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [styles.rowCard, pressed && styles.pressed]}
      >
        <View style={styles.thumbnailBox}>
          {imageUri ? (
            <RemoteImage
              uri={imageUri}
              style={styles.thumbnail}
              fallbackLabel={booking.hotel?.name ?? "Hotel"}
            />
          ) : (
            <Ionicons name="calendar" size={20} color={colors.primary} />
          )}
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {booking.hotel?.name ?? "Hotel stay"}
          </Text>
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
          <Text style={styles.rowMeta} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        <StatusBadge status={booking.status} />
      </Pressable>

      <View style={styles.actionRow}>
        <Pressable
          onPress={onOpen}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
        >
          <Ionicons name="document-text-outline" size={14} color={colors.primary} />
          <Text style={styles.actionBtnText}>View Details</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ReservationRow({
  booking,
  onOpen,
}: {
  booking: RestaurantReservation;
  onOpen: () => void;
}) {
  const imageUri =
    booking.restaurent?.images?.[0] ?? booking.restaurent?.profile_logo;
  const formattedDate = formatDate(booking.reservationDate);
  const timePart = booking.reservationTime ? ` at ${booking.reservationTime}` : "";
  const guestsPart = `${booking.guests ?? 1} guest${(booking.guests ?? 1) === 1 ? "" : "s"}`;
  const address =
    (booking as any).reservationSnapshot?.restaurantAddress ||
    booking.restaurent?.address;
  const addressPart = address ? ` · ${address}` : "";

  return (
    <View style={styles.cardContainer}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [styles.rowCard, pressed && styles.pressed]}
      >
        <View style={styles.thumbnailBox}>
          {imageUri ? (
            <RemoteImage
              uri={imageUri}
              style={styles.thumbnail}
              fallbackLabel={booking.restaurent?.name ?? "Restaurant"}
            />
          ) : (
            <Ionicons name="calendar" size={20} color={colors.primary} />
          )}
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {booking.restaurent?.name ?? "Restaurant reservation"}
          </Text>
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {formattedDate}
            {timePart} · {guestsPart}
          </Text>
          {address ? (
            <Text style={styles.rowMeta} numberOfLines={1}>
              {address}
            </Text>
          ) : null}
        </View>
        <StatusBadge status={booking.status} />
      </Pressable>

      <View style={styles.actionRow}>
        <Pressable
          onPress={onOpen}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
        >
          <Ionicons name="document-text-outline" size={14} color={colors.primary} />
          <Text style={styles.actionBtnText}>View Details</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SpecificRow({
  booking,
  onOpen,
}: {
  booking: SpecificGuideBooking;
  onOpen: () => void;
}) {
  const imageUri = booking.specificGuide?.profile_pic;
  const subtitle = `${booking.place?.name ?? "Place"}${
    booking.bookingDate ? ` · ${formatDate(booking.bookingDate)}` : ""
  }`;

  return (
    <View style={styles.cardContainer}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [styles.rowCard, pressed && styles.pressed]}
      >
        <View style={styles.thumbnailBox}>
          {imageUri ? (
            <RemoteImage
              uri={imageUri}
              style={styles.thumbnail}
              fallbackLabel={booking.specificGuide?.full_name ?? "Guide"}
            />
          ) : (
            <Ionicons name="compass" size={20} color={colors.primary} />
          )}
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {booking.specificGuide?.full_name ?? "Specific guide"}
          </Text>
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
          {booking.requestTicketAssistance ? (
            <Text style={styles.rowMeta} numberOfLines={1}>
              Ticket purchasing assistance requested
            </Text>
          ) : null}
        </View>
        <StatusBadge status={booking.status} />
      </Pressable>

      <View style={styles.actionRow}>
        <Pressable
          onPress={onOpen}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
        >
          <Ionicons name="document-text-outline" size={14} color={colors.primary} />
          <Text style={styles.actionBtnText}>View Details</Text>
        </Pressable>
        {booking.status === "CONFIRMED" ? (
          <Pressable
            onPress={onOpen}
            style={({ pressed }) => [
              styles.actionBtn,
              styles.actionBtnHighlight,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="navigate-outline" size={14} color={colors.primary} />
            <Text style={styles.actionBtnText}>Track Guide Location</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function CommonRow({
  booking,
  onOpen,
}: {
  booking: CommonGuideBooking;
  onOpen: () => void;
}) {
  const imageUri = booking.commonGuide?.profile_pic;
  const placeNames = (booking.selectedPlaces ?? [])
    .map((p) => p.place?.name)
    .filter(Boolean)
    .join(", ");
  const subtitle = `${booking.selectedPlaces?.length ?? 0} place(s)${
    booking.bookingDate ? ` · ${formatDate(booking.bookingDate)}` : ""
  }`;

  return (
    <View style={styles.cardContainer}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [styles.rowCard, pressed && styles.pressed]}
      >
        <View style={styles.thumbnailBox}>
          {imageUri ? (
            <RemoteImage
              uri={imageUri}
              style={styles.thumbnail}
              fallbackLabel={booking.commonGuide?.full_name ?? "Tour guide"}
            />
          ) : (
            <Ionicons name="compass" size={20} color={colors.primary} />
          )}
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {booking.commonGuide?.agencyName ||
              booking.commonGuide?.full_name ||
              "Tour guide"}
          </Text>
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
          {placeNames ? (
            <Text style={styles.rowMeta} numberOfLines={1}>
              {placeNames}
            </Text>
          ) : null}
        </View>
        <StatusBadge status={booking.status} />
      </Pressable>

      <View style={styles.actionRow}>
        <Pressable
          onPress={onOpen}
          style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
        >
          <Ionicons name="document-text-outline" size={14} color={colors.primary} />
          <Text style={styles.actionBtnText}>View Details</Text>
        </Pressable>
      </View>
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
    marginBottom: 20,
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
  groupsContainer: {
    gap: 24,
  },
  groupSection: {
    gap: 10,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
  },
  groupCountBadge: {
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  groupCountText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
  },
  groupContent: {
    gap: 12,
  },
  cardContainer: {
    gap: 6,
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  thumbnailBox: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "rgba(11, 37, 69, 0.08)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
  },
  rowSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  rowMeta: {
    fontSize: 11,
    color: colors.textMuted,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    paddingHorizontal: 4,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionBtnHighlight: {
    borderColor: colors.primary,
  },
  actionBtnText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: colors.primary,
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
