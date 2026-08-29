import { Pressable, View } from 'react-native';

import { HIT_SLOP_MIN, radius, spacing, tabularNums, type, useTheme } from '@/theme';
import { Text } from './Text';

type Props = {
  min: number;
  max: number;
  value: number | null;
  onChange: (v: number) => void;
  label: string;
};

/**
 * Tap-a-number row. Exposed to screen readers as one adjustable control rather
 * than N unlabelled buttons (§03.A.3).
 */
export function RatingRow({ min, max, value, onChange, label }: Props) {
  const { colors } = useTheme();
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value ?? min }}
      onAccessibilityAction={(e) => {
        const current = value ?? min;
        if (e.nativeEvent.actionName === 'increment') onChange(Math.min(max, current + 1));
        if (e.nativeEvent.actionName === 'decrement') onChange(Math.max(min, current - 1));
      }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
    >
      {values.map((n) => {
        const active = value === n;
        return (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            accessibilityElementsHidden
            importantForAccessibility="no"
            style={{
              minWidth: HIT_SLOP_MIN,
              minHeight: HIT_SLOP_MIN,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.md,
              borderWidth: active ? 2 : 1,
              borderColor: active ? colors.primary : colors.borderStrong,
              backgroundColor: active ? colors.primaryFill : 'transparent',
            }}
          >
            <Text
              style={[type.body, tabularNums]}
              tone={active ? 'onPrimary' : 'default'}
            >
              {n}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
