import { memo, useMemo } from 'react';
import { View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

import { Text } from '@/components/ui';
import { spacing, useTheme } from '@/theme';
import type { ChartProps } from './types';

type Slice = { name: string; value: number; color: string };
type Props = ChartProps & { slices: Slice[]; centerLabel: string; centerValue: string };

function DonutChartInner({ slices, summary, centerLabel, centerValue, height = 160 }: Props) {
  const { colors } = useTheme();

  const data = useMemo(
    () => slices.map((s) => ({ value: s.value, color: s.color })),
    [slices],
  );
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  if (total <= 0) return null;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary}>
      <View style={{ alignItems: 'center' }}>
        <PieChart
          data={data}
          donut
          radius={height / 2}
          innerRadius={height / 3.2}
          innerCircleColor={colors.card}
          centerLabelComponent={() => (
            <View style={{ alignItems: 'center' }}>
              <Text variant="h2" numeric>
                {centerValue}
              </Text>
              <Text variant="label" tone="muted">
                {centerLabel}
              </Text>
            </View>
          )}
        />
      </View>

      {/* Values are always readable as text — never colour-only (§03.A.6). */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: spacing.base,
          marginTop: spacing.md,
        }}
      >
        {slices.map((s) => (
          <View key={s.name} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: s.color }} />
            <Text variant="bodySm" tone="muted">
              {s.name}
            </Text>
            <Text variant="bodySm" numeric>
              {s.value}g
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export const DonutChart = memo(DonutChartInner);
