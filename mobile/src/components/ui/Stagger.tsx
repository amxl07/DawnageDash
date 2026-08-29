import { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';

import { useMotion } from '@/theme';

/**
 * Staggered fade+rise for a list of cards. First render only — callers key it
 * so it doesn't replay on every data refresh. No-op under reduced motion.
 */
export function Stagger({
  index,
  children,
  style,
}: {
  index: number;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const motion = useMotion();
  const progress = useSharedValue(motion.enabled ? 0 : 1);

  useEffect(() => {
    if (!motion.enabled) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      Math.min(index, 8) * 60,
      withTiming(1, {
        duration: motion.duration.enter,
        easing: Easing.bezier(...motion.easing.standard),
      }),
    );
  }, [index, motion, progress]);

  const animated = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 12 }],
  }));

  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
