import { Check } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Text } from '@/components/ui';
import { useMotion, useTheme } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Stage = 'running' | 'filling' | 'fading' | 'done';

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
  const [stage, setStage] = useState<Stage>('running');

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const fill = useSharedValue(progress);
  const contentOpacity = useSharedValue(1);
  const tickScale = useSharedValue(0);

  // Track the live progress while running.
  useEffect(() => {
    if (stage !== 'running') return;
    fill.value = withTiming(progress, { duration: 250, easing: Easing.linear });
  }, [progress, stage, fill]);

  // Completion choreography.
  useEffect(() => {
    if (!complete || stage !== 'running') return;

    if (!motion.enabled) {
      fill.value = 1;
      contentOpacity.value = 0;
      tickScale.value = 1;
      setStage('done');
      return;
    }

    setStage('filling');
    // (i) rush the ring to full
    fill.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }, (done) => {
      if (!done) return;
      runOnJS(setStage)('fading');
      // (ii) fade the ring and the countdown away
      contentOpacity.value = withTiming(0, { duration: 220 }, (faded) => {
        if (!faded) return;
        runOnJS(setStage)('done');
        // (iii) the tick lands
        tickScale.value = withSpring(1, { mass: 0.8, damping: 11, stiffness: 160 });
      });
    });
  }, [complete, stage, motion.enabled, fill, contentOpacity, tickScale]);

  // Reset when a new timer starts.
  useEffect(() => {
    if (complete) return;
    setStage('running');
    contentOpacity.value = 1;
    tickScale.value = 0;
  }, [complete, contentOpacity, tickScale]);

  const circleProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - fill.value),
  }));

  const ringStyle = useAnimatedStyle(() => ({ opacity: contentOpacity.value }));
  const tickStyle = useAnimatedStyle(() => ({
    opacity: tickScale.value,
    transform: [{ scale: tickScale.value }],
  }));

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessible
      accessibilityRole="timer"
      accessibilityLabel={
        stage === 'done' ? 'Rest complete' : `${mmss(remainingSeconds)} of rest remaining`
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
