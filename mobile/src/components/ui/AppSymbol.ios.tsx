import { SymbolView } from 'expo-symbols';

import { iconSize, useTheme } from '@/theme';
import { AppSymbolFallback } from './AppSymbolFallback';
import { nativeAppSymbolName } from './AppSymbol.native-map';
import type { AppSymbolProps } from './AppSymbol.types';

export function AppSymbol({ name, selected = false, size = iconSize.md, color, accessibilityLabel, style, testID }: AppSymbolProps) {
  const { colors } = useTheme();
  const tintColor = color ?? colors.foreground;
  return (
    <SymbolView name={nativeAppSymbolName(name, selected)} size={size} tintColor={tintColor}
      weight={selected ? 'semibold' : 'regular'} accessibilityLabel={accessibilityLabel}
      accessible={accessibilityLabel !== undefined} style={style} testID={testID}
      fallback={<AppSymbolFallback name={name} selected={selected} size={size} color={tintColor}
        accessibilityLabel={accessibilityLabel} style={style} testID={testID} />} />
  );
}

export type { AppSymbolName, AppSymbolProps } from './AppSymbol.types';
