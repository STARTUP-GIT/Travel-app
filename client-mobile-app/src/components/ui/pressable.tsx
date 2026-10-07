/**
 * Pressable wrapper.
 *
 * One component for every tappable surface so the pressed/disabled feedback is
 * identical app-wide and touch targets never collapse below the platform
 * minimum.
 */

import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";

type Props = Omit<PressableProps, "style"> & {
  style?: StyleProp<ViewStyle>;
};

export function Touchable({ style, ...rest }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      // A gentle opacity change rather than a ripple, so it reads the same on
      // Android and iOS.
      style={({ pressed }) => [style, pressed && { opacity: 0.75 }]}
      {...rest}
    />
  );
}