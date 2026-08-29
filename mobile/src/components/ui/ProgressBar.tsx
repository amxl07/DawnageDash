import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';

import { radius, useMotion, useTheme } from '@/theme';

type Props = {
  /** 0..1 */
  value: number;
  height?: number;
  color?: string;
  /** Soft accent halo. Reduced in light mode, where glow reads as a bug. */
  glow?: boolean;
  accessibilityLabel?: string;
};

export function ProgressBar({ value, height = 8, color, glow = true, accessibilityLabel }: Props) {
  const { colors, isDark } = useTheme();
  const motion = useMotion();
  const fill = color ?? colors.primary;
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(clamped, {
      duration: motion.duration.enter,
      easing: Easing.bezier(...motion.easing.standard),
    });
  }, [clamped, motion, width]);

  const animated = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={{
        height,
        borderRadius: radius.pill,
        backgroundColor: colors.elevated,
        borderWidth: isDark ? 0 : 1,
        borderColor: colors.border,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          {
            height: '100%',
            borderRadius: radius.pill,
            backgroundColor: fill,
            ...(glow
              ? {
                  shadowColor: fill,
                  shadowOpacity: isDark ? 0.55 : 0.15,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 0 },
                }
              : {}),
          },
          animated,
        ]}
      />
    </View>
  );
}
