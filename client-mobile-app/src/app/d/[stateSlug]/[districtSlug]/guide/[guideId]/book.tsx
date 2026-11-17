/**
 * Booking form for a place-specific guide.
 *
 * Posts to `POST /users/booking/api/specific-guide-bookings`. The backend refuses
 * a date in the past, so the picker is capped at today.
 * Supports party size, ticket assistance requests, pickup location, and notes.
 */

import { useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, InfoRow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { RemoteImage } from "@/components/ui/remote-image";
import { Touchable } from "@/components/ui/pressable";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { useDistrict } from "@/providers/district-provider";
import { useQuery } from "@/hooks/use-query";
import { findGuideInDistrict } from "@/services/guides.service";
import { createSpecificGuideBooking } from "@/services/bookings.service";
import { formatCurrency, formatDate, toIsoDateOnly } from "@/lib/utils/format";
import { toUserMessage } from "@/lib/api/client";
import { colors, radii, spacing, typography } from "@/theme";
import { TopBar } from "@/components/shared/TopBar";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { DistrictBottomNav } from "@/components/shared/DistrictBottomNav";

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
  const [people, setPeople] = useState(1);
  const [ticketAssistance, setTicketAssistance] = useState(false);
  const [pickupAddress, setPickupAddress] = useState("");
  const [notes, setNotes] = useState("");
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

  const onDateChange = (event: any, selected?: Date) => {
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
      await createSpecificGuideBooking({
        specificGuideId: guide.id,
        bookingDate: toIsoDateOnly(date),
        bookingTime: time.trim() || undefined,
        numberOfPeople: people,
        requestTicketAssistance: ticketAssistance,
        pickupAddress: pickupAddress.trim() || undefined,
        notes: notes.trim() || undefined,
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
    <View style={styles.root}>
      {/* 1. Universal TopBar matching Web */}
      <TopBar />

      {/* 2. Web ScreenHeader */}
      <ScreenHeader
        title={`Book ${guide.full_name}`}
        subtitle={`Specific Guide · ${place?.name}`}
      />

      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.guideRow}>
        <RemoteImage
          uri={guide.profile_pic ?? null}
          style={styles.avatar}
          fallbackLabel={guide.full_name}
          radius={radii.pill}
        />
        <View style={styles.guideBody}>
          <Text style={styles.guideName}>{guide.full_name}</Text>
          <Text style={styles.guidePlace}>{place?.name ?? "Designated place"}</Text>
        </View>
      </View>

      {guide.cost ? (
        <Card style={styles.section}>
          <InfoRow label="Guide fee" value={`${formatCurrency(guide.cost)} per tour`} />
        </Card>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Date of visit</Text>
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
            onValueChange={onDateChange}
            onDismiss={() => setPickerOpen(false)}
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Number of travellers</Text>
        <View style={styles.stepperRow}>
          <Touchable
            onPress={() => setPeople((curr) => Math.max(1, curr - 1))}
            style={styles.stepperBtn}
            accessibilityRole="button"
            accessibilityLabel="Decrease travellers"
          >
            <Ionicons name="remove" size={20} color={people > 1 ? colors.text : colors.textMuted} />
          </Touchable>
          <Text style={styles.stepperValue}>{people} {people === 1 ? "person" : "people"}</Text>
          <Touchable
            onPress={() => setPeople((curr) => Math.min(25, curr + 1))}
            style={styles.stepperBtn}
            accessibilityRole="button"
            accessibilityLabel="Increase travellers"
          >
            <Ionicons name="add" size={20} color={people < 25 ? colors.text : colors.textMuted} />
          </Touchable>
        </View>
      </View>

      <View style={styles.section}>
        <Touchable
          onPress={() => setTicketAssistance((curr) => !curr)}
          style={[styles.checkboxCard, ticketAssistance && styles.checkboxCardActive]}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: ticketAssistance }}
        >
          <Ionicons
            name={ticketAssistance ? "checkbox" : "square-outline"}
            size={22}
            color={ticketAssistance ? colors.primary : colors.textMuted}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.checkboxTitle}>Entrance Ticket Assistance</Text>
            <Text style={styles.checkboxSub}>
              Ask the guide to help purchase tickets on arrival at the entrance gate.
            </Text>
          </View>
        </Touchable>
      </View>

      <View style={styles.section}>
        <TextField
          label="Meeting or Pickup address (optional)"
          value={pickupAddress}
          onChangeText={setPickupAddress}
          placeholder="e.g. Hotel lobby, Main Gate, Station"
          hint="Where the guide should meet your party."
        />
      </View>

      <View style={styles.section}>
        <TextField
          label="Notes or special requests (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. Language preference, mobility requirements"
        />
      </View>

      {/* Summary matching web BookingSummary */}
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>BOOKING SUMMARY</Text>
        <View style={styles.summaryDivider} />
        <InfoRow label="Guide" value={guide.full_name} />
        <InfoRow label="Type" value="Specific Guide" />
        <InfoRow
          label="Number of Travellers"
          value={`${people} ${people === 1 ? "person" : "persons"}`}
        />
        {ticketAssistance ? (
          <InfoRow label="Ticket Assistance" value="Requested" />
        ) : null}
        <View style={styles.summaryDivider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total Estimate</Text>
          <Text style={styles.totalValue}>
            {formatCurrency(guide.cost * Math.max(people, 1))}
          </Text>
        </View>
      </Card>

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
        This sends a direct booking request to {guide.full_name}. You can track confirmation under My bookings.
      </Text>
      </ScrollView>

      {/* 3. Universal BottomNavigation matching Web */}
      <DistrictBottomNav
        activeTab="guides"
        stateSlug={params.stateSlug}
        districtSlug={params.districtSlug}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.sm,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    ...typography.heading,
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  guideRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: { width: 56, height: 56 },
  guideBody: { flex: 1 },
  guideName: { ...typography.heading, color: colors.text },
  guidePlace: { ...typography.small, color: colors.textMuted, marginTop: 2 },
  section: { marginTop: spacing.xl },
  sectionTitle: { ...typography.subheading, color: colors.text, marginBottom: spacing.sm },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: { ...typography.bodyStrong, color: colors.text },
  checkboxCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkboxCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  checkboxTitle: { ...typography.bodyStrong, color: colors.text },
  checkboxSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  summaryCard: {
    marginTop: spacing.xl,
    padding: spacing.md,
    gap: spacing.xs,
  },
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
  submit: { marginTop: spacing.xxl },
  note: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});