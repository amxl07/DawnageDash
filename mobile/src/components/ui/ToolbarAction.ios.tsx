import { Button as NativeButton, Host } from '@expo/ui/swift-ui';
import {
  accessibilityHint as nativeAccessibilityHint, accessibilityIdentifier, accessibilityLabel,
  buttonStyle, controlSize, disabled as disabledModifier, frame, labelStyle, tint,
} from '@expo/ui/swift-ui/modifiers';

import { HIT_SLOP_MIN, useTheme } from '@/theme';
import { nativeAppSymbolName } from './AppSymbol.native-map';
import type { ToolbarActionProps } from './ToolbarAction.types';

export function ToolbarAction({ label, symbol, onPress, disabled = false, destructive = false, accessibilityHint, style, testID }: ToolbarActionProps) {
  const { colors, isDark } = useTheme();
  const color = disabled ? colors.mutedForeground : destructive ? colors.destructive : colors.primary;
  const modifiers = [
    buttonStyle('plain'), labelStyle('iconOnly'), controlSize('regular'), frame({ width: HIT_SLOP_MIN, height: HIT_SLOP_MIN }),
    tint(color), disabledModifier(disabled), accessibilityLabel(label),
    ...(accessibilityHint ? [nativeAccessibilityHint(accessibilityHint)] : []),
    ...(testID ? [accessibilityIdentifier(testID)] : []),
  ];
  return (
    <Host matchContents colorScheme={isDark ? 'dark' : 'light'} seedColor={color} style={style}>
      <NativeButton label={label} systemImage={nativeAppSymbolName(symbol)} role={destructive ? 'destructive' : 'default'}
        onPress={disabled ? undefined : onPress} modifiers={modifiers} testID={testID} />
    </Host>
  );
}

export type { ToolbarActionProps } from './ToolbarAction.types';
