import { format } from 'date-fns';
import { ChevronDown } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';

import { LineChart } from '@/components/charts';
import type { Series } from '@/components/charts/types';
import { Card, OptionRow, SegmentedControl, Sheet, Text } from '@/components/ui';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { localDateString, parseLocalDate } from '@/lib/dates';
import { iconSize, radius, spacing, useTheme } from '@/theme';
import type { BodyMeasurement } from '@/types/db';
import { buildMeasurementChartSeries, filterMeasurementsByTimeframe, type MeasurementTimeframe } from './observations';

const METRICS = [
  { key: 'waist', name: 'Waist' },
  { key: 'chest', name: 'Chest' },
  { key: 'hips', name: 'Hips' },
  { key: 'thighs', name: 'Thighs' },
  { key: 'arms', name: 'Arms' },
] as const;
type Metric = (typeof METRICS)[number]['key'];
const TIMEFRAMES: { value: MeasurementTimeframe; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
];

function recordedDate(date: string) {
  return format(parseLocalDate(date), 'd MMM yyyy');
}

function progressReadout(primary: Series, date?: string, comparison?: Series) {
  const value = primary.data.find((point) => point.date === date)?.value ?? null;
  const baseline = primary.data.find((point) => point.value !== null);
  const delta = value !== null && baseline?.value !== null && baseline?.value !== undefined && baseline.date !== date
    ? value - baseline.value : null;
  const changeAmount = delta === null ? 0 : Number(Math.abs(delta).toFixed(2));
  const change = delta === null || !baseline
    ? 'First recorded value in this range'
    : `${delta === 0 ? 'No change' : `${delta < 0 ? 'Down' : 'Up'} ${changeAmount || 'less than 0.01'} cm`} from ${recordedDate(baseline.date)}`;
  const comparisonValue = comparison?.data.find((point) => point.date === date)?.value ?? null;
  return {
    hasValue: value !== null,
    value: value === null ? date ? 'Not reported' : 'No recorded value' : `${value} cm`,
    date: date ? `${value === null ? 'Selected date' : 'Recorded'} ${recordedDate(date)}` : null,
    change: value !== null ? change : date
      ? `No ${primary.name.toLowerCase()} measurement on this date.`
      : `No ${primary.name.toLowerCase()} measurements in this range.`,
    comparison: comparison && date ? `${comparison.name}: ${comparisonValue === null ? 'Not reported' : `${comparisonValue} cm`}` : null,
  };
}

function ProgressReadout({ readout }: { readout: ReturnType<typeof progressReadout> }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text testID="measurement-headline-value" variant={readout.hasValue ? 'metric' : 'h2'} numeric>{readout.value}</Text>
      {readout.date ? <Text testID="measurement-headline-date" variant="bodySm" tone="muted">{readout.date}</Text> : null}
      <Text testID="measurement-headline-change" variant="bodySm" tone={readout.hasValue ? 'default' : 'muted'} numeric>{readout.change}</Text>
      {readout.comparison ? <Text variant="bodySm" numeric>{readout.comparison}</Text> : null}
    </View>
  );
}

