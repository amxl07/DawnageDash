import { Check } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/ui';
import { useMotion, useTheme } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  /** 0..1 elapsed. */
  progress: number;
  remainingSeconds: number;
  /** Flips to true the moment the timer reaches zero. */
  complete: boolean;
  size?: number;
  strokeWidth?: number;
};

const mmss = (s: number) =>
  `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/**
 * Circular rest timer with a choreographed completion.
 *
 * The three-stage finish is lifted from PerfectGymCoach's AdaptiveCircularTimer,
 * whose own comment specifies it exactly:
 *   (i)  the ring fills rapidly
 *   (ii) the ring fades away
 *   (iii) a rounded, chunky tick scales in
 * Each stage waits for the previous — chained with withTiming callbacks, the
 * Reanimated equivalent of their finishedListener.
 *
 * Deliberately NOT copied: their ring is *wavy* while running (Material 3
 * Expressive). Reproducing that here would mean regenerating a ~120-point SVG
 * path string in a worklet every frame, which is exactly the kind of thing that
 * drops frames on a mid-range Android. The state is already legible from the
 * countdown and the arc.
 */
export function CircularTimer({
  progress,
  remainingSeconds,
  complete,
  size = 200,
  strokeWidth = 10,
}: Props) {
  const { colors } = useTheme();
  const motion = useMotion();

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const showFinalImmediately = complete && !motion.enabled;

  const fill = useSharedValue(showFinalImmediately ? 1 : progress);
  const contentOpacity = useSharedValue(showFinalImmediately ? 0 : 1);
  const tickScale = useSharedValue(showFinalImmediately ? 1 : 0.92);
  const tickOpacity = useSharedValue(showFinalImmediately ? 1 : 0);

  // Completion choreography.
  useEffect(() => {
    if (!complete) {
      contentOpacity.set(1);
      tickScale.set(0.92);
      tickOpacity.set(0);
      fill.set(
        progress === 0 ? 0 : withTiming(progress, { duration: 250, easing: Easing.linear }),
      );
      return;
    }

    if (!motion.enabled) {
      fill.set(1);
      contentOpacity.set(0);
      tickScale.set(1);
      tickOpacity.set(1);
      return;
    }

    fill.set(
      withTiming(1, { duration: 180, easing: EASE_OUT }, (filled) => {
        'worklet';
        if (!filled) return;
        contentOpacity.set(
          withTiming(0, { duration: 120, easing: EASE_OUT }, (faded) => {
            'worklet';
            if (!faded) return;
            tickOpacity.set(withTiming(1, { duration: 160, easing: EASE_OUT }));
            tickScale.set(withTiming(1, { duration: 160, easing: EASE_OUT }));
          }),
        );
      }),
    );
  }, [complete, contentOpacity, fill, motion.enabled, progress, tickOpacity, tickScale]);

  const circleProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - fill.get()),
  }));

  const ringStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.get() }));
  const tickStyle = useAnimatedStyle(() => ({
    opacity: tickOpacity.get(),
    transform: [{ scale: tickScale.get() }],
  }));

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessible
      accessibilityRole="timer"
      accessibilityLabel={
        complete ? 'Rest complete' : `${mmss(remainingSeconds)} of rest remaining`
      }
    >
      <Animated.View style={[{ position: 'absolute' }, ringStyle]}>
        <Svg width={size} height={size}>
          {/* Track */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.elevated}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress — rotated so it starts at 12 o'clock */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.primary}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={circumference}
            animatedProps={circleProps}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
      </Animated.View>

      {/* Countdown — text, never only an arc. */}
      <Animated.View style={ringStyle}>
        <Text
          variant="display"
          numeric
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {mmss(remainingSeconds)}
        </Text>
      </Animated.View>

      <Animated.View
        style={[{ position: 'absolute' }, tickStyle]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        <Check size={size * 0.4} color={colors.success} strokeWidth={3} />
      </Animated.View>
    </View>
  );
}
