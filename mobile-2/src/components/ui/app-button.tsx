import { ActivityIndicator, Pressable, View } from 'react-native';
import type { ComponentProps } from 'react';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { useTheme } from '@/theme/theme';

type AppButtonProps = Omit<ComponentProps<typeof Pressable>, 'children' | 'style'> & {
  children: string;
  loading?: boolean;
  tone?: 'primary' | 'secondary' | 'danger';
};

export function AppButton({ accessibilityLabel, children, disabled, loading = false, onPressIn, onPressOut, tone = 'primary', ...props }: AppButtonProps) {
  const { colors, radii } = useTheme();
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const backgroundColor = tone === 'danger' ? colors.danger : tone === 'secondary' ? colors.surfaceRaised : colors.accent;
  const textTone = tone === 'secondary' ? 'default' : 'inverse';
  const unavailable = disabled || loading;
  const animateScale = (value: number) => {
    // Reanimated shared values intentionally mutate outside React's render state.
    // eslint-disable-next-line react-hooks/immutability
    scale.value = withTiming(value, { duration: reducedMotion ? 0 : 120 });
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityLabel={accessibilityLabel ?? children}
        accessibilityRole="button"
        accessibilityState={{ disabled: unavailable }}
        disabled={unavailable}
        onPressIn={(event) => {
          animateScale(0.97);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          animateScale(1);
          onPressOut?.(event);
        }}
        style={({ pressed }) => [{
          alignItems: 'center', backgroundColor, borderRadius: radii.control, justifyContent: 'center', minHeight: 48,
          opacity: unavailable ? 0.5 : pressed ? 0.84 : 1, paddingHorizontal: 20,
        }]}
        {...props}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {loading ? <ActivityIndicator color={tone === 'secondary' ? colors.text : colors.onAccent} /> : null}
          <AppText style={{ fontWeight: '700' }} tone={textTone}>{children}</AppText>
        </View>
      </Pressable>
    </Animated.View>
  );
}
