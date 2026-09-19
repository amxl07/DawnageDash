import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedProps,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { buildTimeSeriesGeometry, nearestDatedPointIndex, pathForPoints } from '@/components/charts/timeSeries';
import { Text } from '@/components/ui';
import { parseLocalDate } from '@/lib/dates';
import { spacing, useTheme } from '@/theme';
import type { RecentRecordSummary } from './types';

const PLOT_HEIGHT = 96;
const PLOT_INSET_X = 6;
const PLOT_INSET_Y = 8;
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const shortDate = (date: string) =>
  new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' }).format(
    parseLocalDate(date),
  );

export function RecentRecord({ summary }: { summary: RecentRecordSummary }) {
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 360 || fontScale > 1.3;
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [chartWidth, setChartWidth] = useState(280);
  const [valuesVisible, setValuesVisible] = useState(false);
  const values = summary.weightPoints.flatMap((point) =>
    point.value === null ? [] : [point.value],
  );
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const geometry = useMemo(
    () =>
      buildTimeSeriesGeometry(summary.weightPoints, {
        width: chartWidth,
        height: PLOT_HEIGHT,
        insetX: PLOT_INSET_X,
        insetY: PLOT_INSET_Y,
        min,
        max,
      }),
    [chartWidth, max, min, summary.weightPoints],
  );
  const realPoints = geometry.points;
  const rememberedIndex = realPoints.findIndex((point) => point.date === selectedDate);
  const selectedIndex = rememberedIndex >= 0 ? rememberedIndex : Math.max(0, realPoints.length - 1);
  const selected = realPoints[selectedIndex];
  const selectedX = useSharedValue(selected?.x ?? PLOT_INSET_X);
  const selectedY = useSharedValue(selected?.y ?? PLOT_HEIGHT / 2);
  const gestureIndex = useSharedValue(selectedIndex);

  useEffect(() => {
    selectedX.set(selected?.x ?? PLOT_INSET_X);
    selectedY.set(selected?.y ?? PLOT_HEIGHT / 2);
    gestureIndex.set(selectedIndex);
  }, [gestureIndex, selected?.x, selected?.y, selectedIndex, selectedX, selectedY]);

  const commitIndex = useCallback(
    (index: number) => {
      const point = realPoints[index];
      if (point) setSelectedDate(point.date);
    },
    [realPoints],
  );

  const pointXs = useMemo(() => realPoints.map((point) => point.x), [realPoints]);
  const pointYs = useMemo(() => realPoints.map((point) => point.y), [realPoints]);
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-10, 10])
        .failOffsetY([-10, 10])
        .shouldCancelWhenOutside(false)
        .onUpdate((event) => {
          'worklet';
          if (!pointXs.length) return;
          let nearest = 0;
          for (let index = 1; index < pointXs.length; index += 1) {
            if (
              Math.abs(pointXs[index] - event.x) < Math.abs(pointXs[nearest] - event.x)
            ) {
              nearest = index;
            }
          }
          selectedX.set(pointXs[nearest]);
          selectedY.set(pointYs[nearest]);
          if (gestureIndex.get() !== nearest) {
            gestureIndex.set(nearest);
            scheduleOnRN(commitIndex, nearest);
          }
        })
        .onEnd(() => {
          'worklet';
          scheduleOnRN(commitIndex, gestureIndex.get());
        }),
    [commitIndex, gestureIndex, pointXs, pointYs, selectedX, selectedY],
  );

  const crosshairProps = useAnimatedProps(() => ({
    x1: selectedX.get(),
    x2: selectedX.get(),
  }));
  const markerProps = useAnimatedProps(() => ({
    cx: selectedX.get(),
    cy: selectedY.get(),
  }));

  const chart = realPoints.length >= 2 && selected ? (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel="Weight history"
      accessibilityHint="Tap or swipe horizontally to inspect. You can also adjust to the previous or next entry."
      accessibilityValue={{
        min: 1,
        max: realPoints.length,
        now: selectedIndex + 1,
        text: `${shortDate(selected.date)}, ${selected.value.toFixed(1)} kilograms`,
      }}
      accessibilityActions={[
        { name: 'increment', label: 'Next entry' },
        { name: 'decrement', label: 'Previous entry' },
      ]}
      onAccessibilityAction={(event) => {
        const direction = event.nativeEvent.actionName === 'increment' ? 1 : -1;
        commitIndex(Math.max(0, Math.min(realPoints.length - 1, selectedIndex + direction)));
      }}
      onLayout={(event) => setChartWidth(Math.max(40, Math.round(event.nativeEvent.layout.width)))}
      onPress={(event) => {
        const nearest = nearestDatedPointIndex(realPoints, event.nativeEvent.locationX);
        commitIndex(nearest);
      }}
      style={styles.chart}
    >
      <Svg width="100%" height={PLOT_HEIGHT} viewBox={`0 0 ${chartWidth} ${PLOT_HEIGHT}`} accessible={false}>
        <Line
          x1={PLOT_INSET_X}
          x2={chartWidth - PLOT_INSET_X}
          y1={PLOT_HEIGHT / 2}
          y2={PLOT_HEIGHT / 2}
          stroke={colors.border}
          strokeWidth={1}
        />
        {geometry.segments
          .filter((segment) => segment.length > 1)
          .map((segment, index) => (
            <Path
              key={index}
              d={pathForPoints(segment)}
              fill="none"
              stroke={colors.primary}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        {realPoints.map((point) => (
          <Circle key={point.date} cx={point.x} cy={point.y} r={3} fill={colors.primary} />
        ))}
        <AnimatedLine
          animatedProps={crosshairProps}
          y1={PLOT_INSET_Y}
          y2={PLOT_HEIGHT - PLOT_INSET_Y}
          stroke={colors.mutedForeground}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <AnimatedCircle
          animatedProps={markerProps}
          r={5}
          fill={colors.card}
          stroke={colors.primary}
          strokeWidth={2.5}
        />
      </Svg>
    </Pressable>
  ) : null;

  return (
    <View style={[styles.grid, { flexDirection: stacked ? 'column' : 'row' }]}>
      <View style={[styles.metric, { borderColor: colors.border }]}>
        <Text variant="bodySm" tone="muted">Latest weight</Text>
        <View style={styles.value}>
          <Text variant="metric" numeric>
            {summary.latestWeight ? summary.latestWeight.value.toFixed(1) : '—'}
          </Text>
          <Text variant="bodySm" tone="muted">kg</Text>
        </View>
        <Text variant="bodySm" tone="muted">
          {summary.latestWeight ? shortDate(summary.latestWeight.date) : 'No entry yet'}
        </Text>

        {Platform.OS === 'web' ? chart : chart ? <GestureDetector gesture={pan}>{chart}</GestureDetector> : null}
        {realPoints.length === 1 ? (
          <Text variant="caption" tone="muted">
            {shortDate(realPoints[0].date)} · {realPoints[0].value.toFixed(1)} kg
          </Text>
        ) : selected ? (
          <Text variant="caption" tone="muted">
            {shortDate(selected.date)} · {selected.value.toFixed(1)} kg
          </Text>
        ) : null}

        {summary.weightPoints.length ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={valuesVisible ? 'Hide weight values' : 'View weight values'}
              accessibilityState={{ expanded: valuesVisible }}
              onPress={() => setValuesVisible((visible) => !visible)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.valuesButton,
                { backgroundColor: pressed ? colors.pressed : 'transparent' },
              ]}
            >
              <Text variant="bodySm" tone="primary">
                {valuesVisible ? 'Hide values' : 'View values'}
              </Text>
            </Pressable>
            {valuesVisible ? (
              <View accessibilityRole="list" style={styles.valuesList}>
                {summary.weightPoints.map((point) => (
                  <Text key={point.date} variant="caption" tone="muted">
                    {shortDate(point.date)} · {point.value === null ? 'No weight reported' : `${point.value.toFixed(1)} kg`}
                  </Text>
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </View>

      <View style={[styles.metric, { borderColor: colors.border }]}>
        <Text variant="bodySm" tone="muted">7-day sleep average</Text>
        <View style={styles.value}>
          <Text variant="metric" numeric>
            {summary.sleep.value === null ? '—' : summary.sleep.value.toFixed(1)}
          </Text>
          <Text variant="bodySm" tone="muted">hours</Text>
        </View>
        <Text variant="bodySm" tone="muted">
          {summary.sleep.samples
            ? `${summary.sleep.samples} reported ${summary.sleep.samples === 1 ? 'entry' : 'entries'}`
            : 'No reported sleep'}
        </Text>
        <Text variant="bodySm" tone="muted">
          {shortDate(summary.from)}–{shortDate(summary.to)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 24 },
  metric: {
    flex: 1,
    minWidth: 0,
    gap: spacing.sm,
    paddingTop: spacing.base,
    borderTopWidth: 1,
  },
  value: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 6 },
  chart: { minHeight: PLOT_HEIGHT, justifyContent: 'center' },
  valuesButton: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.sm, borderRadius: 10 },
  valuesList: { gap: spacing.xs },
});
