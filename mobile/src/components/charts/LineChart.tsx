import { memo, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { parseLocalDate } from '@/lib/dates';
import { spacing, useTheme } from '@/theme';
import { buildTimeSeriesGeometry, pathForPoints } from './timeSeries';
import type { ChartProps, Series } from './types';

type Props = ChartProps & {
  series: Series[];
  legend?: boolean;
  yAxisSuffix?: string;
};

const PLOT_INSET_X = 10;
const PLOT_INSET_Y = 10;

function shortDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(
    parseLocalDate(date),
  );
}

function LineChartInner({ series, summary, height = 200, legend = true, yAxisSuffix = '' }: Props) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(280);
  const observations = useMemo(
    () =>
      series.flatMap((item) =>
        item.data.filter(
          (point): point is { date: string; value: number } =>
            point.value !== null && Number.isFinite(point.value),
        ),
      ),
    [series],
  );
  const values = observations.map((point) => point.value);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const dates = series.flatMap((item) => item.data.map((point) => point.date)).sort();
  const firstDate = dates[0];
  const lastDate = dates.at(-1);

  const plots = useMemo(
    () =>
      series.map((item) => ({
        item,
        geometry: buildTimeSeriesGeometry(item.data, {
          width,
          height,
          insetX: PLOT_INSET_X,
          insetY: PLOT_INSET_Y,
          min,
          max,
          fromDate: firstDate,
          toDate: lastDate,
        }),
      })),
    [firstDate, height, lastDate, max, min, series, width],
  );

  const handleLayout = (event: LayoutChangeEvent) => {
    const next = Math.max(40, Math.round(event.nativeEvent.layout.width));
    setWidth((current) => (current === next ? current : next));
  };

  if (!values.length) {
    return (
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={summary}
        style={[styles.empty, { height }]}
      >
        <Text variant="bodySm" tone="muted">
          No recorded measurements for these series yet.
        </Text>
      </View>
    );
  }

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary} onLayout={handleLayout}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} accessible={false}>
        {[0.25, 0.5, 0.75].map((ratio) => (
          <Line
            key={ratio}
            x1={PLOT_INSET_X}
            x2={width - PLOT_INSET_X}
            y1={height * ratio}
            y2={height * ratio}
            stroke={colors.border}
            strokeWidth={1}
          />
        ))}
        {plots.flatMap(({ item, geometry }) => [
          ...geometry.segments
            .filter((segment) => segment.length > 1)
            .map((segment, index) => (
              <Path
                key={`${item.name}-path-${index}`}
                d={pathForPoints(segment)}
                fill="none"
                stroke={item.color}
                strokeWidth={2.3}
                strokeDasharray={item.dash?.join(' ')}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )),
          ...geometry.points.map((point) => (
            <Circle
              key={`${item.name}-${point.date}`}
              cx={point.x}
              cy={point.y}
              r={3.5}
              fill={colors.card}
              stroke={item.color}
              strokeWidth={2}
            />
          )),
        ])}
      </Svg>

      {firstDate && lastDate ? (
        <View style={styles.dates}>
          <Text variant="caption" tone="muted">{shortDate(firstDate)}</Text>
          <Text variant="caption" tone="muted">{shortDate(lastDate)}</Text>
        </View>
      ) : null}

      {legend ? (
        <View style={styles.legend}>
          {series.map((item) => {
            const latest = [...item.data]
              .reverse()
              .find((point) => point.value !== null && Number.isFinite(point.value));
            const suffix = item.unit ?? yAxisSuffix.trim();
            return (
              <View key={item.name} style={styles.legendItem}>
                <View style={styles.sample}>
                  <View style={[styles.sampleLine, { backgroundColor: item.color }]} />
                  {item.dash ? (
                    <View style={[styles.sampleGap, { backgroundColor: colors.card }]} />
                  ) : null}
                </View>
                <Text variant="bodySm" tone="muted">{item.name}</Text>
                <Text variant="bodySm" numeric>
                  {latest?.value ?? '—'}{latest && suffix ? ` ${suffix}` : ''}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  dates: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sample: { width: 18, height: 4, justifyContent: 'center', overflow: 'hidden' },
  sampleLine: { width: 18, height: 3, borderRadius: 2 },
  sampleGap: { position: 'absolute', width: 4, height: 4, left: 7 },
});

export const LineChart = memo(LineChartInner);
