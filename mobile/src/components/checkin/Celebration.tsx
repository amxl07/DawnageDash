import { Check } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/ui';
import { radius, spacing, useMotion, useTheme } from '@/theme';

/**
 * The one big animation moment. Under reduced motion this collapses to a
 * static checkmark — the haptic and the payoff line still land.
 */
export function Celebration({ payoff }: { payoff: string }) {
  const { colors } = useTheme();
  const motion = useMotion();
  const scale = useSharedValue(motion.enabled ? 0.95 : 1);
  const opacity = useSharedValue(motion.enabled ? 0 : 1);

  useEffect(() => {
    if (!motion.enabled) return;
    opacity.value = withTiming(1, { duration: motion.duration.micro });
    scale.value = withSequence(
      withTiming(1.04, {
        duration: motion.duration.enter,
        easing: Easing.bezier(...motion.easing.standard),
      }),
      withDelay(60, withTiming(1, { duration: motion.duration.exit })),
    );
  }, [motion, opacity, scale]);

  const animated = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}>
      <Animated.View
        style={[
          {
            width: 88,
            height: 88,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.success,
          },
          animated,
        ]}
      >
        <Check size={44} color={colors.background} strokeWidth={3} accessible={false} />
      </Animated.View>
      <Text variant="h2" style={{ textAlign: 'center' }}>
        Checked in
      </Text>
      <Text variant="body" tone="muted" style={{ textAlign: 'center' }}>
        {payoff}
      </Text>
    </View>
  );
}
