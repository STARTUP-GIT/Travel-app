/**
 * Rating display and input.
 *
 * The backend stores a numeric `rating` and a legacy free-text `review: string[]`
 * whose length is used as the review count — the same convention the web app
 * uses. A listing with no reviews shows a neutral placeholder rather than a
 * misleading "0.0 (0)", which reads like a bad score instead of no data.
 */

import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, typography } from "@/theme";
import { Touchable } from "@/components/ui/pressable";

type DisplayProps = {
  rating: number | null | undefined;
  count?: number;
  size?: number;
  showCount?: boolean;
};

export function RatingRow({ rating, count = 0, size = 15, showCount = true }: DisplayProps) {
  if (typeof rating !== "number" || !Number.isFinite(rating) || rating <= 0) {
    return (
      <View style={styles.row}>
        <Ionicons name="star-outline" size={size} color={colors.textMuted} />
        <Text style={[styles.muted, { fontSize: size - 1 }]}>No reviews yet</Text>
      </View>
    );
  }

  return (
    <View
      style={styles.row}
      accessibilityLabel={`Rated ${rating.toFixed(1)} out of 5${count ? ` from ${count} reviews` : ""}`}
    >
      <Ionicons name="star" size={size} color={colors.star} />
      <Text style={styles.score}>{rating.toFixed(1)}</Text>
      {showCount && count > 0 ? (
        <Text style={styles.count}>({count})</Text>
      ) : null}
    </View>
  );
}

type InputProps = {
  value: number;
  onChange: (rating: number) => void;
  max?: number;
  size?: number;
};

export function RatingInput({ value, onChange, max = 5, size = 34 }: InputProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const shown = hovered ?? value;

  return (
    <View
      style={styles.inputRow}
      accessibilityRole="radiogroup"
      accessibilityLabel="Your rating"
      onTouchEnd={() => setHovered(null)}
    >
      {Array.from({ length: max }, (_, index) => index + 1).map((star) => (
        <Touchable
          key={star}
          onPress={() => onChange(star)}
          onPressIn={() => setHovered(star)}
          accessibilityRole="radio"
          accessibilityLabel={`${star} ${star === 1 ? "star" : "stars"}`}
          accessibilityState={{ selected: value === star }}
          hitSlop={6}
          style={styles.starButton}
        >
          <Ionicons
            name={star <= shown ? "star" : "star-outline"}
            size={size}
            color={star <= shown ? colors.star : colors.borderStrong}
          />
        </Touchable>
      ))}
      <Text style={styles.inputLabel}>
        {value > 0 ? `${value}/${max}` : "Tap to rate"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  score: {
    ...typography.smallStrong,
    color: colors.text,
    marginLeft: 2,
  },
  count: {
    ...typography.small,
    color: colors.textMuted,
  },
  muted: {
    ...typography.small,
    color: colors.textMuted,
    marginLeft: 3,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  starButton: {
    padding: spacing.xxs,
  },
  inputLabel: {
    ...typography.small,
    color: colors.textMuted,
    marginLeft: spacing.sm,
  },
});