import { Pressable, StyleSheet } from 'react-native';

import { HIT_SLOP_MIN, iconSize, useTheme } from '@/theme';
import { AppSymbol } from './AppSymbol';
import type { ToolbarActionProps } from './ToolbarAction.types';

export function ToolbarActionFallback({ label, symbol, onPress, disabled = false, destructive = false, accessibilityHint, style, testID }: ToolbarActionProps) {
  const { colors } = useTheme();
  const color = disabled ? colors.mutedForeground : destructive ? colors.destructive : colors.primary;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }} disabled={disabled} hitSlop={6} onPress={disabled ? undefined : onPress}
      testID={testID} style={({ pressed }) => [styles.action, pressed && !disabled ? { backgroundColor: colors.pressed } : undefined, style]}>
      <AppSymbol name={symbol} size={iconSize.md} color={color} testID={testID ? `${testID}-symbol` : undefined} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: { width: HIT_SLOP_MIN, minHeight: HIT_SLOP_MIN, alignItems: 'center', justifyContent: 'center', borderRadius: HIT_SLOP_MIN / 2 },
});
