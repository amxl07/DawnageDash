import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { useMotion } from '@/theme';

/**
 * Motion props for list content, already gated on reduced motion.
 *
 * None of the ten fitness apps surveyed animated list content — it is the
 * cheapest polish available. When a row is added, removed, or reordered (a new
 * check-in, a synced workout, a filtered search), the remaining rows slide to
 * their new positions instead of teleporting.
 *
 * Under reduced motion the animations are dropped entirely rather than given a
 * zero duration, because the layout pass itself is what should be skipped.
 *
 * Usage:
 *   const listMotion = useListMotion();
 *   <Animated.FlatList itemLayoutAnimation={listMotion.itemLayoutAnimation} … />
 *   // and on the row:
 *   <Animated.View entering={listMotion.entering}>…</Animated.View>
 */
export function useListMotion() {
  const motion = useMotion();
  return {
    itemLayoutAnimation: motion.enabled ? LinearTransition.duration(260) : undefined,
    entering: motion.enabled ? FadeIn.duration(220) : undefined,
    exiting: motion.enabled ? FadeOut.duration(160) : undefined,
    enabled: motion.enabled,
  };
}

/** Re-exported so screens don't each import Reanimated for one symbol. */
export const AnimatedFlatList = Animated.FlatList;
