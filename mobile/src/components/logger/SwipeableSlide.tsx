import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useMotion } from '@/theme';
import {
  applySwipeResistance,
  decideSwipe,
  type SwipeDirection,
} from './swipeDecision';

const COMMIT_DISTANCE_RATIO = 0.25;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/**
 * Horizontal swipe between exercises, with the card following the finger.
 *
 * The stack's interactive back-swipe is already disabled on this route
 * (`gestureEnabled: false`) — without that, swiping between exercises would
 * pop the screen instead. The header X is the way out.
 *
 * `activeOffsetX` keeps this from stealing vertical scroll: the pan only
 * activates once horizontal movement passes a threshold, so scrolling the
 * logger still works normally.
 *
 * Swipe is never the only way to move — the prev/next buttons and dot pager
 * remain (§03.B.2). This is an accelerator, not the mechanism.
 */
export function SwipeableSlide({
  children,
  canPrev,
  canNext,
  onPrev,
  onNext,
}: {
  children: React.ReactNode;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const motion = useMotion();
  const { width } = useWindowDimensions();
  const translateX = useSharedValue(0);
  const gestureStartX = useSharedValue(0);
  const navigationRef = useRef({ onPrev, onNext });

  useEffect(() => {
    navigationRef.current = { onPrev, onNext };
  }, [onNext, onPrev]);

  const navigate = useCallback((direction: Exclude<SwipeDirection, 'stay'>) => {
    if (direction === 'previous') navigationRef.current.onPrev();
    else navigationRef.current.onNext();
  }, []);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-12, 12])
        .failOffsetY([-10, 10])
        .onStart(() => {
          gestureStartX.set(translateX.get());
        })
        .onUpdate((event) => {
          if (!motion.enabled) {
            translateX.set(0);
            return;
          }

          translateX.set(
            applySwipeResistance({
              startX: gestureStartX.get(),
              translationX: event.translationX,
              canPrev,
              canNext,
            }),
          );
        })
        .onEnd((event) => {
          const translationX = gestureStartX.get() + event.translationX;
          const direction = decideSwipe({
            translationX,
            velocityX: event.velocityX,
            width,
            canPrev,
            canNext,
          });

          if (!motion.enabled) {
            translateX.set(0);
            if (direction !== 'stay') scheduleOnRN(navigate, direction);
            return;
          }

          if (direction === 'stay') {
            translateX.set(
              withSpring(0, {
                duration: 400,
                dampingRatio: 0.8,
                velocity: event.velocityX,
              }),
            );
            return;
          }

          const destination =
            direction === 'next'
              ? -width * COMMIT_DISTANCE_RATIO
              : width * COMMIT_DISTANCE_RATIO;
          translateX.set(
            withTiming(destination, { duration: 180, easing: EASE_OUT }, (finished) => {
              if (!finished) return;
              translateX.set(0);
              scheduleOnRN(navigate, direction);
            }),
          );
        }),
    [canNext, canPrev, gestureStartX, motion.enabled, navigate, translateX, width],
  );

  const animated = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(translateX.get()),
      [0, width * COMMIT_DISTANCE_RATIO],
      [1, 0.72],
      Extrapolation.CLAMP,
    ),
    transform: [{ translateX: translateX.get() }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={animated}>{children}</Animated.View>
    </GestureDetector>
  );
}
