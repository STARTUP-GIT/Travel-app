/**
 * Tour package detail.
 *
 * Faithfully mirrors `frontend/features/guides/ui/package-detail.tsx`
 * and `package-booking-modal.tsx`:
 *   - ScreenHeader with back navigation, package title, and stops subtitle
 *   - Agency cover banner (if configured) with gradient overlay
 *   - Guide & Agency Card with avatar, credentials, experience & language pills, "View guide" button
 *   - Pricing & Key Metrics badges row (stops, price, duration, group size, start time, child rules)
 *   - Full-width emerald "Book this tour — ₹..." button
 *   - Pickup & Departure Location section with meeting place & external Google Maps link
 *   - Facilities & Inclusions section (Meals, Transport with Private/Shared vehicle breakdown, Entry Fees)
 *   - Specific Guide accompaniment section
 *   - Children & Age Policies section
 *   - Itinerary & Stops Arrangement with numbered badges, photos, visit arrangement tags, duration & entry pricing
 *   - Cancellation Policy & Customer Reviews
 *   - Exact 1:1 replica of the Web Booking Modal (`PackageBookingModal`)
 */

import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
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
import { useDistrict } from "@/providers/district-provider";
import { useQuery } from "@/hooks/use-query";
import { useAuth } from "@/providers/auth-provider";
import { listPackagesForDistrict, type DistrictPackage, type PlaceContext } from "@/services/guides.service";
import { createCommonGuideBooking } from "@/services/bookings.service";
import { colors, radius, spacing, typography } from "@/theme";
import { formatCurrency } from "@/lib/utils/format";
import { TopBar } from "@/components/shared/TopBar";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { DistrictBottomNav } from "@/components/shared/DistrictBottomNav";

