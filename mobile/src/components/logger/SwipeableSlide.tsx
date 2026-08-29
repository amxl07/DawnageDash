import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useMotion } from '@/theme';

const SWIPE_THRESHOLD = 60;
const SWIPE_VELOCITY = 500;

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
  const translateX = useSharedValue(0);

  const pan = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      // Resist at the ends so the boundary is felt, not just enforced.
      const atEdge = (e.translationX > 0 && !canPrev) || (e.translationX < 0 && !canNext);
      translateX.value = atEdge ? e.translationX * 0.25 : e.translationX;
    })
    .onEnd((e) => {
      const passed =
        Math.abs(e.translationX) > SWIPE_THRESHOLD || Math.abs(e.velocityX) > SWIPE_VELOCITY;

      if (passed && e.translationX < 0 && canNext) {
        runOnJS(onNext)();
      } else if (passed && e.translationX > 0 && canPrev) {
        runOnJS(onPrev)();
      }
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    });

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // With reduced motion the card should not track the finger at all; the
  // buttons remain the way to move.
  if (!motion.enabled) return <>{children}</>;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={animated}>{children}</Animated.View>
    </GestureDetector>
  );
}
