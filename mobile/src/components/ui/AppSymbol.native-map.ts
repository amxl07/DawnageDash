import type { SFSymbol } from 'expo-symbols';

import type { AppSymbolName } from './AppSymbol.types';

export const NATIVE_APP_SYMBOLS = {
  home: { default: 'house', selected: 'house.fill' },
  checkIn: { default: 'checkmark.circle', selected: 'checkmark.circle.fill' },
  training: { default: 'dumbbell', selected: 'dumbbell.fill' },
  nutrition: { default: 'fork.knife' },
  profile: { default: 'person.crop.circle', selected: 'person.crop.circle.fill' },
  back: { default: 'chevron.backward' },
  close: { default: 'xmark' },
  history: { default: 'clock.arrow.circlepath' },
  overflow: { default: 'ellipsis' },
  calendar: { default: 'calendar' },
  completion: { default: 'checkmark.circle.fill' },
} as const satisfies Record<AppSymbolName, { default: SFSymbol; selected?: SFSymbol }>;

export function nativeAppSymbolName(name: AppSymbolName, selected = false): SFSymbol {
  const symbol = NATIVE_APP_SYMBOLS[name];
  return selected && 'selected' in symbol ? symbol.selected : symbol.default;
}
