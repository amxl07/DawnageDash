import { memo, useMemo } from 'react';
import { View } from 'react-native';
import { LineChart as GiftedLine } from 'react-native-gifted-charts';

import { Text } from '@/components/ui';
import { fonts, spacing, useMotion, useTheme } from '@/theme';
import type { ChartProps, Series } from './types';

type Props = ChartProps & {
  series: Series[];
  /** Show a legend with each series' latest value. */
  legend?: boolean;
  yAxisSuffix?: string;
};

function LineChartInner({ series, summary, height = 200, legend = true, yAxisSuffix = '' }: Props) {
  const { colors } = useTheme();
  const motion = useMotion();

  const datasets = useMemo(
    () =>
      series.map((s) => ({
        data: s.data.map((d) => ({ value: d.value, label: d.label })),
        color: s.color,
        dataPointsColor: s.color,
        strokeDashArray: s.dash,
      })),
    [series],
  );

  const primary = datasets[0];
  if (!primary || primary.data.length < 2) {
    return (
      <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="bodySm" tone="muted">
          Not enough data yet — check in for a few days.
        </Text>
      </View>
    );
  }

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary}>
      <GiftedLine
        data={primary.data}
        data2={datasets[1]?.data}
        data3={datasets[2]?.data}
        color1={series[0]?.color}
        color2={series[1]?.color}
        color3={series[2]?.color}
        strokeDashArray1={series[0]?.dash}
        strokeDashArray2={series[1]?.dash}
        strokeDashArray3={series[2]?.dash}
        height={height}
        thickness={2}
        curved
        hideDataPoints={primary.data.length > 14}
        dataPointsRadius={3}
        yAxisTextStyle={{ color: colors.mutedForeground, fontFamily: fonts.interRegular, fontSize: 11 }}
        xAxisLabelTextStyle={{ color: colors.mutedForeground, fontFamily: fonts.interRegular, fontSize: 10 }}
        yAxisColor={colors.border}
        xAxisColor={colors.border}
        rulesColor={colors.border}
        rulesType="solid"
        yAxisLabelSuffix={yAxisSuffix}
        backgroundColor="transparent"
        isAnimated={motion.enabled}
        animationDuration={motion.duration.enter}
        adjustToWidth
        initialSpacing={8}
      />

      {legend && series.length > 1 ? (
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm }}
        >
          {series.map((s) => {
            const latest = s.data[s.data.length - 1]?.value;
            return (
              <View
                key={s.name}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
              >
                {/* Dash preview doubles as the non-colour differentiator. */}
                <View
                  style={{
                    width: 16,
                    height: 3,
                    borderRadius: 2,
                    backgroundColor: s.color,
                    opacity: s.dash ? 0.75 : 1,
                  }}
                />
                <Text variant="bodySm" tone="muted">
                  {s.name}
                </Text>
                <Text variant="bodySm" numeric>
                  {latest ?? '—'}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

export const LineChart = memo(LineChartInner);
