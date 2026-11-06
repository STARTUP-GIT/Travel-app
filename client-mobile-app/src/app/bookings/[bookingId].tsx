/**
 * Booking detail screen.
 *
 * Fetches GET /users/booking/api/bookings/:bookingId.
 * Supports all 4 booking types (Tour Guide, Specific Guide, Hotel, Restaurant).
 * Includes Live Guide Location tracking, shareable confirmation, directions,
 * contact actions and full pricing/inclusions breakdowns.
 */

import React, { useEffect, useState } from "react";
import {
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AuthGate } from "@/components/auth-gate";
import { Card, DetailRow, InfoRow } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RemoteImage } from "@/components/ui/remote-image";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { Touchable } from "@/components/ui/pressable";
import { useToast } from "@/providers/toast-provider";
import {
  getBookingById,
  getSpecificGuideLocation,
} from "@/services/bookings.service";
import type {
  BookingDetailResponse,
  SpecificGuideLocationResult,
} from "@/types/api";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatTime,
} from "@/lib/utils/format";
import { colors, radii, spacing, typography } from "@/theme";

export default function BookingDetailPage() {
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const bookingId = params.bookingId ?? "";

  return (
    <AuthGate returnTo={`/bookings/${bookingId}`}>
      <BookingDetailContent bookingId={bookingId} />
    </AuthGate>
  );
}

