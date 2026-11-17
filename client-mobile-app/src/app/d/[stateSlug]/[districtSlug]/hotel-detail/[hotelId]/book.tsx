/**
 * Hotel booking form.
 *
 * The backend refuses a past check-in and a check-out that is not after check-in,
 * so both rules are enforced here before submitting rather than surfacing as a
 * server error. `nightsBetween` mirrors the backend's own floor of one night.
 *
 * Guests and rooms are steppedpers rather than free text: they are small integers
 * with real limits, and a stepper cannot produce a nonsense value.
 */

import { useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, InfoRow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RemoteImage } from "@/components/ui/remote-image";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { Touchable } from "@/components/ui/pressable";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { useDistrict } from "@/providers/district-provider";
import { useQuery } from "@/hooks/use-query";
import { getHotelById } from "@/services/places.service";
import { createHotelBooking } from "@/services/bookings.service";
import { formatCurrency, formatDate, nightsBetween, toIsoDateOnly } from "@/lib/utils/format";
import { toUserMessage } from "@/lib/api/client";
import { colors, radii, spacing, typography } from "@/theme";

const MAX_GUESTS = 12;
const MAX_ROOMS = 6;

export default function BookHotelScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { status } = useAuth();
  const { district } = useDistrict();

  const params = useLocalSearchParams<{
    hotelId?: string;
    stateSlug?: string;
    districtSlug?: string;
  }>();

  const hotelId = params.hotelId ?? "";
  const returnTo = `/d/${params.stateSlug ?? ""}/${params.districtSlug ?? ""}/hotel-detail/${hotelId}/book`;

  const { data: hotel, loading, error, reload } = useQuery(
    () => getHotelById(district!.id, hotelId),
    [hotelId, district?.id],
    { enabled: Boolean(district?.id && hotelId) },
  );

  const [checkIn, setCheckIn] = useState<Date>(() => new Date());
  const [checkOut, setCheckOut] = useState<Date>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>(undefined);
  const [picker, setPicker] = useState<"checkIn" | "checkOut" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const publishedRooms = useMemo(() => {
    return (hotel?.room_types ?? []).filter((rt) => rt.isActive !== false);
  }, [hotel?.room_types]);

  const activeRoom = useMemo(() => {
    if (!publishedRooms.length) return null;
    return publishedRooms.find((r) => r.id === selectedRoomId) ?? publishedRooms[0];
  }, [publishedRooms, selectedRoomId]);

  const roomRate = activeRoom?.pricePerNight ?? hotel?.cost_per_night ?? 0;
  const nights = useMemo(() => nightsBetween(new Date(checkIn), new Date(checkOut)), [checkIn, checkOut]);
  const total = roomRate * nights * rooms;

  if (loading) return <LoadingState label="Loading hotel…" />;
  if (error && !hotel) return <ErrorState message={error} onRetry={reload} />;
  if (!hotel) return null;

  if (!hotel.booking_enabled) {
    return (
      <View style={styles.blocked}>
        <Ionicons name="bed-outline" size={40} color={colors.textMuted} />
        <Text style={styles.blockedTitle}>Bookings are closed</Text>
        <Text style={styles.blockedBody}>
          {hotel.name} is not taking bookings right now.
        </Text>
        <Button label="Go back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const onDateChange = (event: any, selected?: Date) => {
    const target = picker;
    if (Platform.OS === "android") setPicker(null);
    if (event.type === "dismissed" || !selected || !target) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const chosen = selected < today ? today : selected;

    if (target === "checkIn") {
      setCheckIn(chosen);
      // Keep the stay valid: check-out always sits at least one night later.
      if (chosen >= checkOut) {
        const next = new Date(chosen);
        next.setDate(next.getDate() + 1);
        setCheckOut(next);
      }
    } else {
      // The backend rejects a check-out on or before check-in.
      setCheckOut(chosen > checkIn ? chosen : new Date(checkIn.getTime() + 86_400_000));
    }
  };

  const submit = async () => {
    if (status !== "signed-in") {
      router.push({ pathname: "/login", params: { returnTo } });
      return;
    }
    if (checkOut <= checkIn) {
      toast.show("Check-out must be after check-in", "info");
      return;
    }

    setSubmitting(true);
    try {
      await createHotelBooking({
        hotelId: hotel.id,
        roomTypeId: activeRoom?.id,
        checkIn: toIsoDateOnly(checkIn),
        checkOut: toIsoDateOnly(checkOut),
        guests,
        rooms,
      });

      toast.show("Stay requested", "success");
      router.replace("/bookings");
    } catch (cause) {
      toast.show(toUserMessage(cause), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
    >
      <Card>
        <View style={styles.hotelRow}>
          <RemoteImage
            uri={hotel.profile_logo || hotel.images?.[0] || null}
            style={styles.hotelThumb}
            fallbackLabel={hotel.name}
          />
          <View style={styles.hotelBody}>
            <Text style={styles.hotelName}>{hotel.name}</Text>
            <Text style={styles.hotelRate}>
              {formatCurrency(roomRate) ?? "Price on request"} per night
            </Text>
          </View>
        </View>
      </Card>

      {/* Room Type Selector */}
      {publishedRooms.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Option / Room</Text>
          <View style={styles.roomTypesList}>
            {publishedRooms.map((rt) => {
              const isSelected = rt.id === activeRoom?.id;
              const isDorm = rt.roomCategory === "DORMITORY" || rt.pricingUnit === "PER_BED";
              return (
                <Touchable
                  key={rt.id}
                  onPress={() => setSelectedRoomId(rt.id)}
                  style={[
                    styles.roomTypeCard,
                    isSelected && styles.roomTypeCardActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <View style={styles.roomTypeHeader}>
                    <Text style={styles.roomTypeTitle} numberOfLines={1}>
                      {rt.title}
                    </Text>
                    <View
                      style={[
                        styles.acBadge,
                        rt.roomType === "AC"
                          ? styles.acBadgeAc
                          : styles.acBadgeNonAc,
                      ]}
                    >
                      <Text
                        style={[
                          styles.acBadgeText,
                          rt.roomType === "AC"
                            ? styles.acBadgeTextAc
                            : styles.acBadgeTextNonAc,
                        ]}
                      >
                        {rt.roomType}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.roomTypeFooter}>
                    <Text style={styles.roomTypePrice}>
                      {formatCurrency(rt.pricePerNight)}/{isDorm ? "bed" : "nt"}
                    </Text>
                    <Text style={styles.roomTypeAvail}>
                      {rt.availableRooms} {isDorm ? "beds" : "avail"}
                    </Text>
                  </View>
                </Touchable>
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dates</Text>

        <Button
          label={`Check in — ${formatDate(checkIn)}`}
          variant="secondary"
          icon="calendar-outline"
          onPress={() => setPicker("checkIn")}
          style={styles.dateButton}
        />

        {picker === "checkIn" ? (
          <DateTimePicker
            value={checkIn}
            mode="date"
            minimumDate={new Date()}
            onValueChange={onDateChange}
            onDismiss={() => setPicker(null)}
          />
        ) : null}

        <Button
          label={`Check out — ${formatDate(checkOut)}`}
          variant="secondary"
          icon="calendar-outline"
          onPress={() => setPicker("checkOut")}
          style={styles.dateButton}
        />

        {picker === "checkOut" ? (
          <DateTimePicker
            value={checkOut}
            mode="date"
            minimumDate={new Date(checkIn.getTime() + 86_400_000)}
            onValueChange={onDateChange}
            onDismiss={() => setPicker(null)}
          />
        ) : null}
      </View>

      <View style={styles.section}>
        <Stepper
          label="Guests"
          value={guests}
          min={1}
          max={MAX_GUESTS}
          onChange={setGuests}
        />
        <Stepper label="Rooms" value={rooms} min={1} max={MAX_ROOMS} onChange={setRooms} />
      </View>

      {/* Stay Cost Breakdown (matching web BookingSummary) */}
      <Card style={styles.summary}>
        <Text style={styles.summaryTitle}>PRICE BREAKDOWN</Text>
        <View style={styles.summaryDivider} />
        <InfoRow
          label={`${activeRoom?.title ?? "Room"}`}
          value={`${formatCurrency(roomRate)} × ${rooms} × ${nights}nt`}
        />
        <InfoRow
          label="Duration"
          value={`${nights} ${nights === 1 ? "night" : "nights"}`}
        />
        <View style={styles.summaryDivider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Payable</Text>
          <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
        </View>
      </Card>

      <Text style={styles.note}>
        <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />{" "}
        This is a booking request. The total shown is an estimate based on the nightly
        rate and is confirmed by the hotel.
      </Text>

      <Button
        label="Request stay"
        icon="bed-outline"
        size="lg"
        fullWidth
        loading={submitting}
        onPress={() => void submit()}
        style={styles.submit}
      />
    </ScrollView>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.stepperLabel}>{label}</Text>

      <View style={styles.stepperControls}>
        <Touchable
          onPress={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label.toLowerCase()}`}
          style={[styles.stepButton, value <= min && styles.stepButtonDisabled]}
        >
          <Ionicons name="remove" size={18} color={colors.text} />
        </Touchable>

        <Text style={styles.stepValue} accessibilityLabel={`${value} ${label.toLowerCase()}`}>
          {value}
        </Text>

        <Touchable
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label.toLowerCase()}`}
          style={[styles.stepButton, value >= max && styles.stepButtonDisabled]}
        >
          <Ionicons name="add" size={18} color={colors.text} />
        </Touchable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  hotelRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  hotelThumb: { width: 56, height: 56 },
  hotelBody: { flex: 1 },
  hotelName: { ...typography.subheading, color: colors.text },
  hotelRate: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  section: { marginTop: spacing.xl },
  sectionTitle: { ...typography.subheading, color: colors.text, marginBottom: spacing.md },
  dateButton: { marginBottom: spacing.sm },
  roomTypesList: { gap: spacing.sm },
  roomTypeCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  roomTypeCardActive: {
    borderColor: colors.primary,
    backgroundColor: "rgba(11, 37, 69, 0.05)",
  },
  roomTypeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  roomTypeTitle: {
    ...typography.subheading,
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  acBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  acBadgeAc: { backgroundColor: colors.primary },
  acBadgeNonAc: { backgroundColor: colors.surfaceMuted },
  acBadgeText: { fontSize: 10, fontWeight: "700" },
  acBadgeTextAc: { color: "#FFFFFF" },
  acBadgeTextNonAc: { color: colors.textMuted },
  roomTypeFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  roomTypePrice: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  roomTypeAvail: {
    fontSize: 11,
    color: colors.textMuted,
  },
  summary: { marginTop: spacing.lg, padding: spacing.md, gap: spacing.sm },
  summaryTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 1.2,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 2,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.primary,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  stepperLabel: { ...typography.body, color: colors.text },
  stepperControls: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  stepButtonDisabled: { backgroundColor: colors.surfaceSunken, opacity: 0.5 },
  stepValue: { ...typography.subheading, color: colors.text, minWidth: 24, textAlign: "center" },
  note: { ...typography.caption, color: colors.textMuted, marginTop: spacing.lg },
  submit: { marginTop: spacing.lg },
  blocked: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    padding: spacing.xl,
  },
  blockedTitle: { ...typography.title, color: colors.text },
  blockedBody: { ...typography.body, color: colors.textSecondary, textAlign: "center" },
});