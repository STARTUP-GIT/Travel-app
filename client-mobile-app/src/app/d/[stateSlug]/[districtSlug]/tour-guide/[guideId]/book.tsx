/**
 * Tour Guide booking form.
 *
 * Faithfully mirrors the customer web app's `GuideBookingSheet`:
 *   - ScreenHeader with back navigation
 *   - Guide profile attribution header
 *   - Tour Places selection with blue checkmark badges (all preselected by default)
 *   - Date and Time selection
 *   - Travellers (Adults & Children steppers)
 *   - Meeting point and alternative pickup request
 *   - Customer & Traveller details card
 *   - Transparent price calculation and Booking Summary
 *   - Full-width emerald "Book this guide" button
 */

import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Touchable } from "@/components/ui/pressable";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { useAuth } from "@/providers/auth-provider";
import { useDistrict } from "@/providers/district-provider";
import { useQuery } from "@/hooks/use-query";
import { findGuideInDistrict, listPackagesForDistrict } from "@/services/guides.service";
import { createTourGuideBooking } from "@/services/bookings.service";
import { formatCurrency } from "@/lib/utils/format";
import { colors, radius, spacing, typography } from "@/theme";
import { TopBar } from "@/components/shared/TopBar";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { DistrictBottomNav } from "@/components/shared/DistrictBottomNav";