export default function TourPackageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { district } = useDistrict();
  const { isSignedIn, profile } = useAuth();

  const params = useLocalSearchParams<{
    packageId?: string;
    guideId?: string;
    stateSlug?: string;
    districtSlug?: string;
  }>();

  const packageId = params.packageId ?? "";
  const guideId = params.guideId ?? "";
  const stateSlug = params.stateSlug ?? "";
  const districtSlug = params.districtSlug ?? "";
  const districtBase = `/d/${stateSlug}/${districtSlug}`;

  const { data: pkg, loading } = useQuery(
    async () => {
      const packages = await listPackagesForDistrict(district!.id);
      return (
        packages.find(
          (p) => p.id === packageId && (!guideId || p.guide.id === guideId)
        ) ?? null
      );
    },
    [packageId, guideId, district?.id],
    { enabled: Boolean(district?.id && packageId) }
  );

  // Booking Modal State
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  });
  const [bookingTime, setBookingTime] = useState("09:00 AM");
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [selectedPlaceIds, setSelectedPlaceIds] = useState<string[]>([]);
  const [isRequestingPickup, setIsRequestingPickup] = useState(false);
  const [requestedPickupName, setRequestedPickupName] = useState("");
  const [requestedPickupAddress, setRequestedPickupAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);

  React.useEffect(() => {
    if (pkg) {
      if (pkg.tripStartTime) {
        setBookingTime(pkg.tripStartTime);
      }
      setSelectedPlaceIds(pkg.places.map((p) => p.id));
    }
  }, [pkg]);

  if (loading) return <LoadingState label="Loading package…" />;

  if (!pkg) {
    return (
      <EmptyState
        title="Package unavailable"
        description="This package is not offered for any place in this district."
        icon="map-outline"
        action={{ label: "Go back", onPress: () => router.back() }}
      />
    );
  }

  const person = pkg.guide;
  const hiddenPlaceCount = Math.max(0, (pkg.placeCount ?? pkg.places.length) - pkg.places.length);
  const isWholeTour = (pkg.pricingMode || "WHOLE_TOUR") === "WHOLE_TOUR";
  const displayPrice = isWholeTour ? (pkg.price ?? person.cost) : person.cost;
  const isPerPerson = (pkg.pricingUnit || "PER_TOUR") === "PER_PERSON";
  const canDeselectPlaces = pkg.allowCustomerPlaceSelection !== false;
  const maxCapacity = pkg.maxGroupSize ?? 10;
  const totalPeople = adults + children;

  const pickupMapsTarget = pkg.pickupMapsUrl
    ? pkg.pickupMapsUrl
    : pkg.pickupAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pkg.pickupAddress)}`
    : null;

  function togglePlace(placeId: string) {
    if (!canDeselectPlaces) return;
    setSelectedPlaceIds((prev) => {
      if (prev.includes(placeId)) {
        if (prev.length <= 1) return prev;
        return prev.filter((id) => id !== placeId);
      }
      return [...prev, placeId];
    });
  }

  function priceSummary(place: PlaceContext): string {
    const pricing = place.pricing ?? [];
    if (pricing.length > 0) {
      const adultDomestic = pricing.find(
        (band) => band.visitor === "DOMESTIC" && band.ageGroup.toLowerCase() === "adult"
      );
      const adultForeign = pricing.find(
        (band) => band.visitor === "FOREIGN" && band.ageGroup.toLowerCase() === "adult"
      );

      if (adultDomestic || adultForeign) {
        return [
          adultDomestic ? `Indian: ${formatCurrency(adultDomestic.amount)}` : "Indian: —",
          adultForeign ? `Foreign: ${formatCurrency(adultForeign.amount)}` : "Foreign: —",
        ].join(" · ");
      }

      const cheapest = Math.min(...pricing.map((band) => band.amount));
      return `From ${formatCurrency(cheapest)}`;
    }

    return place.entryfee === null || place.entryfee === undefined
      ? "Free entry"
      : (formatCurrency(place.entryfee) ?? "Free entry");
  }

  // Price calculation for modal
  const calculatedTotal = (() => {
    const base = pkg.price && pkg.price > 0 ? pkg.price : (person.cost || 0);
    if (isWholeTour) {
      if (isPerPerson) {
        let childRate = base;
        if (pkg.childDiscountType === "FREE") {
          childRate = 0;
        } else if (pkg.childDiscountType === "PERCENTAGE" && pkg.childDiscountPercent) {
          childRate = Math.max(0, Math.round(base * (1 - pkg.childDiscountPercent / 100)));
        } else if (pkg.childPrice && pkg.childPrice > 0) {
          childRate = pkg.childPrice;
        }
        return base * adults + childRate * children;
      }
      return base;
    } else {
      const placeSum = selectedPlaceIds.reduce((sum, pid) => {
        const pl = pkg.places.find((p) => p.id === pid);
        return sum + ((pl as any)?.price ?? base);
      }, 0);
      if (isPerPerson) {
        return placeSum * (adults + children);
      }
      return placeSum;
    }
  })();

  async function handleBookTour() {
    if (!isSignedIn) {
      setBookingOpen(false);
      router.push("/login" as any);
      return;
    }

    if (!pkg) return;

    if (!bookingDate) {
      Alert.alert("Missing Date", "Please select a tour date.");
      return;
    }

    if (selectedPlaceIds.length === 0) {
      Alert.alert("No Stops Selected", "Please select at least one tour stop.");
      return;
    }

    setBookingSubmitting(true);
    try {
      const result = await createCommonGuideBooking({
        commonGuideId: person.id,
        packageId: pkg.id,
        placeIds: selectedPlaceIds,
        bookingDate,
        bookingTime,
        tripStartTime: bookingTime,
        numberOfPeople: totalPeople,
        numberOfAdults: adults,
        numberOfChildren: children,
        pricingMode: pkg.pricingMode || "WHOLE_TOUR",
        pricingUnit: pkg.pricingUnit || "PER_TOUR",
        totalPrice: Math.round(calculatedTotal),
        pickupName: pkg.pickupName || undefined,
        pickupAddress: pkg.pickupAddress || undefined,
        pickupMapsUrl: pkg.pickupMapsUrl || undefined,
        requestedPickupName: isRequestingPickup ? requestedPickupName : undefined,
        requestedPickupAddress: isRequestingPickup ? requestedPickupAddress : undefined,
        notes: notes.trim() || undefined,
      });

      setConfirmedBookingId(result.id);
    } catch (err: any) {
      Alert.alert("Booking Failed", err?.message || "Could not complete booking. Please try again.");
    } finally {
      setBookingSubmitting(false);
    }
  }

  return (
    <View style={styles.root}>
      {/* 1. Universal TopBar matching Web */}
      <TopBar />

      {/* 2. Web ScreenHeader */}
      <ScreenHeader
        title={pkg.name}
        subtitle={
          person.agencyName
            ? `${pkg.placeCount} stops · ${person.agencyName} with ${person.full_name}`
            : `${pkg.placeCount} stops · guided by ${person.full_name}`
        }
        backHref={`${districtBase}/guides/${person.id}`}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Agency Cover Banner (if configured) */}
        {person.agencyBanner ? (
          <View style={styles.bannerContainer}>
            <Image source={{ uri: person.agencyBanner }} style={styles.bannerImage} />
            <View style={styles.bannerOverlay} />
            <View style={styles.bannerTextWrap}>
              {person.agencyName ? (
                <View style={styles.bannerBadge}>
                  <Ionicons name="business-outline" size={12} color="#ffffff" />
                  <Text style={styles.bannerBadgeText}>{person.agencyName}</Text>
                </View>
              ) : null}
              <Text style={styles.bannerTitle}>{pkg.name}</Text>
            </View>
          </View>
        ) : null}

        {/* Guide & Agency Card */}
        <View style={styles.card}>
          <View style={styles.guideHeaderRow}>
            {person.profile_pic ? (
              <Image source={{ uri: person.profile_pic }} style={styles.guideAvatar} />
            ) : (
              <View style={styles.guideAvatarFallback}>
                <Text style={styles.avatarInitial}>
                  {(person.agencyName || person.full_name).charAt(0).toUpperCase()}
                </Text>
              </View>
            )}

            <View style={styles.guideHeaderMeta}>
              <Text style={styles.guideAgencyName} numberOfLines={1}>
                {person.agencyName ?? person.full_name}
              </Text>
              <Text style={styles.guideLeadText} numberOfLines={1}>
                {person.agencyName
                  ? `Tour led by ${person.full_name}${person.tagline ? " · " + person.tagline : ""}`
                  : (person.tagline ?? "Local expert guide")}
              </Text>
              <View style={styles.guideCredentialsRow}>
                {typeof person.rating === "number" && person.rating > 0 ? (
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={12} color="#f59e0b" />
                    <Text style={styles.ratingText}>{person.rating.toFixed(1)}</Text>
                  </View>
                ) : null}
                <View style={styles.credItem}>
                  <Ionicons name="ribbon-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.credText}>{person.experience} yrs exp</Text>
                </View>
                <View style={styles.credItem}>
                  <Ionicons name="language-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.credText}>
                    {person.language?.join(", ") ?? "English"}
                  </Text>
                </View>
              </View>
            </View>

            <Touchable
              onPress={() => router.push(`${districtBase}/tour-guide/${person.id}`)}
              style={styles.viewGuideBtn}
            >
              <Text style={styles.viewGuideBtnText}>View guide</Text>
            </Touchable>
          </View>

          {pkg.description ? (
            <Text style={styles.pkgDescription}>{pkg.description}</Text>
          ) : null}

          {/* Pricing & Key Metrics Badges */}
          <View style={styles.badgeRow}>
            <View style={styles.badgeSuccess}>
              <Ionicons name="git-branch-outline" size={12} color="#15803d" />
              <Text style={styles.badgeSuccessText}>
                {pkg.placeCount} {pkg.placeCount === 1 ? "stop" : "stops"} included
              </Text>
            </View>

            <View style={styles.badgeInfo}>
              <Ionicons name="ticket-outline" size={12} color="#1d4ed8" />
              <Text style={styles.badgeInfoText}>
                {formatCurrency(displayPrice)}{" "}
                {isWholeTour
                  ? pkg.pricingUnit === "PER_PERSON"
                    ? "per person (whole tour)"
                    : "whole tour (flat rate)"
                  : pkg.pricingUnit === "PER_PERSON"
                  ? "per place / person"
                  : "per place"}
              </Text>
            </View>

            {pkg.duration ? (
              <View style={styles.badgeOutline}>
                <Ionicons name="time-outline" size={12} color={colors.primary} />
                <Text style={styles.badgeOutlineText}>{pkg.duration}</Text>
              </View>
            ) : null}

            {pkg.maxGroupSize ? (
              <View style={styles.badgeOutline}>
                <Ionicons name="people-outline" size={12} color={colors.primary} />
                <Text style={styles.badgeOutlineText}>Max {pkg.maxGroupSize} guests</Text>
              </View>
            ) : null}

            {pkg.tripStartTime ? (
              <View style={styles.badgeOutline}>
                <Ionicons name="time-outline" size={12} color={colors.primary} />
                <Text style={styles.badgeOutlineText}>Starts at {pkg.tripStartTime}</Text>
              </View>
            ) : null}

            {pkg.childrenAllowed !== false ? (
              <View style={styles.badgeOutline}>
                <Ionicons name="happy-outline" size={12} color={colors.primary} />
                <Text style={styles.badgeOutlineText}>
                  Children up to {pkg.childMaxAge || 11}y
                </Text>
              </View>
            ) : (
              <View style={styles.badgeDestructive}>
                <Ionicons name="alert-circle-outline" size={12} color="#b91c1c" />
                <Text style={styles.badgeDestructiveText}>Adults only</Text>
              </View>
            )}
          </View>

          {hiddenPlaceCount > 0 ? (
            <View style={styles.hiddenCountBanner}>
              <Text style={styles.hiddenCountText}>
                {hiddenPlaceCount} more {hiddenPlaceCount === 1 ? "stop" : "stops"} of this tour{" "}
                {hiddenPlaceCount === 1 ? "is" : "are"} in other districts. Booking from here covers
                the {pkg.places.length} below.
              </Text>
            </View>
          ) : null}

          {/* Book Tour Emerald Button */}
          {pkg.places.length > 0 ? (
            <Touchable
              onPress={() => setBookingOpen(true)}
              style={styles.bookEmeraldButton}
            >
              <Text style={styles.bookEmeraldButtonText}>
                Book this tour — {formatCurrency(displayPrice)}
              </Text>
            </Touchable>
          ) : null}
        </View>

        {/* Section 1: Pickup & Departure Location */}
        {pkg.pickupName || pkg.pickupAddress || pickupMapsTarget || pkg.tripStartTime ? (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionTitleBlock}>
              <Text style={styles.sectionTitle}>Pickup & Departure Location</Text>
              <Text style={styles.sectionSubtitle}>
                Where you will meet your guide to start the tour
              </Text>
            </View>

            <View style={styles.card}>
              <View style={styles.pickupRow}>
                <View style={styles.pickupMeta}>
                  {pkg.pickupName ? (
                    <View style={styles.pickupTitleRow}>
                      <Ionicons name="location" size={16} color={colors.primary} />
                      <Text style={styles.pickupName}>{pkg.pickupName}</Text>
                    </View>
                  ) : null}
                  {pkg.pickupAddress ? (
                    <Text style={styles.pickupAddress}>{pkg.pickupAddress}</Text>
                  ) : null}
                  {pkg.tripStartTime ? (
                    <View style={styles.startTimeRow}>
                      <Ionicons name="time-outline" size={14} color={colors.primary} />
                      <Text style={styles.startTimeText}>Start Time: {pkg.tripStartTime}</Text>
                    </View>
                  ) : null}
                </View>

                {pickupMapsTarget ? (
                  <Touchable
                    onPress={() => Linking.openURL(pickupMapsTarget)}
                    style={styles.openMapBtn}
                  >
                    <Ionicons name="map-outline" size={14} color={colors.primary} />
                    <Text style={styles.openMapBtnText}>Open Location</Text>
                    <Ionicons name="open-outline" size={12} color={colors.primary} />
                  </Touchable>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}

        {/* Section 2: Facilities & Inclusions */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleBlock}>
            <Text style={styles.sectionTitle}>Facilities & Inclusions</Text>
            <Text style={styles.sectionSubtitle}>
              Transparent breakdown of meals, transport, and entry fee inclusions
            </Text>
          </View>

          <View style={styles.facilitiesStack}>
            {/* Meals Card */}
            <View style={styles.card}>
              <View style={styles.facilityCardHeader}>
                <Ionicons name="restaurant-outline" size={16} color={colors.primary} />
                <Text style={styles.facilityCardTitle}>Food & Meals</Text>
              </View>
              {pkg.mealsService === "INCLUDED" || (!pkg.mealsService && pkg.foodStatus === "INCLUDED") ? (
                <View style={styles.facilityContent}>
                  <View style={styles.badgeSuccess}>
                    <Text style={styles.badgeSuccessText}>Included in package</Text>
                  </View>
                  {pkg.includedMeals && pkg.includedMeals.length > 0 ? (
                    <View style={styles.tagWrap}>
                      {pkg.includedMeals.map((m) => (
                        <View key={m} style={styles.mealTag}>
                          <Text style={styles.mealTagText}>{m}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                  <Text style={styles.facilityDesc}>
                    {pkg.mealDetails || pkg.foodDetails || "Meals are provided and covered in the tour price."}
                  </Text>
                </View>
              ) : pkg.mealsService === "ON_REQUEST" || (!pkg.mealsService && pkg.foodStatus === "OPTIONAL") ? (
                <View style={styles.facilityContent}>
                  <View style={styles.badgeWarning}>
                    <Text style={styles.badgeWarningText}>Can be arranged if requested</Text>
                  </View>
                  <Text style={styles.facilityDesc}>
                    {pkg.mealDetails || pkg.foodDetails || "Not automatically included. Can be arranged upon request for an additional charge."}
                  </Text>
                </View>
              ) : (
                <View style={styles.facilityContent}>
                  <View style={styles.badgeOutline}>
                    <Text style={styles.badgeOutlineText}>No such service</Text>
                  </View>
                  <Text style={styles.facilityDesc}>
                    Meals are not provided or arranged through this package.
                  </Text>
                </View>
              )}
            </View>

            {/* Transport Card */}
            <View style={styles.card}>
              <View style={styles.facilityCardHeader}>
                <Ionicons name="car-outline" size={16} color={colors.primary} />
                <Text style={styles.facilityCardTitle}>Transport & Transfer</Text>
              </View>
              {pkg.transportService === "INCLUDED" || (!pkg.transportService && pkg.transportStatus === "INCLUDED") ? (
                <View style={styles.facilityContent}>
                  <View style={styles.badgeSuccess}>
                    <Text style={styles.badgeSuccessText}>Included in package</Text>
                  </View>
                  {Array.isArray(pkg.transportVehicles) && pkg.transportVehicles.length > 0 ? (
                    <View style={styles.vehiclesStack}>
                      {pkg.transportVehicles.map((v, i) => {
                        const isPriv = v.arrangement ? v.arrangement === "PRIVATE" : v.isPrivate !== false;
                        const inc = (v.includedChargeCategories && v.includedChargeCategories.length > 0)
                          ? v.includedChargeCategories.join(", ")
                          : v.chargesIncluded || "Fuel, Driver allowance";
                        const exc = (v.excludedChargeCategories && v.excludedChargeCategories.length > 0)
                          ? v.excludedChargeCategories.join(", ")
                          : v.chargesExcluded || (v as any).additionalChargesExcluded || "Tolls, Parking";

                        return (
                          <View key={i} style={styles.vehicleCard}>
                            <View style={styles.vehicleHeader}>
                              <Text style={styles.vehicleName}>
                                {v.type || v.vehicleType || "Car"} · {v.capacity} seats
                              </Text>
                              <View style={styles.badgeOutline}>
                                <Text style={styles.badgeOutlineText}>
                                  {isPriv ? "Option A: Private" : "Option B: Shared"}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.vehicleDetailText}>
                              <Text style={styles.vehicleInc}>✓ Included: </Text>
                              {inc}
                            </Text>
                            <Text style={styles.vehicleDetailText}>
                              <Text style={styles.vehicleExc}>✗ Excluded: </Text>
                              {exc}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  ) : null}
                  <Text style={styles.facilityDesc}>
                    {pkg.transportDetails || "Dedicated transportation is provided and included in the advertised price."}
                  </Text>
                </View>
              ) : (
                <View style={styles.facilityContent}>
                  <View style={styles.badgeOutline}>
                    <Text style={styles.badgeOutlineText}>No transport service</Text>
                  </View>
                  <Text style={styles.facilityDesc}>
                    Transport is not provided for this package. Travellers meet at the pickup point or travel independently.
                  </Text>
                </View>
              )}
            </View>

            {/* Entry Fees Card */}
            <View style={styles.card}>
              <View style={styles.facilityCardHeader}>
                <Ionicons name="ticket-outline" size={16} color={colors.primary} />
                <Text style={styles.facilityCardTitle}>Monuments & Entry Fees</Text>
              </View>
              {pkg.entryFeeStatus === "INCLUDED" ? (
                <View style={styles.facilityContent}>
                  <View style={styles.badgeSuccess}>
                    <Text style={styles.badgeSuccessText}>Included in package</Text>
                  </View>
                  <Text style={styles.facilityDesc}>
                    All admission and monument entry fees are included in the tour price.
                  </Text>
                </View>
              ) : (
                <View style={styles.facilityContent}>
                  <View style={styles.badgeOutline}>
                    <Text style={styles.badgeOutlineText}>Excluded (Paid separately)</Text>
                  </View>
                  <Text style={styles.facilityDesc}>
                    {pkg.entryFeeDetails || "Entry fees are payable separately by travellers at each monument."}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {pkg.additionalCostsDetails ? (
            <View style={styles.additionalCostCard}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.additionalCostText}>
                <Text style={{ fontWeight: "700", color: colors.text }}>Additional Cost Notes: </Text>
                {pkg.additionalCostsDetails}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Section 3: Specific Guide Section */}
        {pkg.hasSpecificGuide && pkg.specificGuide ? (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionTitleBlock}>
              <Text style={styles.sectionTitle}>Included Specific Guide</Text>
              <Text style={styles.sectionSubtitle}>
                An expert local guide assigned to accompany you on this package
              </Text>
            </View>
            <View style={styles.card}>
              <View style={styles.specificGuideRow}>
                {pkg.specificGuide.profilePic ? (
                  <Image source={{ uri: pkg.specificGuide.profilePic }} style={styles.specificAvatar} />
                ) : (
                  <View style={styles.specificAvatarFallback}>
                    <Text style={styles.avatarInitial}>{pkg.specificGuide.name.slice(0, 2).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.specificMeta}>
                  <View style={styles.specificTitleRow}>
                    <Text style={styles.specificName}>{pkg.specificGuide.name}</Text>
                    <View style={styles.badgeSuccess}>
                      <Text style={styles.badgeSuccessText}>Included in Tour</Text>
                    </View>
                  </View>
                  {pkg.specificGuide.tagline ? (
                    <Text style={styles.specificTagline}>&ldquo;{pkg.specificGuide.tagline}&rdquo;</Text>
                  ) : null}
                  <View style={styles.specificCredRow}>
                    <Text style={styles.specificCredText}>
                      {pkg.specificGuide.experienceYears || 1}+ yrs exp
                    </Text>
                    {pkg.specificGuide.languages?.length ? (
                      <Text style={styles.specificCredText}>
                        · {pkg.specificGuide.languages.join(", ")}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.sectionWrap}>
            <View style={styles.noticeCard}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.textMuted} />
              <Text style={styles.noticeText}>
                <Text style={{ fontWeight: "700" }}>Tour Guide Service: </Text>
                This package is led directly by {person.agencyName || person.full_name}. No additional Specific Guide is assigned.
              </Text>
            </View>
          </View>
        )}

        {/* Section 4: Children & Age Policies */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleBlock}>
            <Text style={styles.sectionTitle}>Children & Age Policies</Text>
            <Text style={styles.sectionSubtitle}>
              Booking eligibility and policies for young travellers
            </Text>
          </View>
          <View style={styles.card}>
            {pkg.childrenAllowed !== false ? (
              <View style={styles.childrenPolicyWrap}>
                <View style={styles.childHeaderRow}>
                  <View style={styles.badgeSuccess}>
                    <Ionicons name="happy-outline" size={12} color="#15803d" />
                    <Text style={styles.badgeSuccessText}>Children Permitted</Text>
                  </View>
                  <Text style={styles.childAgeBandText}>
                    Child age band: <Text style={{ fontWeight: "700" }}>Up to {Math.min(pkg.childMaxAge || 11, 11)} years</Text>
                  </Text>
                </View>
                <View style={styles.childPricingCard}>
                  <Text style={styles.childPolicyTitle}>
                    Child Pricing Policy:{" "}
                    {pkg.childDiscountType === "FREE" ? (
                      <Text style={{ color: "#16a34a", fontWeight: "700" }}>Free for eligible children (100% off)</Text>
                    ) : pkg.childDiscountType === "PERCENTAGE" ? (
                      <Text style={{ color: colors.primary, fontWeight: "700" }}>
                        {pkg.childDiscountPercent ?? 50}% discount on adult rate
                      </Text>
                    ) : (
                      <Text>Standard adult price</Text>
                    )}
                  </Text>
                  <Text style={styles.childCapRule}>
                    {pkg.childrenCountTowardCapacity !== false
                      ? "• Children count towards total passenger and vehicle capacity limits."
                      : "• Children do not count towards overall capacity seating restrictions."}
                  </Text>
                </View>
                {pkg.childConditions ? (
                  <Text style={styles.childConditions}>
                    <Text style={{ fontWeight: "700" }}>Conditions: </Text>
                    {pkg.childConditions}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.adultsOnlyRow}>
                <Ionicons name="alert-circle" size={18} color="#dc2626" />
                <Text style={styles.adultsOnlyText}>
                  Adults-Only Tour: Children are not permitted on this package.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Section 5: Itinerary & Stops Arrangement */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionTitleBlock}>
            <Text style={styles.sectionTitle}>Itinerary & Stops Arrangement</Text>
            <Text style={styles.sectionSubtitle}>
              {hiddenPlaceCount > 0
                ? "Stops in this district included in the itinerary"
                : "Complete ordered itinerary with guided visit vs drop-off details"}
            </Text>
          </View>

          {pkg.places.length === 0 ? (
            <EmptyState
              title="No places listed"
              description="This tour does not cover any place in this district yet."
              icon="map-outline"
            />
          ) : (
            <View style={styles.placesStack}>
              {pkg.places.map((place, index) => (
                <Touchable
                  key={place.id}
                  onPress={() => router.push(`${districtBase}/place/${place.id}`)}
                  style={styles.placeStopCard}
                >
                  <View style={styles.placeThumbWrap}>
                    {place.images?.[0] ? (
                      <Image source={{ uri: place.images[0] }} style={styles.placeThumb} />
                    ) : (
                      <View style={styles.placeThumbPlaceholder}>
                        <Ionicons name="location-outline" size={24} color={colors.textMuted} />
                      </View>
                    )}
                    <View style={styles.stopBadge}>
                      <Text style={styles.stopBadgeText}>{index + 1}</Text>
                    </View>
                  </View>

                  <View style={styles.placeStopMeta}>
                    <View style={styles.placeStopTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.placeStopName} numberOfLines={1}>
                          {place.name}
                        </Text>
                        <Text style={styles.placeStopDistrict}>{place.districtName}</Text>
                      </View>
                      <View style={styles.badgeSuccess}>
                        <Text style={styles.badgeSuccessText}>
                          {place.visitArrangement === "DROP_OFF" ? "Drop-off only" : "Guided Visit"}
                        </Text>
                      </View>
                    </View>

                    {place.description ? (
                      <Text style={styles.placeStopDesc} numberOfLines={2}>
                        {place.description}
                      </Text>
                    ) : null}

                    <View style={styles.placeStopPillsRow}>
                      {place.expectedDuration ? (
                        <View style={styles.placePill}>
                          <Ionicons name="time-outline" size={12} color={colors.primary} />
                          <Text style={styles.placePillText}>Duration: {place.expectedDuration}</Text>
                        </View>
                      ) : null}

                      <View style={styles.placePill}>
                        <Ionicons name="ticket-outline" size={12} color={colors.textMuted} />
                        <Text style={styles.placePillText}>
                          {place.entryFeeStatus === "INCLUDED"
                            ? "Ticket included"
                            : `${priceSummary(place)}`}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Touchable>
              ))}
            </View>
          )}
        </View>

        {/* Section 6: Cancellation Policy */}
        {pkg.cancellationPolicy ? (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionTitleBlock}>
              <Text style={styles.sectionTitle}>Cancellation & Booking Terms</Text>
              <Text style={styles.sectionSubtitle}>Terms set by the guide for this package</Text>
            </View>
            <View style={styles.card}>
              <View style={styles.cancelPolicyHeader}>
                <Ionicons name="shield-checkmark" size={16} color="#10b981" />
                <Text style={styles.cancelPolicyTitle}>Cancellation Policy</Text>
              </View>
              <Text style={styles.cancelPolicyBody}>{pkg.cancellationPolicy}</Text>
            </View>
          </View>
        ) : null}

        {/* Section 7: Customer Reviews */}
        {person.review && person.review.length > 0 ? (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionTitleBlock}>
              <Text style={styles.sectionTitle}>Customer Reviews & Ratings</Text>
              <Text style={styles.sectionSubtitle}>
                Verified feedback from travellers guided by {person.agencyName || person.full_name}
              </Text>
            </View>
            <View style={styles.reviewsStack}>
              {person.review.map((rev, idx) => (
                <View key={idx} style={styles.card}>
                  <View style={styles.reviewStarsRow}>
                    <View style={styles.starsWrap}>
                      {[...Array(5)].map((_, i) => (
                        <Ionicons key={i} name="star" size={14} color="#f59e0b" />
                      ))}
                    </View>
                    <Text style={styles.verifiedText}>Verified Traveller</Text>
                  </View>
                  <Text style={styles.reviewBody}>{rev}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Back to Guides link */}
        <Touchable
          onPress={() => router.push(`${districtBase}/guides`)}
          style={styles.backToGuidesCard}
        >
          <Ionicons name="arrow-back" size={16} color={colors.primary} />
          <Text style={styles.backToGuidesText}>Back to all guides</Text>
        </Touchable>
      </ScrollView>

      {/* EXACT 1:1 REPLICA OF THE WEB BOOKING MODAL */}
      <Modal
        visible={bookingOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setBookingOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            {/* Modal Header matching web Image 2 */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.modalBadgeRow}>
                  <View style={styles.badgeInfo}>
                    <Text style={styles.badgeInfoText}>Tour Package</Text>
                  </View>
                  {person.agencyName ? (
                    <Text style={styles.modalAgencyName}>{person.agencyName}</Text>
                  ) : null}
                </View>
                <Text style={styles.modalTitle}>Book {pkg.name}</Text>
                <Text style={styles.modalSubtitle}>
                  Led by {person.full_name} · {pkg.places.length} stops included
                </Text>
              </View>
              <Touchable onPress={() => setBookingOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </Touchable>
            </View>

            {confirmedBookingId ? (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.successBlock}>
                  <View style={styles.successIconWrap}>
                    <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                  </View>
                  <Text style={styles.successTitle}>Booking Confirmed!</Text>
                  <Text style={styles.successDesc}>
                    Your tour package request has been sent to {person.agencyName || person.full_name}.
                  </Text>
                </View>

                <View style={styles.card}>
                  <Text style={styles.confirmedSummaryTitle}>Booking Summary</Text>
                  <View style={styles.confirmedRow}>
                    <Text style={styles.confirmedLabel}>Date & Time:</Text>
                    <Text style={styles.confirmedVal}>{bookingDate} at {bookingTime}</Text>
                  </View>
                  <View style={styles.confirmedRow}>
                    <Text style={styles.confirmedLabel}>Travellers:</Text>
                    <Text style={styles.confirmedVal}>{totalPeople} ({adults} Adult{adults > 1 ? "s" : ""}, {children} Child{children !== 1 ? "ren" : ""})</Text>
                  </View>
                  <View style={styles.confirmedRow}>
                    <Text style={styles.confirmedLabel}>Total Price:</Text>
                    <Text style={[styles.confirmedVal, { color: colors.primary, fontWeight: "700" }]}>
                      {formatCurrency(calculatedTotal)}
                    </Text>
                  </View>
                </View>

                <Touchable
                  onPress={() => {
                    setBookingOpen(false);
                    router.push("/bookings");
                  }}
                  style={[styles.bookEmeraldButton, { marginTop: spacing.md }]}
                >
                  <Text style={styles.bookEmeraldButtonText}>View All My Bookings</Text>
                </Touchable>
              </ScrollView>
            ) : (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* 1. Date & Time Selection */}
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeader}>
                    <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                    <Text style={styles.modalSectionTitle}>Select Date & Start Time</Text>
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
                      <Text style={styles.inputSublabel}>Trip Start Time</Text>
                      <TextInput
                        value={bookingTime}
                        onChangeText={setBookingTime}
                        placeholder="09:00 AM"
                        style={styles.textInput}
                      />
                    </View>
                  </View>
                </View>

                {/* 2. Number of Travellers */}
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeader}>
                    <Ionicons name="people-outline" size={16} color={colors.primary} />
                    <Text style={styles.modalSectionTitle}>Number of Travellers</Text>
                  </View>
                  <View style={styles.travellersRow}>
                    <View style={styles.stepperCard}>
                      <View>
                        <Text style={styles.stepperTitle}>Adults</Text>
                        <Text style={styles.stepperSub}>Age {pkg.childMaxAge ? `${pkg.childMaxAge}+` : "11+"}</Text>
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
                          onPress={() => setAdults(totalPeople < maxCapacity ? adults + 1 : adults)}
                          style={styles.stepBtn}
                        >
                          <Text style={styles.stepBtnText}>+</Text>
                        </Touchable>
                      </View>
                    </View>

                    {pkg.childrenAllowed !== false ? (
                      <View style={styles.stepperCard}>
                        <View>
                          <Text style={styles.stepperTitle}>Children</Text>
                          <Text style={styles.stepperSub}>
                            Under {pkg.childMaxAge || 11} yrs
                          </Text>
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
                            onPress={() => setChildren(totalPeople < maxCapacity ? children + 1 : children)}
                            style={styles.stepBtn}
                          >
                            <Text style={styles.stepBtnText}>+</Text>
                          </Touchable>
                        </View>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.capacityNotice}>
                    Tour capacity: Max {maxCapacity} guests (Total passengers)
                  </Text>
                </View>

                {/* 3. Included Tour Stops (matching Image 2) */}
                <View style={styles.modalSection}>
                  <View style={styles.stopsHeaderRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name="location-outline" size={16} color={colors.primary} />
                      <Text style={styles.modalSectionTitle}>
                        Tour Stops ({selectedPlaceIds.length}/{pkg.places.length} selected)
                      </Text>
                    </View>
                    <Text style={styles.customizeStopsNotice}>Customize stops if desired</Text>
                  </View>

                  <View style={styles.stopsStack}>
                    {pkg.places.map((place, idx) => {
                      const isSelected = selectedPlaceIds.includes(place.id);
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
                            <View style={styles.stopNumberCircle}>
                              <Text style={styles.stopNumberCircleText}>{idx + 1}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.stopSelectName}>{place.name}</Text>
                              <Text style={styles.stopSelectDistrict}>
                                {place.districtName}
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

                {/* 4. Pickup & Meeting Point (matching Image 2) */}
                <View style={styles.modalSection}>
                  <View style={styles.modalSectionHeader}>
                    <Ionicons name="location-outline" size={16} color={colors.primary} />
                    <Text style={styles.modalSectionTitle}>Pickup & Meeting Point</Text>
                  </View>
                  <View style={styles.pickupCard}>
                    <Text style={styles.pickupCardTitle}>
                      {pkg.pickupName || "BUS STAND"}
                    </Text>
                    {pkg.pickupAddress ? (
                      <Text style={styles.pickupCardSub}>{pkg.pickupAddress}</Text>
                    ) : null}

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
                          placeholder="Pickup location name (e.g. Grand Palace Hotel)"
                          style={styles.textInput}
                        />
                        <TextInput
                          value={requestedPickupAddress}
                          onChangeText={setRequestedPickupAddress}
                          placeholder="Pickup address details"
                          style={styles.textInput}
                        />
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* 5. Tour Package Inclusions 3-box Grid (matching Image 2) */}
                <View style={styles.modalSection}>
                  <Text style={styles.inclusionsSectionLabel}>Tour Package Inclusions:</Text>
                  <View style={styles.inclusionsGrid}>
                    <View style={styles.inclusionBox}>
                      <Text style={styles.inclusionBoxLabel}>Meals</Text>
                      <Text style={styles.inclusionBoxVal}>
                        {pkg.foodStatus === "INCLUDED" || pkg.mealsService === "INCLUDED"
                          ? "Included"
                          : "Pay Separately"}
                      </Text>
                    </View>
                    <View style={styles.inclusionBox}>
                      <Text style={styles.inclusionBoxLabel}>Transport</Text>
                      <Text style={styles.inclusionBoxVal}>
                        {pkg.transportService === "INCLUDED" || pkg.transportStatus === "INCLUDED"
                          ? "Included in package"
                          : "No transport service"}
                      </Text>
                    </View>
                    <View style={styles.inclusionBox}>
                      <Text style={styles.inclusionBoxLabel}>Entry Tickets</Text>
                      <Text style={styles.inclusionBoxVal}>
                        {pkg.entryFeeStatus === "INCLUDED" ? "Included" : "Pay at Gate"}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 6. Customer & Traveller Details (matching Image 2) */}
                <View style={styles.modalSection}>
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
                        placeholder="e.g. Elderly traveller needing gentle walking pace, preferred pickup landmark..."
                        multiline
                        numberOfLines={2}
                        style={[styles.textInput, { height: 60, textAlignVertical: "top", marginTop: 4 }]}
                      />
                    </View>
                  </View>
                </View>

                {/* 7. Price Breakdown Card (matching Image 2) */}
                <View style={styles.modalSection}>
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
                      <Text style={styles.summaryValue}>
                        {formatCurrency(pkg.price && pkg.price > 0 ? pkg.price : person.cost)}
                      </Text>
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
                </View>

                {/* Terms note */}
                <Text style={styles.termsNote}>
                  {pkg.cancellationPolicy || "Free cancellation up to 24 hours before tour start."}
                </Text>

                {/* Confirm Booking Emerald Button */}
                <Touchable
                  onPress={handleBookTour}
                  disabled={bookingSubmitting}
                  style={styles.confirmEmeraldBtn}
                >
                  {bookingSubmitting ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.confirmEmeraldBtnText}>
                      Confirm Booking — {formatCurrency(calculatedTotal)}
                    </Text>
                  )}
                </Touchable>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* 3. Universal BottomNavigation bar matching Web */}
      <DistrictBottomNav
        activeTab="guides"
        stateSlug={stateSlug}
        districtSlug={districtSlug}
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
  bannerContainer: {
    height: 190,
    borderRadius: radius.xl,
    overflow: "hidden",
    position: "relative",
    backgroundColor: colors.surfaceMuted,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  bannerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  bannerTextWrap: {
    position: "absolute",
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    gap: 4,
  },
  bannerBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  bannerBadgeText: {
    ...typography.caption,
    color: "#ffffff",
    fontWeight: "600",
  },
  bannerTitle: {
    ...typography.title,
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 22,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 1 },
    }),
  },
  guideHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  guideAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "rgba(37, 99, 235, 0.2)",
  },
  guideAvatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(37, 99, 235, 0.2)",
  },
  avatarInitial: {
    ...typography.heading,
    fontSize: 22,
    color: "#1d4ed8",
    fontWeight: "700",
  },
  guideHeaderMeta: {
    flex: 1,
  },
  guideAgencyName: {
    ...typography.bodyStrong,
    fontSize: 16,
    color: colors.text,
  },
  guideLeadText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  guideCredentialsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  ratingText: {
    ...typography.caption,
    color: "#d97706",
    fontWeight: "700",
    fontSize: 11,
  },
  credItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  credText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  viewGuideBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
  },
  viewGuideBtnText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: "600",
    fontSize: 12,
  },
  pkgDescription: {
    ...typography.body,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  badgeSuccess: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  badgeSuccessText: {
    ...typography.caption,
    color: "#15803d",
    fontWeight: "600",
    fontSize: 11,
  },
  badgeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#dbeafe",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  badgeInfoText: {
    ...typography.caption,
    color: "#1d4ed8",
    fontWeight: "600",
    fontSize: 11,
  },
  badgeOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  badgeOutlineText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  badgeWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  badgeWarningText: {
    ...typography.caption,
    color: "#b45309",
    fontWeight: "600",
    fontSize: 11,
  },
  badgeDestructive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fee2e2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  badgeDestructiveText: {
    ...typography.caption,
    color: "#b91c1c",
    fontWeight: "600",
    fontSize: 11,
  },
  hiddenCountBanner: {
    backgroundColor: "rgba(0,0,0,0.03)",
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  hiddenCountText: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 16,
  },
  bookEmeraldButton: {
    backgroundColor: "#059669",
    borderRadius: radius.lg,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: { shadowColor: "#059669", shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
      android: { elevation: 3 },
    }),
  },
  bookEmeraldButtonText: {
    ...typography.bodyStrong,
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  sectionWrap: {
    gap: spacing.xs,
  },
  sectionTitleBlock: {
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    ...typography.heading,
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  sectionSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  pickupRow: {
    gap: spacing.sm,
  },
  pickupMeta: {
    gap: 4,
  },
  pickupTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pickupName: {
    ...typography.bodyStrong,
    fontSize: 15,
    color: colors.text,
  },
  pickupAddress: {
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary,
  },
  startTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  startTimeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
    fontSize: 12,
  },
  openMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
  },
  openMapBtnText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
  },
  facilitiesStack: {
    gap: spacing.sm,
  },
  facilityCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  facilityCardTitle: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.text,
  },
  facilityContent: {
    gap: spacing.xs,
    alignItems: "flex-start",
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  mealTag: {
    backgroundColor: "rgba(37, 99, 235, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  mealTagText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: "600",
    fontSize: 11,
  },
  facilityDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  vehiclesStack: {
    gap: spacing.xs,
    width: "100%",
  },
  vehicleCard: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: 4,
    width: "100%",
  },
  vehicleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  vehicleName: {
    ...typography.bodyStrong,
    fontSize: 13,
    color: colors.text,
  },
  vehicleDetailText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
  },
  vehicleInc: {
    color: "#15803d",
    fontWeight: "600",
  },
  vehicleExc: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  additionalCostCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.xs,
  },
  additionalCostText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  specificGuideRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  specificAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  specificAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(37, 99, 235, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  specificMeta: {
    flex: 1,
    gap: 2,
  },
  specificTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  specificName: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.text,
  },
  specificTagline: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: "italic",
    fontSize: 11,
  },
  specificCredRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  specificCredText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.primary,
    fontWeight: "600",
  },
  noticeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  noticeText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textMuted,
    flex: 1,
    lineHeight: 17,
  },
  childrenPolicyWrap: {
    gap: spacing.sm,
  },
  childHeaderRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  childAgeBandText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  childPricingCard: {
    backgroundColor: colors.surfaceMuted,
    padding: spacing.sm,
    borderRadius: radius.md,
    gap: 4,
  },
  childPolicyTitle: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.text,
    fontSize: 12,
  },
  childCapRule: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  childConditions: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  adultsOnlyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  adultsOnlyText: {
    ...typography.caption,
    color: "#dc2626",
    fontWeight: "600",
    fontSize: 12,
  },
  placesStack: {
    gap: spacing.sm,
  },
  placeStopCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    padding: spacing.sm,
    gap: spacing.sm,
  },
  placeThumbWrap: {
    width: 90,
    height: 80,
    borderRadius: radius.lg,
    overflow: "hidden",
    position: "relative",
    backgroundColor: colors.surfaceMuted,
  },
  placeThumb: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeThumbPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stopBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stopBadgeText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 11,
  },
  placeStopMeta: {
    flex: 1,
    justifyContent: "space-between",
  },
  placeStopTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 4,
  },
  placeStopName: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.text,
  },
  placeStopDistrict: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  placeStopDesc: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  placeStopPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  placePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  placePillText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 10,
  },
  cancelPolicyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cancelPolicyTitle: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.text,
  },
  cancelPolicyBody: {
    ...typography.caption,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  reviewsStack: {
    gap: spacing.sm,
  },
  reviewStarsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  starsWrap: {
    flexDirection: "row",
    gap: 2,
  },
  verifiedText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  reviewBody: {
    ...typography.body,
    fontSize: 12.5,
    color: colors.text,
    lineHeight: 17,
  },
  backToGuidesCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  backToGuidesText: {
    ...typography.bodyStrong,
    color: colors.primary,
    fontSize: 13,
  },

  /* -------------------------------------------------------------------------- */
  /* MODAL STYLES (Matching Image 2 pixel-by-pixel)                            */
  /* -------------------------------------------------------------------------- */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  modalAgencyName: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "600",
  },
  modalTitle: {
    ...typography.heading,
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 18,
    backgroundColor: colors.surfaceMuted,
  },
  modalBody: {
    padding: spacing.lg,
  },
  modalSection: {
    marginBottom: spacing.lg,
  },
  modalSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: spacing.xs,
  },
  modalSectionTitle: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.text,
  },
  inputSublabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },
  inputGrid2: {
    flexDirection: "row",
    gap: spacing.sm,
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
  capacityNotice: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 6,
  },
  stopsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  customizeStopsNotice: {
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
  stopNumberCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
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
  pickupCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  pickupCardTitle: {
    ...typography.bodyStrong,
    fontSize: 14,
    color: colors.text,
  },
  pickupCardSub: {
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
  inclusionsSectionLabel: {
    ...typography.bodyStrong,
    fontSize: 12,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  inclusionsGrid: {
    flexDirection: "row",
    gap: 8,
  },
  inclusionBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    gap: 2,
  },
  inclusionBoxLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
  },
  inclusionBoxVal: {
    ...typography.caption,
    color: colors.text,
    fontWeight: "700",
    fontSize: 11,
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
  termsNote: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.md,
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
