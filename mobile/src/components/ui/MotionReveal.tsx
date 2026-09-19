import { useEffect, useRef, type ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useMotion } from '@/theme';

/** A local handoff. Children keep their identity; mounting a tab never replays it. */
export function MotionReveal({ children, revision, style, testID }: {
  children: ReactNode;
  revision?: string | number;
  style?: ViewStyle;
  testID?: string;
}) {
  const motion = useMotion();
  const previous = useRef(revision);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const changed = previous.current !== revision;
    previous.current = revision;
    cancelAnimation(opacity);
    if (motion.enabled && changed) {
      opacity.set(0.6);
      opacity.set(withTiming(1, {
        duration: motion.duration.feedback,
        easing: Easing.bezier(...motion.easing.standard),
      }));
    } else {
      opacity.set(1);
    }
    return () => cancelAnimation(opacity);
  }, [revision, motion.enabled, motion.duration.feedback, motion.easing.standard, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View testID={testID} style={[style, animatedStyle]}>{children}</Animated.View>;
}
