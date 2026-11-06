/**
 * Tour Guide booking form.
 *
 * Posts to `POST /users/booking/api/common-guide-bookings`.
 * Supports preselected packages, customized place selection, adult/child counts,
 * meeting/pickup location, and notes.
 */

import { useEffect, useState } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, InfoRow } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { RemoteImage } from "@/components/ui/remote-image";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { Touchable } from "@/components/ui/pressable";
import { useAuth } from "@/providers/auth-provider";
import { useToast } from "@/providers/toast-provider";
import { useDistrict } from "@/providers/district-provider";
import { useQuery } from "@/hooks/use-query";
import { findGuideInDistrict, listPackagesForDistrict } from "@/services/guides.service";
import { createTourGuideBooking } from "@/services/bookings.service";
import { formatDate, formatCurrency, toIsoDateOnly } from "@/lib/utils/format";
import { toUserMessage } from "@/lib/api/client";
import { colors, radii, spacing, TOUR_GUIDE_LABEL, typography } from "@/theme";

export default function BookTourGuideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { status } = useAuth();
  const { district } = useDistrict();

  const params = useLocalSearchParams<{
    guideId?: string;
    stateSlug?: string;
    districtSlug?: string;
    packageId?: string;
  }>();

  const guideId = params.guideId ?? "";
  const packageId = params.packageId;
  const returnTo = `/d/${params.stateSlug ?? ""}/${params.districtSlug ?? ""}/tour-guide/${guideId}/book${
    packageId ? `?packageId=${packageId}` : ""
  }`;

  const { data, loading } = useQuery(
    () => findGuideInDistrict(district!.id, guideId, "common"),
    [guideId, district?.id],
    { enabled: Boolean(district?.id && guideId) },
  );

  const [matchedPackage, setMatchedPackage] = useState<any>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [pickupAddress, setPickupAddress] = useState("");
  const [notes, setNotes] = useState("");

  const [date, setDate] = useState<Date>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  });
  const [time, setTime] = useState("09:00");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load package details if packageId was passed in params
  useEffect(() => {
    if (!packageId || !district?.id) return;
    void listPackagesForDistrict(district.id).then((packages) => {
      const found = packages.find((p) => p.id === packageId);
      if (found) {
        setMatchedPackage(found);
        // Pre-select the package places
        const ids = found.places.map((p) => p.id);
        if (ids.length > 0) setSelected(ids);
      }
    });
  }, [packageId, district?.id]);

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
        packageId: packageId || undefined,
        placeIds: selected,
        bookingDate: toIsoDateOnly(date),
        bookingTime: time.trim() || undefined,
        tripStartTime: time.trim() || undefined,
        numberOfAdults: adults,
        numberOfChildren: children,
        numberOfPeople: adults + children,
        requestedPickupAddress: pickupAddress.trim() || undefined,
        notes: notes.trim() || undefined,
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
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.guideHeader}>
        <RemoteImage
          uri={guide.profile_pic ?? null}
          style={styles.avatar}
          fallbackLabel={guide.agencyName || guide.full_name}
          radius={radii.pill}
        />
        <View style={styles.guideHeaderText}>
          <Text style={styles.heading}>{guide.agencyName || guide.full_name}</Text>
          {guide.agencyName && guide.full_name ? (
            <Text style={styles.leadGuide}>Guide: {guide.full_name}</Text>
          ) : null}
        </View>
      </View>

      {matchedPackage ? (
        <Card style={styles.packageCard}>
          <View style={styles.packageBadgeRow}>
            <Ionicons name="gift-outline" size={18} color={colors.primary} />
            <Text style={styles.packageBadgeText}>Selected Package</Text>
          </View>
          <Text style={styles.packageTitle}>{matchedPackage.name}</Text>
          {matchedPackage.description ? (
            <Text style={styles.packageDesc}>{matchedPackage.description}</Text>
          ) : null}
        </Card>
      ) : null}

      <Text style={styles.sectionTitle}>
        Choose tour places ({selected.length} selected)
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

      {/* Date */}
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

      {/* Time */}
      <View style={styles.section}>
        <TextField
          label="Preferred start time"
          value={time}
          onChangeText={setTime}
          placeholder="09:00"
          hint="24-hour time, for example 09:00."
        />
      </View>

      {/* Travellers: Adults & Children */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Travellers</Text>
        <View style={styles.stepperContainer}>
          <View style={styles.stepperItem}>
            <Text style={styles.stepperLabel}>Adults</Text>
            <View style={styles.stepperRow}>
              <Touchable
                onPress={() => setAdults((curr) => Math.max(1, curr - 1))}
                style={styles.stepperBtn}
                accessibilityRole="button"
                accessibilityLabel="Decrease adults"
              >
                <Ionicons name="remove" size={18} color={adults > 1 ? colors.text : colors.textMuted} />
              </Touchable>
              <Text style={styles.stepperValue}>{adults}</Text>
              <Touchable
                onPress={() => setAdults((curr) => Math.min(25, curr + 1))}
                style={styles.stepperBtn}
                accessibilityRole="button"
                accessibilityLabel="Increase adults"
              >
                <Ionicons name="add" size={18} color={adults < 25 ? colors.text : colors.textMuted} />
              </Touchable>
            </View>
          </View>

          <View style={styles.stepperItem}>
            <Text style={styles.stepperLabel}>Children</Text>
            <View style={styles.stepperRow}>
              <Touchable
                onPress={() => setChildren((curr) => Math.max(0, curr - 1))}
                style={styles.stepperBtn}
                accessibilityRole="button"
                accessibilityLabel="Decrease children"
              >
                <Ionicons name="remove" size={18} color={children > 0 ? colors.text : colors.textMuted} />
              </Touchable>
              <Text style={styles.stepperValue}>{children}</Text>
              <Touchable
                onPress={() => setChildren((curr) => Math.min(20, curr + 1))}
                style={styles.stepperBtn}
                accessibilityRole="button"
                accessibilityLabel="Increase children"
              >
                <Ionicons name="add" size={18} color={children < 20 ? colors.text : colors.textMuted} />
              </Touchable>
            </View>
          </View>
        </View>
      </View>

      {/* Pickup address */}
      <View style={styles.section}>
        <TextField
          label="Pickup / Hotel address (optional)"
          value={pickupAddress}
          onChangeText={setPickupAddress}
          placeholder="e.g. Hotel name and street"
          hint="Where the tour vehicle should pick your party up."
        />
      </View>

      {/* Special requests */}
      <View style={styles.section}>
        <TextField
          label="Notes or special requests (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="e.g. Dietary preferences, language, senior citizens"
        />
      </View>

      <Card style={styles.summary}>
        <Text style={styles.summaryText}>
          {selected.length === 0
            ? "Select at least one place to request a tour."
            : `${guide.agencyName || guide.full_name} · ${selected.length} ${
                selected.length === 1 ? "place" : "places"
              } · ${adults} Adults${children > 0 ? `, ${children} Children` : ""} · ${formatDate(date)}`}
        </Text>
      </Card>

      <Button
        label="Request tour booking"
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
  guideHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  avatar: { width: 56, height: 56 },
  guideHeaderText: { flex: 1 },
  heading: { ...typography.heading, color: colors.text },
  leadGuide: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  packageCard: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  packageBadgeRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  packageBadgeText: { ...typography.caption, color: colors.primary, fontWeight: "700" },
  packageTitle: { ...typography.bodyStrong, color: colors.text, marginTop: spacing.xs },
  packageDesc: { ...typography.small, color: colors.textSecondary, marginTop: spacing.xs },
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
  stepperContainer: { flexDirection: "row", gap: spacing.md },
  stepperItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  stepperLabel: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.xs },
  stepperRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: { ...typography.bodyStrong, color: colors.text },
  summary: { marginTop: spacing.xl, backgroundColor: colors.surfaceMuted },
  summaryText: { ...typography.small, color: colors.textSecondary },
  submit: { marginTop: spacing.lg },
});