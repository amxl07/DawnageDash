import { memo, useMemo } from 'react';
import { View } from 'react-native';
import { BarChart as GiftedBar } from 'react-native-gifted-charts';

import { Text } from '@/components/ui';
import { fonts, spacing, useMotion, useTheme } from '@/theme';
import type { ChartProps, Series } from './types';

type Props = ChartProps & { series: Series[]; maxValue?: number };

/** Grouped bars. Series are distinguished by colour AND the legend value. */
function BarChartInner({ series, summary, height = 200, maxValue }: Props) {
  const { colors } = useTheme();
  const motion = useMotion();

  // gifted-charts renders groups as a flat array with spacing between groups.
  const bars = useMemo(() => {
    const labels = series[0]?.data.map((d) => d.label) ?? [];
    return labels.flatMap((label, i) =>
      series.map((s, si) => ({
        value: s.data[i]?.value ?? 0,
        frontColor: s.color,
        spacing: si === series.length - 1 ? 14 : 2,
        label: si === 0 ? label : undefined,
        labelTextStyle: {
          color: colors.mutedForeground,
          fontFamily: fonts.interRegular,
          fontSize: 10,
        },
      })),
    );
  }, [series, colors.mutedForeground]);

  if (!bars.length) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="bodySm" tone="muted">
          No data for this period yet.
        </Text>
      </View>
    );
  }

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary}>
      <GiftedBar
        data={bars}
        height={height}
        barWidth={8}
        barBorderRadius={3}
        maxValue={maxValue}
        yAxisTextStyle={{ color: colors.mutedForeground, fontFamily: fonts.interRegular, fontSize: 11 }}
        yAxisColor={colors.border}
        xAxisColor={colors.border}
        rulesColor={colors.border}
        rulesType="solid"
        backgroundColor="transparent"
        isAnimated={motion.enabled}
        initialSpacing={10}
        adjustToWidth
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm }}>
        {series.map((s) => (
          <View key={s.name} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: s.color }} />
            <Text variant="bodySm" tone="muted">
              {s.name}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export const BarChart = memo(BarChartInner);
