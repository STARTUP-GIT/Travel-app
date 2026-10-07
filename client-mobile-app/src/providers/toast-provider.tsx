/**
 * Transient toast messages.
 *
 * Used for confirmations ("Booking requested", "Removed from saved") where a
 * modal would be heavy. The host is rendered above the navigator so a message is
 * not clipped by a screen's own container, and it auto-dismisses — a user must
 * never have to tap a toast away to carry on.
 *
 * Android needs `accessibilityLiveRegion` and iOS an `AccessibilityInfo`
 * announcement, otherwise a screen-reader user hears nothing.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, radii, shadows, spacing, typography } from "@/theme";

export type ToastTone = "success" | "error" | "info";

type ToastMessage = {
  id: number;
  text: string;
  tone: ToastTone;
};

type ToastValue = {
  show: (text: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastValue | null>(null);

const DURATION_MS = 3200;

const TONES: Record<ToastTone, { background: string; icon: keyof typeof Ionicons.glyphMap }> = {
  success: { background: colors.successDark, icon: "checkmark-circle" },
  error: { background: colors.danger, icon: "alert-circle" },
  info: { background: colors.text, icon: "information-circle" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const insets = useSafeAreaInsets();

  const dismiss = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) setToast(null);
      },
    );
  }, [opacity]);

  const show = useCallback(
    (text: string, tone: ToastTone = "info") => {
      if (!text) return;

      // Replace rather than queue: a second confirmation arriving before the
      // first disappears should update the message, not stack up.
      setToast({ id: Date.now(), text, tone });

      opacity.setValue(0);
      translateY.setValue(-12);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 18 }),
      ]).start();

      AccessibilityInfo.announceForAccessibility(text);

      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(dismiss, DURATION_MS);
    },
    [dismiss, opacity, translateY],
  );

  // A toast still on screen when the tree unmounts must not fire into nothing.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const value = useMemo<ToastValue>(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {toast ? (
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[
            styles.host,
            {
              top: insets.top + spacing.sm,
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <View
            style={[
              styles.toast,
              { backgroundColor: TONES[toast.tone].background },
            ]}
          >
            <Ionicons
              name={TONES[toast.tone].icon}
              size={18}
              color={colors.textInverse}
            />
            <Text style={styles.text} numberOfLines={3}>
              {toast.text}
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return value;
}

const styles = StyleSheet.create({
  host: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 1000,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    ...shadows.raised,
  },
  text: {
    ...typography.smallStrong,
    color: colors.textInverse,
    flex: 1,
  },
});