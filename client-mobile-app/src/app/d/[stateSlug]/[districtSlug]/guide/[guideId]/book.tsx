/**
 * Booking form for a place-specific guide.
 *
 * Posts to `POST /users/booking/api/specific-guide-bookings`. The backend refuses
 * a date in the past, so the picker is capped at today; the same rule is checked
 * client-side to save a pointless round trip.
 *
 * Sign-in is required by the backend, so an unauthenticated submit routes to the
 * login screen with a return path instead of failing with a 401.
 */

import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, InfoRow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { RemoteImage } from "@/components/ui/remote-image";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { useDistrict } from "@/providers/district-provider";
import { useQuery } from "@/hooks/use-query";
import { findGuideInDistrict } from "@/services/guides.service";
import { createSpecificGuideBooking } from "@/services/bookings.service";
import { formatCurrency, formatDate, toIsoDateOnly } from "@/lib/utils/format";
import { toUserMessage } from "@/lib/api/client";
import { colors, spacing, typography } from "@/theme";

export default function BookGuideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { status } = useAuth();
  const { district } = useDistrict();

  const params = useLocalSearchParams<{ guideId?: string; stateSlug?: string; districtSlug?: string }>();
  const guideId = params.guideId ?? "";
  const returnTo = `/d/${params.stateSlug ?? ""}/${params.districtSlug ?? ""}/guide/${guideId}/book`;

  const { data, loading } = useQuery(
    () => findGuideInDistrict(district!.id, guideId, "specific"),
    [guideId, district?.id],
    { enabled: Boolean(district?.id && guideId) },
  );

  const [date, setDate] = useState<Date>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [time, setTime] = useState("09:00");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <LoadingState label="Loading guide…" />;

  if (!data || data.type !== "specific") {
    return (
      <EmptyState
        title="Guide not found"
        description="This guide is not listed in this district."
        icon="person-outline"
        action={{ label: "Go back", onPress: () => router.back() }}
      />
    );
  }

  const { guide, place } = data;

  const onDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") setPickerOpen(false);
    if (event.type === "dismissed" || !selected) return;

    // Guard against a manual scroll onto a past date even though the minimum
    // should prevent it.
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
      await createSpecificGuideBooking({
        specificGuideId: guide.id,
        bookingDate: toIsoDateOnly(date),
        bookingTime: time.trim() || undefined,
      });

      toast.show("Booking requested", "success");
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
      <Card>
        <View style={styles.guideRow}>
          <RemoteImage
            uri={guide.profile_pic ?? null}
            style={styles.avatar}
            fallbackLabel={guide.full_name}
            radius={999}
          />
          <View style={styles.guideBody}>
            <Text style={styles.guideName}>{guide.full_name}</Text>
            <Text style={styles.guidePlace}>{place.name}</Text>
          </View>
        </View>

        {typeof guide.cost === "number" && guide.cost > 0 ? (
          <InfoRow label="Guide charge" value={`${formatCurrency(guide.cost)} per day`} />
        ) : null}
      </Card>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Choose a date</Text>

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

      <Button
        label="Request booking"
        icon="calendar-outline"
        size="lg"
        fullWidth
        loading={submitting}
        onPress={() => void submit()}
        style={styles.submit}
      />

      <Text style={styles.note}>
        <Ionicons name="information-circle-outline" size={13} color={colors.textMuted} />{" "}
        This is a booking request. The guide confirms it, and you will see the updated
        status under My bookings.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  guideRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: { width: 48, height: 48 },
  guideBody: { flex: 1 },
  guideName: { ...typography.bodyStrong, color: colors.text },
  guidePlace: { ...typography.small, color: colors.textMuted },
  section: { marginTop: spacing.xl },
  sectionTitle: { ...typography.subheading, color: colors.text, marginBottom: spacing.sm },
  submit: { marginTop: spacing.xxl },
  note: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});