export function MeasurementProgress({ rows, chartReady, onLayout }: {
  rows: BodyMeasurement[];
  chartReady: boolean;
  onLayout: (event: LayoutChangeEvent) => void;
}) {
  const { colors } = useTheme();
  const { fontScale } = useResponsiveLayout();
  const [metric, setMetric] = useState<Metric>('waist');
  const [comparison, setComparison] = useState<Metric | null>(null);
  const [timeframe, setTimeframe] = useState<MeasurementTimeframe>('all');
  const [picker, setPicker] = useState<'metric' | 'comparison'>('metric');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showBaselineValues, setShowBaselineValues] = useState(false);
  const metricTrigger = useRef<View>(null);
  const comparisonTrigger = useRef<View>(null);
  const today = localDateString();
  const rangeRows = useMemo(() => filterMeasurementsByTimeframe(rows, timeframe, today), [rows, timeframe, today]);
  const primary = METRICS.find((item) => item.key === metric)!;
  const secondary = METRICS.find((item) => item.key === comparison);
  const chartSeries = useMemo(() => [primary, ...(secondary ? [secondary] : [])].map((item, index) => (
    buildMeasurementChartSeries(rangeRows, {
      field: item.key,
      name: item.name,
      color: index === 0 ? colors.chart1 : colors.chart2,
      dash: index === 0 ? undefined : [6, 4],
    })
  )), [colors.chart1, colors.chart2, primary, rangeRows, secondary]);
  const latestDate = [...chartSeries[0].data].reverse().find((point) => point.value !== null)?.date;
  const compactBaseline = !secondary && chartSeries[0].data.length === 1 && latestDate !== undefined;
  const hasValues = chartSeries.some((series) => series.data.some((point) => point.value !== null));
  const readoutForDate = (date?: string) => progressReadout(chartSeries[0], date, chartSeries[1]);
  const renderReadout = (date?: string) => <ProgressReadout readout={readoutForDate(date)} />;
  const readoutDescription = (date: string) => {
    const readout = readoutForDate(date);
    return [`${primary.name}: ${readout.value}`, readout.date, readout.change, readout.comparison].filter(Boolean).join('. ');
  };
  const triggerStyle = { minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.md, backgroundColor: colors.elevated, flexDirection: 'row' as const,
    alignItems: 'center' as const, justifyContent: 'space-between' as const, gap: spacing.sm };

  return (
    <Card testID="measurement-progress-section" onLayout={onLayout} style={{ gap: spacing.md }}>
      <Text variant="h2">Progress</Text>
      <Pressable ref={metricTrigger} onPress={() => { setPicker('metric'); setPickerOpen(true); }} accessibilityRole="button"
        accessibilityLabel={`Metric: ${primary.name}`} accessibilityHint="Choose a body measurement" style={triggerStyle}>
        <Text variant="label" style={{ flexShrink: 1 }}>{primary.name}</Text>
        <ChevronDown size={iconSize.md} color={colors.mutedForeground} accessible={false} />
      </Pressable>
      <SegmentedControl label="Timeframe" showLabel={false} segments={TIMEFRAMES} value={timeframe}
        onChange={setTimeframe} large={fontScale >= 1.3} />
      {compactBaseline ? <View testID="measurement-baseline" style={{ gap: spacing.sm }}>
        {renderReadout(latestDate)}
        <Pressable accessibilityRole="button" accessibilityLabel={showBaselineValues ? 'Hide values' : 'All values'}
          accessibilityState={{ expanded: showBaselineValues }} onPress={() => setShowBaselineValues((value) => !value)}
          style={{ minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: spacing.sm }}>
          <Text variant="bodySm" tone="primary">{showBaselineValues ? 'Hide values' : 'All values'}</Text>
        </Pressable>
        {showBaselineValues ? <View accessibilityRole="list">
          <Text variant="bodySm" numeric>{recordedDate(latestDate)} · {primary.name}: {chartSeries[0].data[0].value} cm</Text>
        </View> : null}
      </View> : chartReady && hasValues ? <LineChart key={`${metric}-${timeframe}`} height={200} series={chartSeries}
        legend={secondary ? 'names' : false} defaultSelectedDate={latestDate} renderReadout={renderReadout} readoutDescription={readoutDescription}
        summary={`Body measurements by recorded date. Missing values appear as gaps. Showing ${chartSeries.map((series) => series.name).join(', ')}. ${timeframe === 'all' ? 'All recorded dates through today' : `Last ${timeframe.slice(0, -1)} calendar ${timeframe === '1m' ? 'month' : 'months'} through today`}.`} /> : <>
        {renderReadout(latestDate)}
        {hasValues ? <View style={{ minHeight: 200 }} /> : null}
      </>}
      <Pressable ref={comparisonTrigger} onPress={() => { setPicker('comparison'); setPickerOpen(true); }} accessibilityRole="button"
        accessibilityLabel={secondary ? `Compare: ${secondary.name}` : 'Compare measurements'} style={triggerStyle}>
        <Text variant="bodySm" style={{ flexShrink: 1 }}>{secondary ? `Compare: ${secondary.name}` : 'Compare measurements'}</Text>
        <ChevronDown size={iconSize.md} color={colors.mutedForeground} accessible={false} />
      </Pressable>
      <Sheet visible={pickerOpen} role="choice" title={picker === 'comparison' ? 'Compare measurements' : 'Choose measurement'}
        onClose={() => setPickerOpen(false)} returnFocusRef={picker === 'comparison' ? comparisonTrigger : metricTrigger}>
        <View style={{ padding: spacing.base, gap: spacing.sm }}>
          {picker === 'comparison' ? <OptionRow label="No comparison" selected={comparison === null}
            onPress={() => { setComparison(null); setPickerOpen(false); }} /> : null}
          {METRICS.filter((item) => picker !== 'comparison' || item.key !== metric).map((item) => (
            <OptionRow key={item.key} label={item.name} selected={picker === 'comparison' ? item.key === comparison : item.key === metric}
              onPress={() => {
                if (picker === 'comparison') setComparison(item.key);
                else { setMetric(item.key); if (comparison === item.key) setComparison(null); }
                setPickerOpen(false);
              }} />
          ))}
        </View>
      </Sheet>
    </Card>
  );
}
