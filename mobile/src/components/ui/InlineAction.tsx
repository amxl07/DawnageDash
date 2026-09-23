import { Pressable, StyleSheet, View } from 'react-native';

import { HIT_SLOP_MIN, spacing, useTheme } from '@/theme';
import { AppSymbol } from './AppSymbol';
import type { AppSymbolName } from './AppSymbol.types';
import { Text } from './Text';

export type InlineActionProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  symbol?: AppSymbolName;
  accessibilityHint?: string;
  testID?: string;
};

export function InlineAction({ label, onPress, disabled = false, destructive = false, symbol, accessibilityHint, testID }: InlineActionProps) {
  const { colors } = useTheme();
  const color = disabled ? colors.mutedForeground : destructive ? colors.destructive : colors.primary;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }} disabled={disabled} hitSlop={6} onPress={disabled ? undefined : onPress}
      testID={testID} style={({ pressed }) => [styles.action, pressed && !disabled ? { backgroundColor: colors.pressed } : undefined]}>
      <View style={styles.content}>
        {symbol ? <AppSymbol name={symbol} size={16} color={color} /> : null}
        <Text variant="bodySm" style={[styles.label, { color }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  action: { minHeight: HIT_SLOP_MIN, alignSelf: 'flex-start', justifyContent: 'center', borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  content: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label: { minWidth: 0, flexShrink: 1 },
});
