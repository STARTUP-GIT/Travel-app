/**
 * Place card.
 *
 * Mirrors the customer web app's place card: image, name, district, category and
 * an entry price. The pricing rule is the part worth stating explicitly, because
 * `entryfee: null` and "no pricing rows" mean different things and getting it
 * backwards tells a user an attraction is free when it is merely unpriced:
 *
 *   - `entryfee === null`  -> genuinely free to enter
 *   - `pricing` non-empty  -> show "From <cheapest band>", since that is what a
 *                             visitor will actually pay
 *   - otherwise            -> the flat `entryfee`
 */

import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { Place } from "@/types/api";
import { formatCurrency, truncate } from "@/lib/utils/format";
import { firstImage } from "@/lib/utils/format";
import { colors, radii, spacing, typography } from "@/theme";
import { RemoteImage } from "@/components/ui/remote-image";
import { Touchable } from "@/components/ui/pressable";
import { Badge } from "@/components/ui/badge";

/** Cheapest ticket band, which is what a visitor pays at the gate. */
export function startingPrice(place: Place): string | null {
  const bands = Array.isArray(place.pricing) ? place.pricing : [];
  const amounts = bands
    .map((band) => band?.amount)
    .filter((amount): amount is number => typeof amount === "number" && Number.isFinite(amount));

  if (amounts.length > 0) {
    return formatCurrency(Math.min(...amounts));
  }
  return formatCurrency(place.entryfee);
}

export function isFreeEntry(place: Place): boolean {
  return place.entryfee === null && !(Array.isArray(place.pricing) && place.pricing.length > 0);
}

/** The one-line price summary shown on a card. */
export function placePriceLabel(place: Place): string | null {
  if (isFreeEntry(place)) return "Free entry";

  const bands = Array.isArray(place.pricing) ? place.pricing : [];
  const price = startingPrice(place);
  if (!price) return null;

  return bands.length > 0 ? `From ${price}` : price;
}

type Props = {
  place: Place;
  districtName?: string;
  onPress: () => void;
  onToggleSave?: () => void;
  saved?: boolean;
};

export function PlaceCard({ place, districtName, onPress, onToggleSave, saved }: Props) {
  const image = firstImage(place.images);
  const price = placePriceLabel(place);

  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${place.name}${price ? `, ${price}` : ""}`}
      style={styles.card}
    >
      <RemoteImage
        uri={image}
        style={styles.image}
        fallbackLabel={place.name}
        accessibilityLabel={`Photo of ${place.name}`}
      />

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={2}>
            {place.name}
          </Text>

          {onToggleSave ? (
            <Touchable
              onPress={onToggleSave}
              accessibilityRole="button"
              accessibilityLabel={saved ? `Remove ${place.name} from saved` : `Save ${place.name}`}
              accessibilityState={{ selected: Boolean(saved) }}
              hitSlop={10}
              style={styles.heart}
            >
              <Ionicons
                name={saved ? "heart" : "heart-outline"}
                size={20}
                color={saved ? colors.danger : colors.textMuted}
              />
            </Touchable>
          ) : null}
        </View>

        <View style={styles.metaRow}>
          {place.category ? <Badge label={place.category} tone="primary" /> : null}
          {districtName ? (
            <View style={styles.location}>
              <Ionicons name="location-outline" size={13} color={colors.textMuted} />
              <Text style={styles.locationText} numberOfLines={1}>
                {districtName}
              </Text>
            </View>
          ) : null}
        </View>

        {place.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {truncate(place.description, 110)}
          </Text>
        ) : null}

        {price ? (
          <View style={styles.priceRow}>
            <Ionicons name="ticket-outline" size={14} color={colors.successDark} />
            <Text style={styles.price}>{price}</Text>
          </View>
        ) : null}
      </View>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    marginBottom: spacing.lg,
  },
  image: {
    width: "100%",
    height: 168,
  },
  body: {
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  name: {
    ...typography.heading,
    color: colors.text,
    flex: 1,
  },
  heart: {
    padding: spacing.xs,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: "wrap",
  },
  location: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexShrink: 1,
  },
  locationText: {
    ...typography.small,
    color: colors.textMuted,
    flexShrink: 1,
  },
  description: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  price: {
    ...typography.bodyStrong,
    color: colors.successDark,
  },
});