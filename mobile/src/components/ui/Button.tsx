import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { radius, spacing, useMotion, useTheme } from '@/theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'text' | 'destructive';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  accessibilityHint?: string;
  testID?: string;
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
  testID,
}: Props) {
  const { colors } = useTheme();
  const motion = useMotion();
  const scale = useSharedValue(1);
  const [pressed, setPressed] = useState(false);

  const inactive = disabled || loading;

  useEffect(() => {
    cancelAnimation(scale);
    if (inactive || !motion.enabled) scale.set(1);
    if (inactive) setPressed(false);
    return () => cancelAnimation(scale);
  }, [inactive, motion.enabled, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  const neutralSurface = pressed && !inactive ? colors.pressed : 'transparent';

  const surface: Record<Variant, ViewStyle> = {
    primary: { backgroundColor: inactive ? colors.borderStrong : pressed ? colors.primaryPressed : colors.primaryFill },
    secondary: { borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: neutralSurface },
    ghost: { backgroundColor: neutralSurface },
    text: { backgroundColor: neutralSurface },
    destructive: {
      borderWidth: 1,
      borderColor: colors.destructive,
      backgroundColor: neutralSurface,
    },
  };

  const labelTone =
    variant === 'primary'
      ? 'onPrimary'
      : inactive
        ? 'muted'
        : variant === 'destructive'
          ? 'destructive'
          : 'primary';

  return (
    <AnimatedPressable
      testID={testID}
      onPress={inactive ? undefined : onPress}
      pressRetentionOffset={16}
      onPressIn={() => {
        if (inactive) return;
        setPressed(true);
        scale.set(motion.enabled ? withSpring(motion.pressScale, motion.spring.press) : 1);
      }}
      onPressOut={() => {
        setPressed(false);
        scale.set(motion.enabled ? withSpring(1, motion.spring.press) : 1);
      }}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[styles.base, surface[variant], animatedStyle, style]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={variant === 'primary' ? colors.onPrimary : colors.primary} />
        ) : (
          icon
        )}
        <Text variant="label" tone={labelTone} style={styles.label}>
          {label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  content: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  label: { flexShrink: 1, textAlign: 'center' },
});
