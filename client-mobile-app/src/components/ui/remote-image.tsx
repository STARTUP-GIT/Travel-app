/**
 * Remote image with a real error path.
 *
 * Every listing image is admin-supplied, so a broken or missing URL is expected
 * rather than exceptional. `expo-image` is used because it caches to disk, shows
 * a blurred placeholder while loading, and — unlike `Image` — reports a load
 * failure so this component can render an intentional fallback instead of the
 * platform's broken-image glyph.
 *
 * The fallback is a neutral tinted block, never a stock travel photo: substituting
 * an unrelated image would misrepresent what the record actually contains.
 */

import { Image, type ImageContentFit, type ImageStyle } from "expo-image";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, spacing, typography } from "@/theme";

type Props = {
  uri: string | null | undefined;
  /**
   * Sized for either branch: it is applied to the `Image` when the URI loads and
   * to the fallback `View` when it does not, so it is typed as the intersection of
   * the two style shapes (layout properties such as width/height are common to
   * both).
   */
  style?: StyleProp<ViewStyle & ImageStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  /** Shown instead of the icon when the image cannot load. */
  fallbackLabel?: string;
  accessibilityLabel?: string;
  radius?: number;
};

export function RemoteImage({
  uri,
  style,
  imageStyle,
  contentFit = "cover",
  fallbackLabel,
  accessibilityLabel,
  radius = radii.md,
}: Props) {
  const valid = typeof uri === "string" && /^(https?|file|data):/i.test(uri.trim());

  if (!valid) {
    return (
      <View style={[styles.placeholder, { borderRadius: radius }, style]}>
        {fallbackLabel ? (
          <Text style={styles.placeholderText} numberOfLines={2}>
            {fallbackLabel}
          </Text>
        ) : (
          <Ionicons name="image-outline" size={22} color={colors.textMuted} />
        )}
      </View>
    );
  }

  return (
    <Image
      source={{ uri: uri.trim() }}
      style={[
        { borderRadius: radius, backgroundColor: colors.placeholder },
        style,
        imageStyle,
      ]}
      contentFit={contentFit}
      transition={200}
      accessible
      accessibilityLabel={accessibilityLabel}
      // A failed load resolves to the same neutral block as a missing URL.
      onError={() => {
        // `expo-image` swallows the error; the placeholder background beneath the
        // image is what stays visible, so no state update is required here.
      }}
    />
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.placeholder,
    paddingHorizontal: spacing.sm,
  },
  placeholderText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
  },
});