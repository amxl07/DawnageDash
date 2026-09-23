import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Button as NativeButton, Host, HStack, ProgressView, Text as NativeText } from '@expo/ui/swift-ui';
import {
  accessibilityHint as nativeAccessibilityHint,
  accessibilityIdentifier,
  accessibilityLabel,
  accessibilityValue,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  disabled as disabledModifier,
  frame,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet } from 'react-native';

import { useReducedTransparency } from '@/hooks/useReducedTransparency';
import { useTheme } from '@/theme';
import { ButtonFallback } from './ButtonFallback';
import type { ButtonProps, ButtonSize, ButtonVariant } from './Button.types';

function resolvedSize(variant: ButtonVariant, size?: ButtonSize): ButtonSize {
  if (size) return size;
  if (variant === 'primary') return 'large';
  if (variant === 'ghost' || variant === 'text') return 'compact';
  return 'regular';
}

function glassIsAvailable() {
  try {
    return isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  } catch {
    return false;
  }
}

export function Button({
  variant = 'primary', context = 'content', size, disabled = false, loading = false,
  icon, label, onPress, style, accessibilityHint, testID,
}: ButtonProps) {
  const { colors, isDark } = useTheme();
  const reduceTransparency = useReducedTransparency();
  if (icon !== undefined && icon !== null) {
    return <ButtonFallback {...{ variant, context, size, disabled, loading, icon, label, onPress, style, accessibilityHint, testID }} />;
  }

  const inactive = disabled || loading;
  const canUseGlass = variant === 'primary' && context === 'floating' && !reduceTransparency && glassIsAvailable();
  const nativeStyle = variant === 'primary'
    ? context === 'floating' && canUseGlass ? 'glassProminent' : 'borderedProminent'
    : variant === 'secondary' || variant === 'destructive' ? 'bordered' : 'plain';
  const nativeSize = ({ compact: 'small', regular: 'regular', large: 'large' } as const)[resolvedSize(variant, size)];
  const nativeTint = variant === 'primary' ? colors.primaryFill : variant === 'destructive' ? colors.destructive : colors.primary;
  const fillWidth = variant === 'primary' || variant === 'secondary';
  const contentModifiers = [frame(fillWidth ? { maxWidth: Infinity } : { minHeight: 44 })];
  const modifiers = [
    buttonStyle(nativeStyle),
    buttonBorderShape('capsule'),
    controlSize(nativeSize),
    tint(nativeTint),
    disabledModifier(inactive),
    accessibilityLabel(label),
    ...(accessibilityHint ? [nativeAccessibilityHint(accessibilityHint)] : []),
    ...(loading ? [accessibilityValue('In progress')] : []),
    ...(testID ? [accessibilityIdentifier(testID)] : []),
  ];

  return (
    <Host matchContents={{ vertical: true }} colorScheme={isDark ? 'dark' : 'light'} seedColor={nativeTint} style={[styles.host, style]}>
      <NativeButton onPress={inactive ? undefined : onPress}
        role={variant === 'destructive' ? 'destructive' : 'default'} testID={testID} modifiers={modifiers}>
        {loading ? (
          <HStack spacing={8} alignment="center" modifiers={contentModifiers}>
            <ProgressView />
            <NativeText>{label}</NativeText>
          </HStack>
        ) : <NativeText modifiers={contentModifiers}>{label}</NativeText>}
      </NativeButton>
    </Host>
  );
}

const styles = StyleSheet.create({ host: { alignSelf: 'stretch' } });

export type { ButtonContext, ButtonProps, ButtonSize, ButtonVariant } from './Button.types';
