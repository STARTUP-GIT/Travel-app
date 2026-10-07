/**
 * Tour Guide booking form.
 *
 * Posts to `POST /users/booking/api/common-guide-bookings`, which requires at
 * least one place id — so the place selector cannot be submitted empty, and the
 * button reflects that instead of letting the backend reject it.
 *
 * The places offered are exactly the ones this district lists for the guide.
 * A package does not auto-select its places: the user confirms what they actually
 * want, which is what gets recorded on the booking.
 */

import { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { RemoteImage } from "@/components/ui/remote-image";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { Touchable } from "@/components/ui/pressable";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { useDistrict } from "@/providers/district-provider";
import { useQuery } from "@/hooks/use-query";
import { findGuideInDistrict } from "@/services/guides.service";
import { createTourGuideBooking } from "@/services/bookings.service";
import { formatDate, toIsoDateOnly } from "@/lib/utils/format";
import { toUserMessage } from "@/lib/api/client";
import { colors, radii, spacing, TOUR_GUIDE_LABEL, typography } from "@/theme";

export default function BookTourGuideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { status } = useAuth();
  const { district } = useDistrict();

  const params = useLocalSearchParams<{ guideId?: string; stateSlug?: string; districtSlug?: string }>();
  const guideId = params.guideId ?? "";
  const returnTo = `/d/${params.stateSlug ?? ""}/${params.districtSlug ?? ""}/tour-guide/${guideId}/book`;

  const { data, loading } = useQuery(
    () => findGuideInDistrict(district!.id, guideId, "common"),
    [guideId, district?.id],
    { enabled: Boolean(district?.id && guideId) },
  );

  const [selected, setSelected] = useState<string[]>([]);
  const [date, setDate] = useState<Date>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [time, setTime] = useState("09:00");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <LoadingState label="Loading tour options…" />;

  if (!data || data.type !== "common") {
    return (
      <EmptyState
        title={`${TOUR_GUIDE_LABEL} not found`}
        description={`This ${TOUR_GUIDE_LABEL.toLowerCase()} is not listed in this district.`}
        icon="people-outline"
        action={{ label: "Go back", onPress: () => router.back() }}
      />
    );
  }

  const { guide, places } = data;

  const togglePlace = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );

  const onDateChange = (event: DateTimePickerEvent, value?: Date) => {
    if (Platform.OS === "android") setPickerOpen(false);
    if (event.type === "dismissed" || !value) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setDate(value < today ? today : value);
  };

  const submit = async () => {
    if (status !== "signed-in") {
      router.push({ pathname: "/login", params: { returnTo } });
      return;
    }
    if (selected.length === 0) {
      toast.show("Choose at least one place for the tour", "info");
      return;
    }

    setSubmitting(true);
    try {
      await createTourGuideBooking({
        commonGuideId: guide.id,
        placeIds: selected,
        bookingDate: toIsoDateOnly(date),
        bookingTime: time.trim() || undefined,
      });

      toast.show("Tour requested", "success");
      router.replace("/bookings");
    } catch (error) {
      toast.show(toUserMessage(error), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
    >
      <Text style={styles.heading}>Book {guide.full_name}</Text>

      <Text style={styles.sectionTitle}>
        Choose places ({selected.length} selected)
      </Text>

      {places.length === 0 ? (
        <EmptyState
          title="No places listed"
          description={`This ${TOUR_GUIDE_LABEL.toLowerCase()} has no places listed in ${district?.name ?? "this district"}.`}
          icon="map-outline"
        />
      ) : (
        places.map((place) => {
          const isSelected = selected.includes(place.id);

          return (
            <Touchable
              key={place.id}
              onPress={() => togglePlace(place.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={place.name}
              style={[styles.placeRow, isSelected && styles.placeRowSelected]}
            >
              <RemoteImage
                uri={place.images?.[0] ?? null}
                style={styles.thumb}
                fallbackLabel={place.name}
              />

              <View style={styles.placeBody}>
                <Text style={styles.placeName}>{place.name}</Text>
                {place.category ? (
                  <Text style={styles.placeCategory}>{place.category}</Text>
                ) : null}
              </View>

              <Ionicons
                name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={isSelected ? colors.success : colors.borderStrong}
              />
            </Touchable>
          );
        })
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tour date</Text>
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
        <TextField
          label="Preferred time"
          value={time}
          onChangeText={setTime}
          placeholder="09:00"
          hint="24-hour time, for example 09:00."
        />
      </View>

      <Card style={styles.summary}>
        <Text style={styles.summaryText}>
          {selected.length === 0
            ? "Select at least one place to request a tour."
            : `${TOUR_GUIDE_LABEL}: ${guide.full_name} · ${selected.length} ${
                selected.length === 1 ? "place" : "places"
              } · ${formatDate(date)}`}
        </Text>
      </Card>

      <Button
        label="Request tour"
        icon="calendar-outline"
        size="lg"
        fullWidth
        disabled={selected.length === 0}
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
  heading: { ...typography.title, color: colors.text, marginBottom: spacing.lg },
  section: { marginTop: spacing.xl },
  sectionTitle: { ...typography.subheading, color: colors.text, marginBottom: spacing.md },
  placeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: spacing.sm,
  },
  placeRowSelected: { borderColor: colors.success, backgroundColor: colors.successLight },
  thumb: { width: 48, height: 48 },
  placeBody: { flex: 1 },
  placeName: { ...typography.bodyStrong, color: colors.text },
  placeCategory: { ...typography.small, color: colors.textMuted },
  summary: { marginTop: spacing.xl, backgroundColor: colors.surfaceMuted },
  summaryText: { ...typography.small, color: colors.textSecondary },
  submit: { marginTop: spacing.lg },
});