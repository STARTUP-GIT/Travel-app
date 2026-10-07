/**
 * Restaurant reservation form.
 *
 * `POST /users/booking/api/restaurant-reservations` takes a date and a guest
 * count only, and refuses a past date. Time of day is not part of the backend
 * contract, so the form does not invent one.
 */

import { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RemoteImage } from "@/components/ui/remote-image";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { Touchable } from "@/components/ui/pressable";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { useDistrict } from "@/providers/district-provider";
import { useQuery } from "@/hooks/use-query";
import { getRestaurantById } from "@/services/places.service";
import { createReservation } from "@/services/bookings.service";
import { formatDate, toIsoDateOnly } from "@/lib/utils/format";
import { toUserMessage } from "@/lib/api/client";
import { colors, foodCategoryLabel, radii, spacing, typography } from "@/theme";

const MAX_GUESTS = 20;

export default function ReserveRestaurantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { status } = useAuth();
  const { district } = useDistrict();

  const params = useLocalSearchParams<{
    restaurantId?: string;
    stateSlug?: string;
    districtSlug?: string;
  }>();

  const restaurantId = params.restaurantId ?? "";
  const returnTo = `/d/${params.stateSlug ?? ""}/${params.districtSlug ?? ""}/restaurant-detail/${restaurantId}/reserve`;

  const { data: restaurant, loading, error, reload } = useQuery(
    () => getRestaurantById(district!.id, restaurantId),
    [restaurantId, district?.id],
    { enabled: Boolean(district?.id && restaurantId) },
  );

  const [date, setDate] = useState<Date>(() => new Date());
  const [guests, setGuests] = useState(2);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <LoadingState label="Loading restaurant…" />;
  if (error && !restaurant) return <ErrorState message={error} onRetry={reload} />;
  if (!restaurant) return null;

  if (!restaurant.booking_enabled) {
    return (
      <View style={styles.blocked}>
        <Ionicons name="restaurant-outline" size={40} color={colors.textMuted} />
        <Text style={styles.blockedTitle}>Reservations are closed</Text>
        <Text style={styles.blockedBody}>
          {restaurant.name} is not taking reservations right now.
        </Text>
        <Button label="Go back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const onDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setPickerOpen(false);
    if (event.type === "dismissed" || !selected) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setDate(selected < today ? today : selected);
  };

  const submit = async () => {
    if (status !== "signed-in") {
      router.push({ pathname: "/login", params: { returnTo } });
      return;
    }

    setSubmitting(true);
    try {
      await createReservation({
        restaurantId: restaurant.id,
        reservationDate: toIsoDateOnly(date),
        guests,
      });

      toast.show("Table requested", "success");
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
        <View style={styles.restaurantRow}>
          <RemoteImage
            uri={restaurant.profile_logo || restaurant.images?.[0] || null}
            style={styles.thumb}
            fallbackLabel={restaurant.name}
          />
          <View style={styles.body}>
            <Text style={styles.name}>{restaurant.name}</Text>
            <Text style={styles.cuisine}>{foodCategoryLabel(restaurant.food_category)}</Text>
          </View>
        </View>
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Date</Text>
        <Button
          label={formatDate(date)}
          variant="secondary"
          icon="calendar-outline"
          onPress={() => setPickerOpen((open) => !open)}
        />
        {pickerOpen ? (
          <DateTimePicker
            value={date}
            mode="date"
            minimumDate={new Date()}
            onChange={onDateChange}
          />
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Guests</Text>
        <View style={styles.guestRow}>
          <Touchable
            onPress={() => setGuests((n) => Math.max(1, n - 1))}
            disabled={guests <= 1}
            accessibilityRole="button"
            accessibilityLabel="Decrease guests"
            style={[styles.stepButton, guests <= 1 && styles.stepDisabled]}
          >
            <Ionicons name="remove" size={18} color={colors.text} />
          </Touchable>

          <Text style={styles.guestCount} accessibilityLabel={`${guests} guests`}>
            {guests} {guests === 1 ? "guest" : "guests"}
          </Text>

          <Touchable
            onPress={() => setGuests((n) => Math.min(MAX_GUESTS, n + 1))}
            disabled={guests >= MAX_GUESTS}
            accessibilityRole="button"
            accessibilityLabel="Increase guests"
            style={[styles.stepButton, guests >= MAX_GUESTS && styles.stepDisabled]}
          >
            <Ionicons name="add" size={18} color={colors.text} />
          </Touchable>
        </View>
      </View>

      <Text style={styles.note}>
        <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />{" "}
        This is a reservation request. The restaurant confirms it from its bookings
        page.
      </Text>

      <Button
        label="Request table"
        icon="restaurant-outline"
        size="lg"
        fullWidth
        loading={submitting}
        onPress={() => void submit()}
        style={styles.submit}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  restaurantRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  thumb: { width: 56, height: 56 },
  body: { flex: 1 },
  name: { ...typography.subheading, color: colors.text },
  cuisine: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  section: { marginTop: spacing.xl },
  sectionTitle: { ...typography.subheading, color: colors.text, marginBottom: spacing.md },
  guestRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDisabled: { backgroundColor: colors.surfaceSunken, opacity: 0.5 },
  guestCount: { ...typography.subheading, color: colors.text },
  note: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xl },
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