import { Pressable } from 'react-native';

import { Text } from '@/components/ui';
import { HIT_SLOP_MIN, radius, spacing, useTheme } from '@/theme';

type Props = {
  dayNumber: number;
  focus?: string | null;
  active: boolean;
  onPress: () => void;
};

export function PlanDayButton({ dayNumber, focus, active, onPress }: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={`Day ${dayNumber}${focus ? `, ${focus}` : ''}`}
      accessibilityState={{ selected: active }}
      style={{
        minHeight: HIT_SLOP_MIN,
        justifyContent: 'center',
        paddingHorizontal: spacing.base,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.borderStrong,
        backgroundColor: active ? colors.primaryFill : 'transparent',
      }}
    >
      <Text variant="bodySm" tone={active ? 'onPrimary' : 'muted'}>
        Day {dayNumber}
      </Text>
    </Pressable>
  );
}