export default function BookTourGuideScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isSignedIn, profile } = useAuth();
  const { district } = useDistrict();

  const params = useLocalSearchParams<{
    guideId?: string;
    stateSlug?: string;
    districtSlug?: string;
    packageId?: string;
  }>();

  const guideId = params.guideId ?? "";
  const packageId = params.packageId;

  const { data, loading } = useQuery(
    () => findGuideInDistrict(district!.id, guideId, "common"),
    [guideId, district?.id],
    { enabled: Boolean(district?.id && guideId) }
  );

  const [selectedPlaces, setSelectedPlaces] = useState<string[]>([]);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [bookingDate, setBookingDate] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  });
  const [bookingTime, setBookingTime] = useState("09:00 AM");
  const [isRequestingPickup, setIsRequestingPickup] = useState(false);
  const [requestedPickupName, setRequestedPickupName] = useState("");
  const [requestedPickupAddress, setRequestedPickupAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);
  const [matchedPackage, setMatchedPackage] = useState<any>(null);

  // Initialize selected places and load matched package when data loads
  useEffect(() => {
    if (!data || data.type !== "common" || !district?.id) return;
    void listPackagesForDistrict(district.id).then((packages) => {
      const found = packageId
        ? packages.find((p) => p.id === packageId)
        : packages.find((p) => p.guide.id === guideId) || packages[0];
      if (found) {
        setMatchedPackage(found);
        if (found.places && found.places.length > 0) {
          setSelectedPlaces(found.places.map((p) => p.id));
          return;
        }
      }
      setSelectedPlaces(data.places.map((p) => p.id));
    });
  }, [data, packageId, district?.id, guideId]);

  const isWholeTour = matchedPackage
    ? (matchedPackage.pricingMode || "WHOLE_TOUR") === "WHOLE_TOUR"
    : true;
  const isPerPerson = matchedPackage
    ? (matchedPackage.pricingUnit || "PER_TOUR") === "PER_PERSON"
    : true;
  const baseRate =
    matchedPackage?.price && matchedPackage.price > 0
      ? matchedPackage.price
      : (data?.type === "common" ? data.guide.cost : 0) || 0;

  // Calculate pricing matching web: whole tour flat rate per person or place-based
  const calculatedTotal = useMemo(() => {
    if (isWholeTour) {
      if (isPerPerson) {
        let childRate = baseRate;
        if (matchedPackage?.childDiscountType === "FREE") {
          childRate = 0;
        } else if (
          matchedPackage?.childDiscountType === "PERCENTAGE" &&
          matchedPackage?.childDiscountPercent
        ) {
          childRate = Math.max(
            0,
            Math.round(baseRate * (1 - matchedPackage.childDiscountPercent / 100))
          );
        } else if (
          matchedPackage?.childPrice !== null &&
          matchedPackage?.childPrice !== undefined &&
          matchedPackage?.childPrice > 0
        ) {
          childRate = matchedPackage.childPrice;
        }
        return baseRate * adults + childRate * children;
      }
      return baseRate;
    }
    return baseRate * Math.max(selectedPlaces.length, 1) * Math.max(adults, 1);
  }, [isWholeTour, isPerPerson, baseRate, adults, children, matchedPackage, selectedPlaces]);

  if (loading) return <LoadingState label="Loading tour guide…" />;

  if (!data || data.type !== "common") {
    return (
      <EmptyState
        title="Tour Guide not found"
        description="This tour guide is not listed in this district."
        icon="people-outline"
        action={{ label: "Go back", onPress: () => router.back() }}
      />
    );
  }

  const { guide, places } = data;
  const totalPeople = adults + children;

  function togglePlace(id: string) {
    setSelectedPlaces((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 1) {
          Alert.alert("Notice", "Select at least one place for your tour.");
          return prev;
        }
        return prev.filter((p) => p !== id);
      }
      return [...prev, id];
    });
  }

  async function handleSubmit() {
    if (!isSignedIn) {
      router.push("/login" as any);
      return;
    }

    if (!bookingDate) {
      Alert.alert("Missing Date", "Please pick a date for your tour.");
      return;
    }

    if (selectedPlaces.length === 0) {
      Alert.alert("No Places Selected", "Select at least one place.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await createTourGuideBooking({
        commonGuideId: guide.id,
        packageId: packageId || undefined,
        placeIds: selectedPlaces,
        bookingDate,
        bookingTime,
        numberOfPeople: totalPeople,
        numberOfAdults: adults,
        numberOfChildren: children,
        totalPrice: Math.round(calculatedTotal),
        requestedPickupName: isRequestingPickup ? requestedPickupName : undefined,
        requestedPickupAddress: isRequestingPickup ? requestedPickupAddress : undefined,
        notes: notes.trim() || undefined,
      });

      setConfirmedBookingId(result.id);
    } catch (err: any) {
      Alert.alert("Booking Failed", err?.message || "Could not complete booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      {/* 1. Universal TopBar matching Web */}
      <TopBar />

      {/* 2. Web ScreenHeader */}
      <ScreenHeader
        title={`Book ${guide.agencyName || guide.full_name}`}
        subtitle={
          isSignedIn
            ? `Booking as ${profile?.name ?? "you"}. The guide confirms before it's final.`
            : "Sign in to complete your booking."
        }
      />

      {confirmedBookingId ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.successBlock}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark-circle" size={54} color="#10b981" />
            </View>
            <Text style={styles.successTitle}>Booking Request Sent!</Text>
            <Text style={styles.successDesc}>
              Your tour request with {guide.agencyName || guide.full_name} has been submitted.
              The guide will confirm shortly.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.confirmedSummaryTitle}>Booking Summary</Text>
            <View style={styles.confirmedRow}>
              <Text style={styles.confirmedLabel}>Guide / Agency:</Text>
              <Text style={styles.confirmedVal}>{guide.agencyName || guide.full_name}</Text>
            </View>
            <View style={styles.confirmedRow}>
              <Text style={styles.confirmedLabel}>Date & Time:</Text>
              <Text style={styles.confirmedVal}>{bookingDate} at {bookingTime}</Text>
            </View>
            <View style={styles.confirmedRow}>
              <Text style={styles.confirmedLabel}>Travellers:</Text>
              <Text style={styles.confirmedVal}>{totalPeople} ({adults} Adult{adults > 1 ? "s" : ""}, {children} Child{children !== 1 ? "ren" : ""})</Text>
            </View>
            <View style={styles.confirmedRow}>
              <Text style={styles.confirmedLabel}>Tour Places:</Text>
              <Text style={styles.confirmedVal}>{selectedPlaces.length} places selected</Text>
            </View>
            <View style={styles.confirmedRow}>
              <Text style={styles.confirmedLabel}>Total Estimate:</Text>
              <Text style={[styles.confirmedVal, { color: colors.primary, fontWeight: "800" }]}>
                {formatCurrency(calculatedTotal)}
              </Text>
            </View>
          </View>

          <Touchable
            onPress={() => router.push("/bookings")}
            style={[styles.confirmEmeraldBtn, { marginTop: spacing.md }]}
          >
            <Text style={styles.confirmEmeraldBtnText}>View All My Bookings</Text>
          </Touchable>
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Guide Attribution Card */}
          <View style={styles.guideCard}>
            {guide.profile_pic ? (
              <Image source={{ uri: guide.profile_pic }} style={styles.guideAvatar} />
            ) : (
              <View style={styles.guideAvatarFallback}>
                <Text style={styles.guideAvatarInitial}>
                  {(guide.agencyName || guide.full_name).charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.guideMeta}>
              <Text style={styles.guideName}>{guide.agencyName || guide.full_name}</Text>
              <Text style={styles.guideSub}>Guide: {guide.full_name}</Text>
              <Text style={styles.guideRate}>
                {formatCurrency(guide.cost)} per place / person
              </Text>
            </View>
          </View>

          {/* Section 1: Tour Places with Blue Checkmark Circles */}
          {places.length > 0 ? (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="location-outline" size={16} color={colors.primary} />
                  <Text style={styles.sectionTitle}>
                    Tour Places ({selectedPlaces.length}/{places.length} selected)
                  </Text>
                </View>
                <Text style={styles.sectionNote}>Customize stops if desired</Text>
              </View>

              <View style={styles.stopsStack}>
                {places.map((place, idx) => {
                  const isSelected = selectedPlaces.includes(place.id);
                  return (
                    <Touchable
                      key={place.id}
                      onPress={() => togglePlace(place.id)}
                      style={[
                        styles.stopSelectCard,
                        isSelected && styles.stopSelectCardActive,
                      ]}
                    >
                      <View style={styles.stopSelectLeft}>
                        {place.images?.[0] ? (
                          <Image source={{ uri: place.images[0] }} style={styles.placeThumb} />
                        ) : (
                          <View style={styles.stopNumberCircle}>
                            <Text style={styles.stopNumberCircleText}>{idx + 1}</Text>
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.stopSelectName}>{place.name}</Text>
                          <Text style={styles.stopSelectDistrict}>
                            {place.districtName} {place.category ? `· ${place.category}` : ""}
                          </Text>
                        </View>
                      </View>
                      <View
                        style={[
                          styles.checkmarkCircle,
                          isSelected && styles.checkmarkCircleActive,
                        ]}
                      >
                        {isSelected ? (
                          <Ionicons name="checkmark" size={14} color="#ffffff" />
                        ) : null}
                      </View>
                    </Touchable>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Section 2: Date & Time Selection */}
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>Select Date & Start Time</Text>
            </View>
            <View style={styles.inputGrid2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputSublabel}>Tour Date</Text>
                <View style={styles.dateInputWrap}>
                  <TextInput
                    value={bookingDate}
                    onChangeText={setBookingDate}
                    placeholder="DD-MM-YYYY"
                    style={styles.textInputInWrap}
                  />
                  <Ionicons name="calendar" size={16} color={colors.textMuted} />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputSublabel}>Preferred Time</Text>
                <TextInput
                  value={bookingTime}
                  onChangeText={setBookingTime}
                  placeholder="09:00 AM"
                  style={styles.textInput}
                />
              </View>
            </View>
          </View>

          {/* Section 3: Number of Travellers */}
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="people-outline" size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>Number of Travellers</Text>
            </View>
            <View style={styles.travellersRow}>
              <View style={styles.stepperCard}>
                <View>
                  <Text style={styles.stepperTitle}>Adults</Text>
                  <Text style={styles.stepperSub}>Age 11+</Text>
                </View>
                <View style={styles.stepperControls}>
                  <Touchable
                    onPress={() => setAdults(Math.max(1, adults - 1))}
                    style={styles.stepBtn}
                  >
                    <Text style={styles.stepBtnText}>-</Text>
                  </Touchable>
                  <Text style={styles.stepCount}>{adults}</Text>
                  <Touchable
                    onPress={() => setAdults(adults + 1)}
                    style={styles.stepBtn}
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </Touchable>
                </View>
              </View>

              <View style={styles.stepperCard}>
                <View>
                  <Text style={styles.stepperTitle}>Children</Text>
                  <Text style={styles.stepperSub}>Under 11 yrs</Text>
                </View>
                <View style={styles.stepperControls}>
                  <Touchable
                    onPress={() => setChildren(Math.max(0, children - 1))}
                    style={styles.stepBtn}
                  >
                    <Text style={styles.stepBtnText}>-</Text>
                  </Touchable>
                  <Text style={styles.stepCount}>{children}</Text>
                  <Touchable
                    onPress={() => setChildren(children + 1)}
                    style={styles.stepBtn}
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </Touchable>
                </View>
              </View>
            </View>
          </View>

          {/* Section 4: Meeting Point & Pickup Request */}
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="location-outline" size={16} color={colors.primary} />
              <Text style={styles.sectionTitle}>Meeting Point & Pickup</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.pickupTitle}>
                {guide.agencyAddress || `${district?.name ?? "City"} Central Meeting Point`}
              </Text>
              <Text style={styles.pickupSub}>
                Your guide will contact you to coordinate exact arrival coordinates.
              </Text>

              <Touchable
                onPress={() => setIsRequestingPickup(!isRequestingPickup)}
                style={styles.pickupCheckboxRow}
              >
                <View
                  style={[
                    styles.customCheckbox,
                    isRequestingPickup && styles.customCheckboxActive,
                  ]}
                >
                  {isRequestingPickup ? (
                    <Ionicons name="checkmark" size={12} color="#ffffff" />
                  ) : null}
                </View>
                <Text style={styles.pickupCheckboxText}>
                  Request alternative pickup point (Hotel / Airport / Station)
                </Text>
              </Touchable>

              {isRequestingPickup ? (
                <View style={{ marginTop: spacing.xs, gap: spacing.xs }}>
                  <TextInput
                    value={requestedPickupName}
                    onChangeText={setRequestedPickupName}
                    placeholder="Pickup location name (e.g. Hotel Lobby)"
                    style={styles.textInput}
                  />
                  <TextInput
                    value={requestedPickupAddress}
                    onChangeText={setRequestedPickupAddress}
                    placeholder="Pickup street address or landmark"
                    style={styles.textInput}
                  />
                </View>
              ) : null}
            </View>
          </View>

          {/* Section: Tour Package Inclusions (Circled in red in web comparison) */}
          <View style={styles.sectionWrap}>
            <View style={styles.inclusionsCard}>
              <Text style={styles.inclusionsTitle}>Tour Package Inclusions:</Text>
              <View style={styles.inclusionsGrid}>
                <View style={styles.inclusionBox}>
                  <Text style={styles.inclusionSub}>Meals</Text>
                  <Text style={styles.inclusionVal}>
                    {matchedPackage?.foodStatus === "INCLUDED" || matchedPackage?.mealsService === "INCLUDED"
                      ? "Included"
                      : "Pay Separately"}
                  </Text>
                </View>
                <View style={styles.inclusionBox}>
                  <Text style={styles.inclusionSub}>Transport</Text>
                  <Text style={styles.inclusionVal}>
                    {matchedPackage?.transportService === "INCLUDED" || matchedPackage?.transportStatus === "INCLUDED"
                      ? "Included in package"
                      : "Included in package"}
                  </Text>
                </View>
                <View style={styles.inclusionBox}>
                  <Text style={styles.inclusionSub}>Entry Tickets</Text>
                  <Text style={styles.inclusionVal}>
                    {matchedPackage?.entryFeeStatus === "INCLUDED"
                      ? "Included"
                      : "Pay at Gate"}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Section 5: Customer Details */}
          <View style={styles.sectionWrap}>
            <View style={styles.customerCard}>
              <View style={styles.customerCardHeader}>
                <Ionicons name="people-outline" size={15} color={colors.primary} />
                <Text style={styles.customerCardHeaderText}>
                  CUSTOMER & TRAVELLER DETAILS
                </Text>
              </View>

              <View style={styles.customerGrid}>
                <View style={styles.customerCol}>
                  <Text style={styles.customerMetaLabel}>Customer Name</Text>
                  <Text style={styles.customerMetaVal}>
                    {profile?.name || "Traveller"}
                  </Text>
                </View>
                <View style={styles.customerCol}>
                  <Text style={styles.customerMetaLabel}>Email Address</Text>
                  <Text style={styles.customerMetaVal}>
                    {profile?.email || (isSignedIn ? "Signed in" : "Not signed in")}
                  </Text>
                </View>
                <View style={styles.customerCol}>
                  <Text style={styles.customerMetaLabel}>Phone Number</Text>
                  <Text style={styles.customerMetaVal}>
                    {profile?.phonenumber || "Not provided in profile"}
                  </Text>
                </View>
                <View style={styles.customerCol}>
                  <Text style={styles.customerMetaLabel}>Traveller Breakdown</Text>
                  <Text style={styles.customerMetaVal}>
                    {adults} Adult(s){children > 0 ? `, ${children} Child(ren)` : ""}
                  </Text>
                </View>
              </View>

              <View style={{ marginTop: spacing.xs }}>
                <Text style={styles.customerMetaLabel}>
                  Special Requests / Tour Notes (Optional)
                </Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="e.g. Elderly traveller needing gentle walking pace, preferred pickup landmark, language preference..."
                  multiline
                  numberOfLines={2}
                  style={[styles.textInput, { height: 60, textAlignVertical: "top", marginTop: 4 }]}
                />
              </View>
            </View>
          </View>

          {/* Section 6: Price Breakdown Card */}
          <View style={styles.sectionWrap}>
            <View style={styles.card}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Pricing Model</Text>
                <Text style={styles.summaryValue}>
                  {isWholeTour ? "Whole Tour Flat Rate" : "Place-based rate"} (
                  {isPerPerson ? "Per Person" : "Per Group"})
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Base Tour Package</Text>
                <Text style={styles.summaryValue}>{formatCurrency(baseRate)}</Text>
              </View>
              {isPerPerson && totalPeople > 1 ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>
                    Traveller Multiplier ({totalPeople} people)
                  </Text>
                  <Text style={styles.summaryValue}>× {totalPeople}</Text>
                </View>
              ) : null}

              <View style={styles.summaryTotalRow}>
                <View>
                  <Text style={styles.summaryTotalLabel}>Estimated Total</Text>
                  <Text style={styles.summaryTotalSub}>
                    No upfront card charge · Confirmed directly with guide
                  </Text>
                </View>
                <Text style={styles.summaryTotalAmount}>
                  {formatCurrency(calculatedTotal)}
                </Text>
              </View>
            </View>
            <Text style={styles.cancellationTermsNote}>
              Free cancellation up to 24h before trip start
            </Text>
          </View>

          {/* Confirm Booking Emerald Button */}
          <Touchable
            onPress={handleSubmit}
            disabled={submitting}
            style={styles.confirmEmeraldBtn}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.confirmEmeraldBtnText}>
                Confirm Booking — {formatCurrency(calculatedTotal)}
              </Text>
            )}
          </Touchable>
        </ScrollView>
      )}

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
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: spacing.lg,
  },
  guideCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  guideAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  guideAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },
  guideAvatarInitial: {
    color: "#1d4ed8",
    fontWeight: "700",
    fontSize: 20,
  },
  guideMeta: {
    flex: 1,
    gap: 2,
  },
  guideName: {
    ...typography.bodyStrong,
    fontSize: 15,
    color: colors.text,
  },
  guideSub: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
  guideRate: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  sectionWrap: {
    gap: spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.text,
  },
  sectionNote: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  stopsStack: {
    gap: 8,
  },
  stopSelectCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.sm,
    backgroundColor: colors.surface,
  },
  stopSelectCardActive: {
    borderColor: "rgba(37, 99, 235, 0.4)",
    backgroundColor: "rgba(37, 99, 235, 0.04)",
  },
  stopSelectLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  placeThumb: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
  },
  stopNumberCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },
  stopNumberCircleText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  stopSelectName: {
    ...typography.bodyStrong,
    fontSize: 13,
    color: colors.text,
  },
  stopSelectDistrict: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  checkmarkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmarkCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  inputGrid2: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  inputSublabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.text,
    backgroundColor: colors.background,
  },
  dateInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.background,
  },
  textInputInWrap: {
    flex: 1,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.text,
  },
  travellersRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  stepperCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
  },
  stepperTitle: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.text,
  },
  stepperSub: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
  },
  stepperControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  stepBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    lineHeight: 18,
  },
  stepCount: {
    ...typography.bodyStrong,
    fontSize: 14,
    minWidth: 16,
    textAlign: "center",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  pickupTitle: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.text,
  },
  pickupSub: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  pickupCheckboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    marginTop: 4,
  },
  customCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  customCheckboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pickupCheckboxText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.text,
    flex: 1,
  },
  inclusionsCard: {
    backgroundColor: "rgba(0, 0, 0, 0.02)",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  inclusionsTitle: {
    ...typography.bodyStrong,
    fontSize: 13,
    color: colors.text,
    fontWeight: "700",
  },
  inclusionsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  inclusionBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 3,
  },
  inclusionSub: {
    ...typography.caption,
    fontSize: 10.5,
    color: colors.textMuted,
  },
  inclusionVal: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
  },
  cancellationTermsNote: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  customerCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  customerCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
  },
  customerCardHeaderText: {
    ...typography.caption,
    fontWeight: "700",
    fontSize: 11,
    color: colors.text,
    letterSpacing: 0.5,
  },
  customerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
  },
  customerCol: {
    width: "50%",
    gap: 2,
  },
  customerMetaLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
  },
  customerMetaVal: {
    ...typography.caption,
    color: colors.text,
    fontWeight: "600",
    fontSize: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
  summaryValue: {
    ...typography.caption,
    color: colors.text,
    fontWeight: "600",
    fontSize: 12,
  },
  summaryTotalRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryTotalLabel: {
    ...typography.bodyStrong,
    fontSize: 15,
    color: colors.text,
  },
  summaryTotalSub: {
    ...typography.caption,
    fontSize: 10.5,
    color: colors.textMuted,
  },
  summaryTotalAmount: {
    ...typography.heading,
    fontSize: 22,
    fontWeight: "800",
    color: colors.primary,
  },
  confirmEmeraldBtn: {
    backgroundColor: "#059669",
    borderRadius: radius.xl,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: { shadowColor: "#059669", shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 3 },
    }),
  },
  confirmEmeraldBtnText: {
    ...typography.bodyStrong,
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  successBlock: {
    alignItems: "center",
    gap: 8,
    paddingVertical: spacing.md,
  },
  successIconWrap: {
    marginBottom: 4,
  },
  successTitle: {
    ...typography.title,
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  successDesc: {
    ...typography.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
  confirmedSummaryTitle: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.text,
    marginBottom: 4,
  },
  confirmedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  confirmedLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
  },
  confirmedVal: {
    ...typography.caption,
    color: colors.text,
    fontWeight: "600",
    fontSize: 12,
  },
});
