import { memo, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { PanResponder, Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { Text } from '@/components/ui';
import { parseLocalDate } from '@/lib/dates';
import { spacing, useTheme } from '@/theme';
import { claimsChartGesture, nearestPlotDate } from './chartSelection';
import { buildTimeSeriesGeometry, pathForPoints } from './timeSeries';
import type { ChartProps, Series } from './types';

type Props = ChartProps & {
  series: Series[];
  legend?: boolean | 'names';
  /** A focused screen can replace the repeated date/value block with one headline above the plot. */
  renderReadout?: (date: string) => ReactNode;
  /** Spoken equivalent of a custom readout, including its dated comparison. */
  readoutDescription?: (date: string) => string;
  /** Prefer the primary metric's latest source date when comparison series have newer observations. */
  defaultSelectedDate?: string;
  yAxisSuffix?: string;
};

const PLOT_INSET_X = 10;
const PLOT_INSET_Y = 10;

function shortDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(
    parseLocalDate(date),
  );
}

function LineChartInner({ series, summary, height = 200, legend = true, yAxisSuffix = '', renderReadout, readoutDescription, defaultSelectedDate }: Props) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(280);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showValues, setShowValues] = useState(false);
  const touchStart = useRef({ x: 0, y: 0 });
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

  const mixedUnits = new Set(series.map((item) => item.unit ?? yAxisSuffix.trim())).size > 1;
  const plots = useMemo(
    () =>
      series.map((item) => ({
        item,
        geometry: buildTimeSeriesGeometry(item.data, {
          width,
          height,
          insetX: PLOT_INSET_X,
          insetY: PLOT_INSET_Y,
          min: mixedUnits ? Math.min(...item.data.flatMap((point) => point.value !== null && Number.isFinite(point.value) ? [point.value] : []), 0) : min,
          max: mixedUnits ? Math.max(...item.data.flatMap((point) => point.value !== null && Number.isFinite(point.value) ? [point.value] : []), 1) : max,
          fromDate: firstDate,
          toDate: lastDate,
        }),
      })),
    [firstDate, height, lastDate, max, min, mixedUnits, series, width],
  );

  const recordedDates = [...new Set(observations.map((point) => point.date))].sort();
  // A filter may remove the selected observation. Derive a valid fallback immediately.
  const selected = selectedDate && recordedDates.includes(selectedDate)
    ? selectedDate
    : defaultSelectedDate && recordedDates.includes(defaultSelectedDate) ? defaultSelectedDate : recordedDates.at(-1);
  const selectedIndex = selected ? recordedDates.indexOf(selected) : -1;
  const points = useMemo(() => plots.flatMap((plot) => plot.geometry.points), [plots]);
  const pointsRef = useRef(points);
  useLayoutEffect(() => { pointsRef.current = points; }, [points]);
  const cursor = points.find((point) => point.date === selected);
  const selectX = (x: number) => {
    const date = nearestPlotDate(points, x);
    if (date) setSelectedDate(date);
  };
  const moveSelection = (direction: number) => {
    const index = Math.max(0, Math.min(recordedDates.length - 1, selectedIndex + direction));
    if (recordedDates[index]) setSelectedDate(recordedDates[index]);
  };
  // Keep one responder for the gesture lifetime as selection causes rerenders.
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => claimsChartGesture(gesture.dx, gesture.dy),
    onPanResponderMove: (event) => {
      const date = nearestPlotDate(pointsRef.current, event.nativeEvent.locationX);
      if (date) setSelectedDate(date);
    },
    onPanResponderTerminationRequest: () => true,
  }), []);
  const valuesForDate = (date: string) => series.map((item) => {
    const point = item.data.find((point) => point.date === date && point.value !== null && Number.isFinite(point.value));
    const unit = item.unit ?? yAxisSuffix.trim();
    return `${item.name}: ${point ? `${point.value}${unit ? ` ${unit}` : ''}` : 'Not reported'}`;
  }).join(' · ');

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

  const selectedDescription = selected ? readoutDescription?.(selected) ?? `${shortDate(selected)} · ${valuesForDate(selected)}` : '';
  const readout = selected ? (
    <View accessible accessibilityRole="adjustable" accessibilityLabel="Selected recorded date"
          accessibilityHint="Swipe up or down to move to the next or previous recorded date."
          accessibilityValue={{ min: 1, max: recordedDates.length, now: selectedIndex + 1, text: selectedDescription }}
          aria-valuemin={1} aria-valuemax={recordedDates.length} aria-valuenow={selectedIndex + 1}
          aria-valuetext={selectedDescription}
          tabIndex={Platform.OS === 'web' ? 0 : undefined}
          {...(Platform.OS === 'web' ? { onKeyDown: (event: { key: string; preventDefault: () => void }) => {
            if (!['ArrowLeft', 'ArrowDown', 'ArrowRight', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            if (event.key === 'Home') setSelectedDate(recordedDates[0] ?? null);
            else if (event.key === 'End') setSelectedDate(recordedDates.at(-1) ?? null);
            else moveSelection(event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 1);
          } } : {})}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={({ nativeEvent }) => moveSelection(nativeEvent.actionName === 'increment' ? 1 : -1)}>
          {renderReadout ? renderReadout(selected) : <>
            <Text variant="label">{shortDate(selected)}</Text>
            <Text variant="bodySm" numeric>{valuesForDate(selected)}</Text>
          </>}
        </View>
  ) : null;

  return (
    <View onLayout={handleLayout}>
      {renderReadout ? <View style={{ marginBottom: spacing.md }}>{readout}</View> : null}
      <View testID="chart-plot" accessible accessibilityRole="image" accessibilityLabel={summary}
        {...responder.panHandlers}
        onTouchStart={(event) => { touchStart.current = { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY }; }}
        onTouchEnd={(event) => {
          if (Math.abs(event.nativeEvent.pageX - touchStart.current.x) < 10 && Math.abs(event.nativeEvent.pageY - touchStart.current.y) < 10) selectX(event.nativeEvent.locationX);
        }}>
      <Svg pointerEvents="none" width="100%" height={height} viewBox={`0 0 ${width} ${height}`} accessible={false}>
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
        {cursor ? <Line x1={cursor.x} x2={cursor.x} y1={PLOT_INSET_Y} y2={height - PLOT_INSET_Y} stroke={colors.borderStrong} strokeWidth={1} strokeDasharray="3 4" /> : null}
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
              r={point.date === selected ? 5 : 3.5}
              fill={colors.card}
              stroke={item.color}
              strokeWidth={2}
            />
          )),
        ])}
      </Svg>
      </View>

      {firstDate && lastDate ? (
        <View style={styles.dates}>
          <Text variant="caption" tone="muted">{shortDate(firstDate)}</Text>
          <Text variant="caption" tone="muted">{shortDate(lastDate)}</Text>
        </View>
      ) : null}

      {selected ? <View style={{ gap: spacing.xs, marginTop: spacing.md }}>
        {!renderReadout ? readout : null}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          <ChartAction label="Previous date" disabled={selectedIndex <= 0} onPress={() => moveSelection(-1)} />
          <ChartAction label="Next date" disabled={selectedIndex >= recordedDates.length - 1} onPress={() => moveSelection(1)} />
          <ChartAction label={showValues ? 'Hide values' : 'All values'} onPress={() => setShowValues((value) => !value)} />
        </View>
        {mixedUnits ? <Text variant="caption" tone="muted">Each unit uses its own vertical scale.</Text> : null}
        {showValues ? <View accessibilityRole="list" style={{ gap: spacing.sm }}>{recordedDates.map((date) => <Text key={date} variant="bodySm" numeric>{shortDate(date)} · {valuesForDate(date)}</Text>)}</View> : null}
      </View> : null}

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
                {legend !== 'names' ? <Text variant="bodySm" numeric>
                  {latest?.value ?? '—'}{latest && suffix ? ` ${suffix}` : ''}
                </Text> : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function ChartAction({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: spacing.xs, justifyContent: 'center', opacity: disabled ? 0.45 : 1, backgroundColor: pressed ? colors.elevated : 'transparent', borderRadius: 12 })}>
    <Text variant="bodySm" tone="primary">{label}</Text>
  </Pressable>;
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
