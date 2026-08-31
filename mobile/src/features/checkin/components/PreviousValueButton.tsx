import * as Haptics from 'expo-haptics';
import { Pressable } from 'react-native';

import { Text } from '@/components/ui';
import { HIT_SLOP_MIN, radius, spacing, useTheme } from '@/theme';

type Props = {
  label: string;
  value: number | null;
  unit?: string;
  onApply: (value: number) => void;
};

function formatPreviousValue(value: number, unit?: string) {
  return `${value}${unit ? ` ${unit}` : ''}`;
}

export function PreviousValueButton({ label, value, unit, onApply }: Props) {
  const { colors } = useTheme();
  if (value === null) return null;

  const formatted = formatPreviousValue(value, unit);
  return (
    <Pressable
      onPress={() => {
        onApply(value);
        void Haptics.selectionAsync();
      }}
      accessibilityRole="button"
      accessibilityLabel={`Use previous ${label} value, ${formatted}`}
      style={({ pressed }) => ({
        minHeight: HIT_SLOP_MIN,
        alignSelf: 'flex-start',
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: colors.borderStrong,
        backgroundColor: pressed ? colors.elevated : 'transparent',
      })}
    >
      <Text variant="bodySm" tone="muted">Use previous · {formatted}</Text>
    </Pressable>
  );
}

