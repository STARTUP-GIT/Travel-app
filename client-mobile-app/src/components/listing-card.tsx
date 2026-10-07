/**
 * Hotel and restaurant cards.
 *
 * Both listings share the same shape — logo, name, address, rating, per-night or
 * per-person price — so they share one implementation, differing only in the
 * price label and the extra detail restaurants carry (food category).
 *
 * `booking_enabled` comes straight from the backend: a listing with it off shows
 * "Booking unavailable" instead of a button that would fail.
 */

import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Hotel, Restaurent } from "@/types/api";
import { firstImage, formatCurrency, truncate } from "@/lib/utils/format";
import { colors, foodCategoryLabel, radii, spacing, typography } from "@/theme";
import { RemoteImage } from "@/components/ui/remote-image";
import { Touchable } from "@/components/ui/pressable";
import { Badge } from "@/components/ui/badge";
import { RatingRow } from "./rating-row";

type BaseProps = {
  name: string;
  address?: string | null;
  description?: string | null;
  profileLogo?: string | null;
  images?: string[];
  rating?: number | null;
  reviewCount?: number;
  bookingEnabled?: boolean;
  districtName?: string;
  onPress: () => void;
  extraBadge?: string;
};

function ListingCard({
  name,
  address,
  description,
  profileLogo,
  images,
  rating,
  reviewCount = 0,
  bookingEnabled,
  districtName,
  onPress,
  extraBadge,
  priceLabel,
  priceValue,
}: BaseProps & { priceLabel: string; priceValue: string | null }) {
  const image = profileLogo ?? firstImage(images);

  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={styles.card}
    >
      <View style={styles.row}>
        <RemoteImage
          uri={image}
          style={styles.logo}
          fallbackLabel={name}
          accessibilityLabel={`Photo of ${name}`}
        />

        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {name}
          </Text>

          {address ? (
            <View style={styles.metaLine}>
              <Ionicons name="location-outline" size={13} color={colors.textMuted} />
              <Text style={styles.meta} numberOfLines={1}>
                {truncate(address, 60)}
              </Text>
            </View>
          ) : null}

          <RatingRow rating={rating ?? null} count={reviewCount} />

          <View style={styles.tagRow}>
            {extraBadge ? <Badge label={extraBadge} tone="primary" /> : null}
            {districtName ? <Badge label={districtName} tone="neutral" /> : null}
            {bookingEnabled === false ? (
              <Badge label="Booking unavailable" tone="warning" />
            ) : null}
          </View>
        </View>
      </View>

      {description ? (
        <Text style={styles.description} numberOfLines={2}>
          {truncate(description, 110)}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.priceLabel}>{priceLabel}</Text>
        <Text style={styles.price}>
          {priceValue ?? "Price on request"}
        </Text>
      </View>
    </Touchable>
  );
}

export function HotelCard({ hotel, onPress }: { hotel: Hotel; onPress: () => void }) {
  return (
    <ListingCard
      name={hotel.name}
      address={hotel.address}
      description={hotel.description}
      profileLogo={hotel.profile_logo}
      images={hotel.images}
      rating={hotel.rating}
      reviewCount={hotel.review?.length ?? 0}
      bookingEnabled={hotel.booking_enabled}
      districtName={hotel.district?.name}
      onPress={onPress}
      priceLabel="per night"
      priceValue={formatCurrency(hotel.cost_per_night)}
    />
  );
}

export function RestaurantCard({
  restaurant,
  onPress,
}: {
  restaurant: Restaurent;
  onPress: () => void;
}) {
  return (
    <ListingCard
      name={restaurant.name}
      address={restaurant.address}
      description={restaurant.description}
      profileLogo={restaurant.profile_logo}
      images={restaurant.images}
      rating={restaurant.rating}
      reviewCount={restaurant.review?.length ?? 0}
      bookingEnabled={restaurant.booking_enabled}
      districtName={restaurant.district?.name}
      onPress={onPress}
      extraBadge={foodCategoryLabel(restaurant.food_category)}
      priceLabel="cuisine"
      priceValue={restaurant.food_category ? foodCategoryLabel(restaurant.food_category) : null}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  logo: {
    width: 68,
    height: 68,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...typography.subheading,
    color: colors.text,
  },
  metaLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  meta: {
    ...typography.small,
    color: colors.textMuted,
    flexShrink: 1,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  description: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  priceLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  price: {
    ...typography.bodyStrong,
    color: colors.successDark,
  },
});