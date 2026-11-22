import { ChevronDown } from 'lucide-react-native';
import { useEffect } from 'react';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useMotion, useTheme } from '@/theme';

/** Decorative only: the disclosure trigger owns the expanded semantics. */
export function DisclosureChevron({ expanded, size = 18, color }: {
  expanded: boolean;
  size?: number;
  color?: string;
}) {
  const motion = useMotion();
  const { colors } = useTheme();
  const rotation = useSharedValue(expanded ? 180 : 0);
  useEffect(() => {
    cancelAnimation(rotation);
    rotation.set(motion.enabled ? withTiming(expanded ? 180 : 0, {
      duration: motion.duration.feedback,
      easing: Easing.bezier(...motion.easing.standard),
    }) : expanded ? 180 : 0);
    return () => cancelAnimation(rotation);
  }, [expanded, motion.enabled, motion.duration.feedback, motion.easing.standard, rotation]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.get()}deg` }] }));
  return <Animated.View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={animatedStyle}>
    <ChevronDown size={size} color={color ?? colors.mutedForeground} accessible={false} />
  </Animated.View>;
}
