import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { HIT_SLOP_MIN, radius, spacing, useMotion, useTheme } from '@/theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  accessibilityHint?: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
  accessibilityHint,
}: Props) {
  const { colors } = useTheme();
  const motion = useMotion();
  const scale = useSharedValue(1);

  const inactive = disabled || loading;

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const surface: Record<Variant, ViewStyle> = {
    primary: { backgroundColor: colors.primaryFill },
    secondary: { borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'transparent' },
    ghost: { backgroundColor: 'transparent' },
  };

  const labelTone = variant === 'primary' ? 'onPrimary' : 'primary';

  return (
    <AnimatedPressable
      onPress={inactive ? undefined : onPress}
      pressRetentionOffset={16}
      onPressIn={() => {
        if (!inactive) scale.value = withSpring(motion.pressScale, motion.spring.press);
      }}
      onPressOut={() => {
        scale.value = withSpring(1, motion.spring.press);
      }}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[styles.base, surface[variant], inactive && styles.inactive, animatedStyle, style]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.onPrimary : colors.primary} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text variant="h2" tone={labelTone}>
            {label}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: HIT_SLOP_MIN + 4,
    borderRadius: radius.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  // Reduced emphasis, and non-interactive via accessibilityState + disabled.
  inactive: { opacity: 0.45 },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
