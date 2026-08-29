import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { radius, spacing, useMotion, useTheme } from '@/theme';

type Props = { height?: ViewStyle['height']; width?: ViewStyle['width']; style?: ViewStyle };

/** A shape-matched placeholder. Never a bare spinner — see plans/03-ux-standards.md §E. */
export function Skeleton({ height = 16, width = '100%', style }: Props) {
  const { colors } = useTheme();
  const motion = useMotion();
  const opacity = useSharedValue(motion.enabled ? 0.4 : 0.6);

  useEffect(() => {
    if (!motion.enabled) return;
    opacity.value = withRepeat(withTiming(0.85, { duration: 700 }), -1, true);
  }, [motion.enabled, opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { height, width, borderRadius: radius.sm, backgroundColor: colors.elevated },
        animated,
        style,
      ]}
    />
  );
}

/** Card-shaped skeleton: matches what it replaces, so nothing shifts on load. */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.base,
        gap: spacing.md,
      }}
    >
      <Skeleton height={12} width="40%" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={20} width={i === lines - 1 ? '60%' : '100%'} />
      ))}
    </View>
  );
}
