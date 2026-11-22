import {
  CalendarDays, Check, ChevronLeft, CircleCheck, ClipboardCheck, Clock3,
  Dumbbell, Ellipsis, House, UserRound, Utensils, X, type LucideIcon,
} from 'lucide-react-native';
import { View } from 'react-native';

import { iconSize, useTheme } from '@/theme';
import type { AppSymbolName, AppSymbolProps } from './AppSymbol.types';

const FALLBACK_SYMBOLS: Record<AppSymbolName, LucideIcon> = {
  home: House,
  checkIn: ClipboardCheck,
  training: Dumbbell,
  nutrition: Utensils,
  profile: UserRound,
  back: ChevronLeft,
  close: X,
  history: Clock3,
  overflow: Ellipsis,
  calendar: CalendarDays,
  completion: CircleCheck,
};

export function AppSymbolFallback({ name, size = iconSize.md, color, accessibilityLabel, style, testID }: AppSymbolProps) {
  const { colors } = useTheme();
  const Icon = FALLBACK_SYMBOLS[name] ?? Check;
  return (
    <View accessible={accessibilityLabel !== undefined} accessibilityRole={accessibilityLabel ? 'image' : undefined}
      accessibilityLabel={accessibilityLabel} importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
      style={[{ width: size, height: size }, style]} testID={testID}>
      <Icon size={size} color={color ?? colors.foreground} strokeWidth={2} accessible={false} />
    </View>
  );
}
