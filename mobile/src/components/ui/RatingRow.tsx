import { Pressable, View } from 'react-native';

import { HIT_SLOP_MIN, radius, spacing, tabularNums, type, useTheme } from '@/theme';
import { Text } from './Text';

type CommonProps = {
  min: number;
  max: number;
  value: number | null;
  onChange: (v: number) => void;
  label: string;
};

type Props = CommonProps &
  (
    | { accessibilityMode?: 'adjustable'; optionTestIDPrefix?: never }
    | { accessibilityMode: 'options'; optionTestIDPrefix: string }
  );

/**
 * Tap-a-number row. Exposed to screen readers as one adjustable control rather
 * than N unlabelled buttons (§03.A.3).
 */
export function RatingRow({
  min,
  max,
  value,
  onChange,
  label,
  accessibilityMode = 'adjustable',
  optionTestIDPrefix,
}: Props) {
  const { colors } = useTheme();
  const values = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const exposesOptions = accessibilityMode === 'options';

  return (
    <View
      accessible={!exposesOptions}
      accessibilityRole={exposesOptions ? undefined : 'adjustable'}
      accessibilityLabel={exposesOptions ? undefined : label}
      accessibilityValue={exposesOptions ? undefined : { min, max, now: value ?? min }}
      onAccessibilityAction={
        exposesOptions
          ? undefined
          : (event) => {
              const current = value ?? min;
              if (event.nativeEvent.actionName === 'increment') {
                onChange(Math.min(max, current + 1));
              }
              if (event.nativeEvent.actionName === 'decrement') {
                onChange(Math.max(min, current - 1));
              }
            }
      }
      accessibilityActions={
        exposesOptions ? undefined : [{ name: 'increment' }, { name: 'decrement' }]
      }
      style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
    >
      {values.map((n) => {
        const active = value === n;
        return (
          <Pressable
            key={n}
            testID={exposesOptions ? `${optionTestIDPrefix}-${n}` : undefined}
            onPress={() => onChange(n)}
            accessible={exposesOptions}
            accessibilityElementsHidden={!exposesOptions}
            importantForAccessibility={exposesOptions ? 'yes' : 'no'}
            accessibilityRole={exposesOptions ? 'radio' : undefined}
            accessibilityLabel={exposesOptions ? `${label}, ${n}` : undefined}
            accessibilityState={
              exposesOptions ? { selected: active, checked: active } : undefined
            }
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
