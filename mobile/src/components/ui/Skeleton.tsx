import { NavigationContext } from 'expo-router/react-navigation';
import { useContext, useEffect, useState } from 'react';
import { AppState, View, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
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
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => navigation?.isFocused() ?? true);
  const [active, setActive] = useState(() => AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  const opacity = useSharedValue(motion.enabled ? 0.4 : 0.6);

  useEffect(() => {
    const app = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    const focus = navigation?.addListener('focus', () => setFocused(true));
    const blur = navigation?.addListener('blur', () => setFocused(false));
    // Re-read after subscribing in case navigation changed between render and effect.
    setFocused(navigation?.isFocused() ?? true);
    setActive(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
    return () => { app.remove(); focus?.(); blur?.(); };
  }, [navigation]);

  useEffect(() => {
    cancelAnimation(opacity);
    opacity.set(motion.enabled && focused && active
      ? withRepeat(withTiming(0.85, { duration: 700 }), -1, true)
      : 0.6);
    return () => cancelAnimation(opacity);
  }, [active, focused, motion.enabled, opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.get() }));

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
