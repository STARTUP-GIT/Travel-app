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

import React, { useEffect, useState } from "react";
import { Image, type ImageContentFit, type ImageStyle } from "expo-image";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { radii, spacing, typography } from "@/theme";

type Props = {
  uri: string | null | undefined;
  style?: StyleProp<ViewStyle & ImageStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  contentFit?: ImageContentFit;
  fallbackLabel?: string;
  accessibilityLabel?: string;
  radius?: number;
};

/**
 * Resolves any relative URL to an absolute URL using EXPO_PUBLIC_API_BASE_URL.
 */
function resolveUri(raw?: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^(https?|file|data|blob):/i.test(trimmed)) {
    return trimmed;
  }
  const apiBase = (process.env.EXPO_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
  if (apiBase) {
    const cleanPath = trimmed.replace(/^[/\\]+/, "");
    return `${apiBase}/${cleanPath}`;
  }
  return trimmed;
}

export function RemoteImage({
  uri,
  style,
  imageStyle,
  contentFit = "cover",
  fallbackLabel,
  accessibilityLabel,
  radius = radii.md,
}: Props) {
  const [hasError, setHasError] = useState(false);
  const resolved = resolveUri(uri);

  useEffect(() => {
    setHasError(false);
  }, [uri]);

  const initialLetter = fallbackLabel?.trim()
    ? fallbackLabel.trim().charAt(0).toUpperCase()
    : null;

  if (!resolved || hasError) {
    return (
      <View
        style={[
          styles.fallbackContainer,
          { borderRadius: radius, overflow: "hidden" },
          style,
        ]}
      >
        <LinearGradient
          colors={["#1e40af", "#2563eb", "#3730a3"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {initialLetter ? (
          <Text style={styles.initialText}>{initialLetter}</Text>
        ) : (
          <Ionicons name="image-outline" size={26} color="rgba(255, 255, 255, 0.5)" />
        )}
      </View>
    );
  }

  return (
    <View style={[{ borderRadius: radius, overflow: "hidden" }, style]}>
      <LinearGradient
        colors={["#1e40af", "#2563eb", "#3730a3"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Image
        source={{ uri: resolved }}
        style={[
          StyleSheet.absoluteFill,
          imageStyle,
        ]}
        contentFit={contentFit}
        transition={200}
        accessible
        accessibilityLabel={accessibilityLabel || fallbackLabel}
        onError={() => setHasError(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fallbackContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e40af",
  },
  initialText: {
    fontSize: 32,
    fontWeight: "800",
    color: "rgba(255, 255, 255, 0.45)",
    textAlign: "center",
  },
});