function BookingDetailContent({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [data, setData] = useState<BookingDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live guide location modal state
  const [trackOpen, setTrackOpen] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [locData, setLocData] = useState<SpecificGuideLocationResult | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  const loadData = async () => {
    if (!bookingId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getBookingById(bookingId);
      setData(res);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load booking details.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [bookingId]);

  const fetchGuideLocation = async () => {
    setTrackOpen(true);
    setLocLoading(true);
    setLocError(null);
    try {
      const res = await getSpecificGuideLocation(bookingId);
      setLocData(res);
    } catch {
      setLocError("Guide location is not available right now.");
    } finally {
      setLocLoading(false);
    }
  };

  const shareConfirmation = async () => {
    if (!data) return;
    let text = "";
    if (data.type === "hotel") {
      const b = data.booking;
      text = `Hotel Stay Confirmation\nHotel: ${b.hotel?.name ?? "Hotel"}\nCheck-in: ${formatDate(b.checkIn)}\nCheck-out: ${formatDate(b.checkOut)}\nRooms: ${b.rooms} | Guests: ${b.guests}\nStatus: ${b.status}\nBooking Ref: ${b.id}`;
    } else if (data.type === "restaurant") {
      const b = data.booking;
      text = `Table Reservation Confirmation\nRestaurant: ${b.restaurent?.name ?? "Restaurant"}\nDate: ${formatDate(b.reservationDate)}${b.reservationTime ? ` at ${b.reservationTime}` : ""}\nGuests: ${b.guests}\nStatus: ${b.status}\nBooking Ref: ${b.id}`;
    } else if (data.type === "specific") {
      const b = data.booking;
      text = `Guide Booking Confirmation\nGuide: ${b.specificGuide?.full_name ?? "Guide"}\nPlace: ${b.place?.name ?? "Place"}\nDate: ${formatDate(b.bookingDate)}${b.bookingTime ? ` at ${b.bookingTime}` : ""}\nStatus: ${b.status}\nBooking Ref: ${b.id}`;
    } else {
      const b = data.booking;
      text = `Tour Booking Confirmation\nTour Guide: ${b.commonGuide?.full_name ?? "Tour Guide"}\nDate: ${formatDate(b.bookingDate)}\nPlaces: ${(b.selectedPlaces ?? []).map((p) => p.place?.name).filter(Boolean).join(", ")}\nStatus: ${b.status}\nBooking Ref: ${b.id}`;
    }

    try {
      await Share.share({
        message: text,
        title: "Booking Confirmation",
      });
    } catch {
      await Clipboard.setStringAsync(text);
      toast.show("Confirmation details copied to clipboard", "success");
    }
  };

  if (loading) return <LoadingState label="Loading booking details…" />;
  if (error || !data) {
    return (
      <ErrorState
        message={error ?? "Booking not found"}
        onRetry={loadData}
      />
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: insets.bottom + spacing.xxxl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Hotel Booking View */}
      {data.type === "hotel" && <HotelBookingDetail booking={data.booking} />}

      {/* Restaurant Reservation View */}
      {data.type === "restaurant" && (
        <RestaurantReservationDetail booking={data.booking} />
      )}

      {/* Specific Guide Booking View */}
      {data.type === "specific" && (
        <SpecificGuideBookingDetail
          booking={data.booking}
          onTrackLocation={fetchGuideLocation}
        />
      )}

      {/* Common Tour Guide Booking View */}
      {data.type === "common" && (
        <CommonGuideBookingDetail booking={data.booking} />
      )}

      {/* Action Buttons */}
      <View style={styles.actionSection}>
        <Button
          label="Share confirmation"
          icon="share-outline"
          onPress={() => void shareConfirmation()}
          fullWidth
          size="lg"
        />

        <Button
          label="Copy reference ID"
          variant="secondary"
          icon="copy-outline"
          onPress={async () => {
            const id =
              data.type === "hotel"
                ? data.booking.id
                : data.type === "restaurant"
                ? data.booking.id
                : data.type === "specific"
                ? data.booking.id
                : data.booking.id;
            await Clipboard.setStringAsync(id);
            toast.show("Booking reference copied", "info");
          }}
          fullWidth
          size="lg"
          style={styles.gapTop}
        />

        <Button
          label="Back to all bookings"
          variant="ghost"
          onPress={() => router.replace("/bookings")}
          fullWidth
          style={styles.gapTop}
        />
      </View>

      {/* Live Guide Location Modal */}
      <Modal
        visible={trackOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setTrackOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Guide Live Location</Text>
              <Touchable
                onPress={() => setTrackOpen(false)}
                accessibilityRole="button"
                style={styles.modalClose}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </Touchable>
            </View>

            {locLoading ? (
              <LoadingState label="Locating guide…" />
            ) : locError ? (
              <View style={styles.modalBody}>
                <Ionicons name="alert-circle-outline" size={36} color={colors.danger} />
                <Text style={styles.locErrorText}>{locError}</Text>
              </View>
            ) : locData?.isSharing && locData.latitude && locData.longitude ? (
              <View style={styles.modalBody}>
                <View style={styles.locStatusRow}>
                  <Ionicons name="radio" size={18} color={colors.success} />
                  <Text style={styles.locActiveText}>
                    {locData.guideName ? `${locData.guideName} is online` : "Sharing live location"}
                  </Text>
                </View>

                <Card style={styles.locCard}>
                  <DetailRow
                    icon="navigate"
                    label="Coordinates"
                    value={`${locData.latitude.toFixed(5)}, ${locData.longitude.toFixed(5)}`}
                  />
                  {locData.updatedAt ? (
                    <DetailRow
                      icon="time-outline"
                      label="Last update"
                      value={new Date(locData.updatedAt).toLocaleTimeString()}
                    />
                  ) : null}
                </Card>

                <Button
                  label="Open in Maps"
                  icon="map-outline"
                  onPress={() => {
                    const url = `https://www.google.com/maps/search/?api=1&query=${locData.latitude},${locData.longitude}`;
                    void Linking.openURL(url);
                  }}
                  fullWidth
                  size="lg"
                  style={styles.gapTop}
                />
              </View>
            ) : (
              <View style={styles.modalBody}>
                <Ionicons name="location-outline" size={40} color={colors.textMuted} />
                <Text style={styles.locIdleText}>
                  Guide is not currently transmitting live coordinates.
                </Text>
                <Text style={styles.locSubText}>
                  Coordinates become active when your tour time approaches.
                </Text>
              </View>
            )}

            <Button
              label="Refresh status"
              variant="secondary"
              onPress={() => void fetchGuideLocation()}
              fullWidth
              style={styles.gapTop}
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-components for each booking type                                       */
/* -------------------------------------------------------------------------- */

function HotelBookingDetail({ booking }: { booking: any }) {
  const images = booking.hotel?.images ?? [];
  const heroImage = images[0] ?? booking.hotel?.profile_logo;

  return (
    <View style={styles.detailContainer}>
      <Card style={styles.heroCard}>
        {heroImage ? (
          <RemoteImage
            uri={heroImage}
            style={styles.heroImage}
            fallbackLabel={booking.hotel?.name ?? "Hotel"}
          />
        ) : null}
        <View style={styles.heroContent}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{booking.hotel?.name ?? "Hotel Stay"}</Text>
            <StatusBadge status={booking.status} />
          </View>
          <Text style={styles.refText}>Booking Ref: #{booking.id.slice(-8).toUpperCase()}</Text>
        </View>
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionHeading}>Stay details</Text>
        <InfoRow label="Check-in" value={formatDate(booking.checkIn)} />
        <InfoRow label="Check-out" value={formatDate(booking.checkOut)} />
        <InfoRow label="Rooms" value={String(booking.rooms ?? 1)} />
        <InfoRow label="Guests" value={String(booking.guests ?? 1)} />
        {booking.hotel?.address ? (
          <InfoRow label="Address" value={booking.hotel.address} />
        ) : null}
      </Card>

      {booking.hotel?.phone_number || booking.hotel?.email ? (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Contact property</Text>
          {booking.hotel?.phone_number ? (
            <Button
              label={`Call ${booking.hotel.phone_number}`}
              icon="call-outline"
              variant="secondary"
              onPress={() => void Linking.openURL(`tel:${booking.hotel.phone_number}`)}
              style={styles.contactBtn}
            />
          ) : null}
          {booking.hotel?.email ? (
            <Button
              label={`Email ${booking.hotel.email}`}
              icon="mail-outline"
              variant="secondary"
              onPress={() => void Linking.openURL(`mailto:${booking.hotel.email}`)}
              style={styles.contactBtn}
            />
          ) : null}
        </Card>
      ) : null}

      {booking.totalAmount > 0 ? (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Payment summary</Text>
          <InfoRow label="Total amount" value={formatCurrency(booking.totalAmount) ?? "—"} />
        </Card>
      ) : null}
    </View>
  );
}

function RestaurantReservationDetail({ booking }: { booking: any }) {
  const heroImage = booking.restaurent?.images?.[0] ?? booking.restaurent?.profile_logo;

  return (
    <View style={styles.detailContainer}>
      <Card style={styles.heroCard}>
        {heroImage ? (
          <RemoteImage
            uri={heroImage}
            style={styles.heroImage}
            fallbackLabel={booking.restaurent?.name ?? "Restaurant"}
          />
        ) : null}
        <View style={styles.heroContent}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{booking.restaurent?.name ?? "Restaurant Table"}</Text>
            <StatusBadge status={booking.status} />
          </View>
          <Text style={styles.refText}>Reservation Ref: #{booking.id.slice(-8).toUpperCase()}</Text>
        </View>
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionHeading}>Reservation details</Text>
        <InfoRow label="Date" value={formatDate(booking.reservationDate)} />
        {booking.reservationTime ? (
          <InfoRow label="Time" value={booking.reservationTime} />
        ) : null}
        <InfoRow label="Party size" value={`${booking.guests} ${booking.guests === 1 ? "guest" : "guests"}`} />
        {booking.restaurent?.address ? (
          <InfoRow label="Address" value={booking.restaurent.address} />
        ) : null}
        {booking.notes ? (
          <InfoRow label="Special requests" value={booking.notes} />
        ) : null}
      </Card>

      {booking.restaurent?.phone_number ? (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Contact restaurant</Text>
          <Button
            label={`Call ${booking.restaurent.phone_number}`}
            icon="call-outline"
            variant="secondary"
            onPress={() => void Linking.openURL(`tel:${booking.restaurent.phone_number}`)}
            style={styles.contactBtn}
          />
        </Card>
      ) : null}
    </View>
  );
}

function SpecificGuideBookingDetail({
  booking,
  onTrackLocation,
}: {
  booking: any;
  onTrackLocation: () => void;
}) {
  const guide = booking.specificGuide;
  const place = booking.place;

  return (
    <View style={styles.detailContainer}>
      <Card style={styles.heroCard}>
        <View style={styles.guideHeaderRow}>
          <RemoteImage
            uri={guide?.profile_pic ?? null}
            style={styles.guideAvatar}
            fallbackLabel={guide?.full_name ?? "Guide"}
            radius={radii.pill}
          />
          <View style={styles.guideHeaderText}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{guide?.full_name ?? "Specific Guide"}</Text>
            </View>
            <Text style={styles.subtext}>{place?.name ?? "Designated place"}</Text>
          </View>
          <StatusBadge status={booking.status} />
        </View>
        <Text style={styles.refText}>Booking Ref: #{booking.id.slice(-8).toUpperCase()}</Text>
      </Card>

      {/* Guide Location Tracking Trigger */}
      {booking.status === "CONFIRMED" ? (
        <Card style={styles.highlightCard}>
          <View style={styles.trackPromptRow}>
            <Ionicons name="compass" size={24} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.trackPromptTitle}>Live Guide Tracking</Text>
              <Text style={styles.trackPromptSub}>
                Check your guide's current coordinates and arrival progress.
              </Text>
            </View>
          </View>
          <Button
            label="Track guide location"
            icon="navigate-outline"
            onPress={onTrackLocation}
            style={styles.gapTop}
          />
        </Card>
      ) : null}

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionHeading}>Trip schedule</Text>
        <InfoRow label="Booking date" value={formatDate(booking.bookingDate)} />
        {booking.bookingTime || booking.tripStartTime ? (
          <InfoRow
            label="Start time"
            value={booking.bookingTime || booking.tripStartTime}
          />
        ) : null}
        <InfoRow
          label="Travellers"
          value={`${booking.numberOfPeople ?? 1} ${(booking.numberOfPeople ?? 1) === 1 ? "person" : "people"}`}
        />
        {booking.requestTicketAssistance ? (
          <InfoRow label="Assistance" value="Ticket purchasing assistance requested" />
        ) : null}
      </Card>

      {/* Pickup & Meeting info */}
      {(booking.pickupAddress || booking.requestedPickupAddress) ? (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Meeting & Pickup</Text>
          {booking.pickupName ? <InfoRow label="Pickup" value={booking.pickupName} /> : null}
          {booking.pickupAddress ? (
            <InfoRow label="Address" value={booking.pickupAddress} />
          ) : null}
          {booking.requestedPickupName ? (
            <InfoRow label="Requested spot" value={booking.requestedPickupName} />
          ) : null}
          {booking.requestedPickupAddress ? (
            <InfoRow label="Requested address" value={booking.requestedPickupAddress} />
          ) : null}
        </Card>
      ) : null}

      {/* Contact guide */}
      {guide?.phone || guide?.email ? (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Contact your guide</Text>
          {guide?.phone ? (
            <Button
              label={`Call ${guide.phone}`}
              icon="call-outline"
              variant="secondary"
              onPress={() => void Linking.openURL(`tel:${guide.phone}`)}
              style={styles.contactBtn}
            />
          ) : null}
          {guide?.email ? (
            <Button
              label={`Email ${guide.email}`}
              icon="mail-outline"
              variant="secondary"
              onPress={() => void Linking.openURL(`mailto:${guide.email}`)}
              style={styles.contactBtn}
            />
          ) : null}
        </Card>
      ) : null}

      {/* Inclusions */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionHeading}>Inclusions & Policies</Text>
        <InfoRow label="Meals" value={booking.foodStatus || "Payable separately"} />
        <InfoRow label="Transport" value={booking.transportStatus || "Not included"} />
        <InfoRow label="Entry fees" value={booking.entryFeeStatus || "Payable at entrance"} />
        {booking.cancellationPolicy ? (
          <InfoRow label="Cancellation" value={booking.cancellationPolicy} />
        ) : null}
      </Card>

      {booking.totalPrice && booking.totalPrice > 0 ? (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Pricing</Text>
          <InfoRow label="Total fee" value={formatCurrency(booking.totalPrice) ?? "—"} />
          {booking.paymentStatus ? (
            <InfoRow label="Payment status" value={booking.paymentStatus} />
          ) : null}
        </Card>
      ) : null}
    </View>
  );
}

function CommonGuideBookingDetail({ booking }: { booking: any }) {
  const guide = booking.commonGuide;
  const places = booking.selectedPlaces ?? [];

  return (
    <View style={styles.detailContainer}>
      <Card style={styles.heroCard}>
        <View style={styles.guideHeaderRow}>
          <RemoteImage
            uri={guide?.profile_pic ?? null}
            style={styles.guideAvatar}
            fallbackLabel={guide?.agencyName || guide?.full_name || "Tour"}
            radius={radii.pill}
          />
          <View style={styles.guideHeaderText}>
            <Text style={styles.title}>
              {guide?.agencyName || guide?.full_name || "Tour Guide"}
            </Text>
            {guide?.agencyName && guide.full_name ? (
              <Text style={styles.subtext}>Lead guide: {guide.full_name}</Text>
            ) : null}
          </View>
          <StatusBadge status={booking.status} />
        </View>
        <Text style={styles.refText}>Booking Ref: #{booking.id.slice(-8).toUpperCase()}</Text>
      </Card>

      <Card style={styles.sectionCard}>
        <Text style={styles.sectionHeading}>Tour itinerary</Text>
        <InfoRow label="Date" value={formatDate(booking.bookingDate)} />
        {booking.bookingTime || booking.tripStartTime ? (
          <InfoRow
            label="Start time"
            value={booking.bookingTime || booking.tripStartTime}
          />
        ) : null}
        <InfoRow
          label="Party"
          value={`${booking.numberOfAdults ?? booking.numberOfPeople ?? 1} Adults${
            booking.numberOfChildren ? `, ${booking.numberOfChildren} Children` : ""
          }`}
        />
        <InfoRow
          label="Places visited"
          value={
            places.length > 0
              ? places.map((p: any) => p.place?.name).filter(Boolean).join(" · ")
              : "Standard itinerary"
          }
        />
      </Card>

      {/* Pickup */}
      {(booking.pickupAddress || booking.requestedPickupAddress) ? (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Meeting & Pickup point</Text>
          {booking.pickupName ? <InfoRow label="Pickup" value={booking.pickupName} /> : null}
          {booking.pickupAddress ? (
            <InfoRow label="Address" value={booking.pickupAddress} />
          ) : null}
          {booking.requestedPickupName ? (
            <InfoRow label="Custom pickup" value={booking.requestedPickupName} />
          ) : null}
          {booking.requestedPickupAddress ? (
            <InfoRow label="Custom address" value={booking.requestedPickupAddress} />
          ) : null}
        </Card>
      ) : null}

      {/* Contacts */}
      {guide?.phone || guide?.email ? (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Contact Tour Agency</Text>
          {guide?.phone ? (
            <Button
              label={`Call ${guide.phone}`}
              icon="call-outline"
              variant="secondary"
              onPress={() => void Linking.openURL(`tel:${guide.phone}`)}
              style={styles.contactBtn}
            />
          ) : null}
          {guide?.email ? (
            <Button
              label={`Email ${guide.email}`}
              icon="mail-outline"
              variant="secondary"
              onPress={() => void Linking.openURL(`mailto:${guide.email}`)}
              style={styles.contactBtn}
            />
          ) : null}
        </Card>
      ) : null}

      {/* Package Inclusions */}
      <Card style={styles.sectionCard}>
        <Text style={styles.sectionHeading}>Services included</Text>
        <InfoRow label="Meals" value={booking.foodStatus || "Separate"} />
        <InfoRow label="Transport" value={booking.transportStatus || "Included"} />
        <InfoRow label="Entry fees" value={booking.entryFeeStatus || "At gate"} />
        {booking.cancellationPolicy ? (
          <InfoRow label="Cancellation" value={booking.cancellationPolicy} />
        ) : null}
      </Card>

      {booking.totalPrice && booking.totalPrice > 0 ? (
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionHeading}>Price details</Text>
          <InfoRow label="Total amount" value={formatCurrency(booking.totalPrice) ?? "—"} />
          {booking.pricingMode ? (
            <InfoRow label="Pricing mode" value={booking.pricingMode} />
          ) : null}
          {booking.paymentStatus ? (
            <InfoRow label="Payment status" value={booking.paymentStatus} />
          ) : null}
        </Card>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  detailContainer: { gap: spacing.md },
  heroCard: { padding: spacing.lg, borderRadius: radii.xl },
  heroImage: { width: "100%", height: 160, borderRadius: radii.lg, marginBottom: spacing.md },
  heroContent: { gap: spacing.xs },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  title: { ...typography.heading, color: colors.text, flex: 1 },
  subtext: { ...typography.small, color: colors.textMuted },
  refText: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  guideHeaderRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  guideAvatar: { width: 56, height: 56 },
  guideHeaderText: { flex: 1 },
  sectionCard: { padding: spacing.lg, borderRadius: radii.xl },
  sectionHeading: { ...typography.bodyStrong, color: colors.text, marginBottom: spacing.md },
  highlightCard: {
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  trackPromptRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  trackPromptTitle: { ...typography.bodyStrong, color: colors.primary },
  trackPromptSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  contactBtn: { marginBottom: spacing.sm },
  actionSection: { marginTop: spacing.xxl },
  gapTop: { marginTop: spacing.md },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    padding: spacing.xl,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  modalTitle: { ...typography.title, color: colors.text },
  modalClose: { padding: spacing.xs },
  modalBody: { alignItems: "center", paddingVertical: spacing.lg },
  locErrorText: { ...typography.body, color: colors.danger, marginTop: spacing.md, textAlign: "center" },
  locStatusRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.md },
  locActiveText: { ...typography.bodyStrong, color: colors.success },
  locCard: { width: "100%", marginTop: spacing.md },
  locIdleText: { ...typography.bodyStrong, color: colors.text, marginTop: spacing.md, textAlign: "center" },
  locSubText: { ...typography.small, color: colors.textMuted, marginTop: spacing.xs, textAlign: "center" },
});
