import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { Plus, Ruler, Scale, TrendingDown } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  InteractionManager,
  Pressable,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { LineChart } from '@/components/charts';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { MeasurementHistoryRow } from '@/components/measurements/MeasurementHistoryRow';
import { MeasurementSheet } from '@/components/measurements/MeasurementSheet';
import {
  AdaptiveGrid,
  AnimatedFlatList,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Screen,
  SkeletonCard,
  Text,
  useListMotion,
} from '@/components/ui';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useMeasurements } from '@/hooks/useMeasurements';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { calculateWeeklyAverages } from '@/lib/checkin-utils';
import { parseLocalDate } from '@/lib/dates';
import { num, type BodyMeasurement } from '@/types/db';
import { iconSize, spacing, useTheme } from '@/theme';

const SERIES = [
  { key: 'chest', name: 'Chest', dash: undefined },
  { key: 'waist', name: 'Waist', dash: [6, 4] },
  { key: 'hips', name: 'Hips', dash: [2, 4] },
  { key: 'thighs', name: 'Thighs', dash: [8, 3, 2, 3] },
  { key: 'arms', name: 'Arms', dash: [1, 3] },
] as const;

type SeriesKey = (typeof SERIES)[number]['key'];

export default function MeasurementsScreen() {
  const { colors } = useTheme();
  const { isCompact } = useResponsiveLayout();
  const listMotion = useListMotion();
  const router = useRouter();
  const { data: rows, isLoading, isError, refetch } = useMeasurements();
  const { checkIns } = useDashboardData();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<BodyMeasurement | null>(null);
  const [payoff, setPayoff] = useState<string | null>(null);
  const [visible, setVisible] = useState<SeriesKey[]>(['chest', 'waist', 'hips']);
  const [chartReady, setChartReady] = useState(false);
  const chartRequested = useRef(false);
  const chartLayout = useRef<{ y: number; height: number } | null>(null);
  const viewportHeight = useRef(0);
  const scrollOffset = useRef(0);
  const pendingChartMount = useRef<
    ReturnType<typeof InteractionManager.runAfterInteractions> | null
  >(null);

  const mountChartWhenVisible = useCallback(() => {
    if (chartRequested.current) return;
    const section = chartLayout.current;
    if (!section || viewportHeight.current <= 0) return;

    const viewportTop = scrollOffset.current;
    const viewportBottom = viewportTop + viewportHeight.current;
    const sectionBottom = section.y + section.height;
    if (section.y >= viewportBottom || sectionBottom <= viewportTop) return;

    chartRequested.current = true;
    pendingChartMount.current = InteractionManager.runAfterInteractions(() => {
      setChartReady(true);
      pendingChartMount.current = null;
    });
  }, []);

  useEffect(
    () => () => {
      pendingChartMount.current?.cancel();
    },
    [],
  );

  const handleListLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewportHeight.current = event.nativeEvent.layout.height;
      mountChartWhenVisible();
    },
    [mountChartWhenVisible],
  );

  const handleProgressLayout = useCallback(
    (event: LayoutChangeEvent) => {
      chartLayout.current = {
        y: event.nativeEvent.layout.y,
        height: event.nativeEvent.layout.height,
      };
      mountChartWhenVisible();
    },
    [mountChartWhenVisible],
  );

  const handleScrollSettled = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffset.current = event.nativeEvent.contentOffset.y;
      viewportHeight.current = event.nativeEvent.layoutMeasurement.height;
      mountChartWhenVisible();
    },
    [mountChartWhenVisible],
  );

  // rows are newest-first: [0] = current, [last] = baseline (Week 0).
  const current = rows?.[0] ?? null;
  const baseline = rows?.length ? rows[rows.length - 1] : null;

  const metrics = useMemo(() => {
    let totalWeightLost = '0';
    let avgWeeklyLoss = '0';
    if (checkIns?.length) {
      const sorted = [...checkIns].sort((a, b) => (a.date < b.date ? -1 : 1));
      const first = sorted.find((c) => num(c.morning_weight) > 0);
      const last = [...sorted].reverse().find((c) => num(c.morning_weight) > 0);
      if (first && last) {
        const lost = num(first.morning_weight) - num(last.morning_weight);
        totalWeightLost = lost.toFixed(1);
        const weeks = calculateWeeklyAverages(checkIns).length || 1;
        avgWeeklyLoss = (lost / weeks).toFixed(1);
      }
    }
    const waistReduction =
      current && baseline ? (num(baseline.waist) - num(current.waist)).toFixed(0) : '0';
    return { totalWeightLost, avgWeeklyLoss, waistReduction };
  }, [checkIns, current, baseline]);

  // Chart is oldest→newest, W0 = baseline.
  const chartSeries = useMemo(() => {
    const asc = [...(rows ?? [])].reverse();
    return SERIES.filter((s) => visible.includes(s.key)).map((s) => ({
      name: s.name,
      color: colors[
        (['chart1', 'chart2', 'chart3', 'chart4', 'chart1'] as const)[SERIES.indexOf(s)]
      ],
      dash: s.dash ? [...s.dash] : undefined,
      data: asc.map((r, i) => ({ label: `W${i}`, value: num(r[s.key]) })),
    }));
  }, [rows, visible, colors]);

  const latestSummaries = useMemo(() => {
    if (!current || !baseline) return [];
    return SERIES.filter((series) => visible.includes(series.key)).map((series) => {
      const latest = num(current[series.key]);
      if (!latest) return `${series.name}: no latest value`;

      const start = num(baseline[series.key]);
      if (!start) return `${series.name}: ${latest} cm · no baseline value`;

      const delta = latest - start;
      const change =
        delta === 0
          ? 'no change from baseline'
          : `${delta < 0 ? 'down' : 'up'} ${Math.abs(delta).toFixed(1)} cm from baseline`;
      return `${series.name}: ${latest} cm · ${change}`;
    });
  }, [baseline, current, visible]);
  const latestDateSummary = current
    ? `Latest entry · recorded ${format(parseLocalDate(current.date), 'd MMM yyyy')}`
    : '';

  if (isLoading) {
    return (
      <Screen>
        <SkeletonCard lines={2} />
        <View style={{ height: spacing.base }} />
        <SkeletonCard lines={4} />
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen>
        <ErrorState onRetry={refetch} />
      </Screen>
    );
  }

  const header = (
    <View style={{ gap: spacing.lg, marginBottom: spacing.base }}>
      <PageHeader title="Measurements" onBack={() => router.back()} />

      {payoff ? (
        <Card>
          <Text tone="success" accessibilityLiveRegion="polite">
            {payoff}
          </Text>
        </Card>
      ) : null}

      <AdaptiveGrid testID="measurement-primary-metrics">
        <MetricCard
          icon={Scale}
          label="Weight lost"
          value={metrics.totalWeightLost}
          unit="kg"
          trend={{ value: 0, goodDirection: 'up', caption: 'Since day 1' }}
        />
        <MetricCard
          icon={TrendingDown}
          label="Waist"
          value={metrics.waistReduction}
          unit="cm"
          trend={{ value: 0, goodDirection: 'up', caption: 'Reduction' }}
        />
      </AdaptiveGrid>
      <MetricCard
        icon={Ruler}
        label="Avg weekly loss"
        value={metrics.avgWeeklyLoss}
        unit="kg"
        trend={{ value: 0, goodDirection: 'up', caption: 'Per week' }}
      />

      {rows && rows.length >= 2 ? (
        <Card
          testID="measurement-progress-section"
          onLayout={handleProgressLayout}
          style={{ gap: spacing.md }}
        >
          <Text variant="h2">Progress</Text>
          <View style={{ gap: spacing.xs }}>
            <Text variant="label" tone="muted">
              {latestDateSummary}
            </Text>
            {latestSummaries.map((summary) => (
              <Text key={summary} variant="bodySm" numeric>
                {summary}
              </Text>
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {SERIES.map((s) => {
              const on = visible.includes(s.key);
              return (
                <Pressable
                  key={s.key}
                  onPress={() =>
                    setVisible((p) => (on ? p.filter((k) => k !== s.key) : [...p, s.key]))
                  }
                  accessibilityRole="switch"
                  accessibilityLabel={`${s.name} series`}
                  accessibilityState={{ checked: on }}
                  style={{
                    minHeight: 44,
                    justifyContent: 'center',
                    paddingHorizontal: spacing.md,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: on ? colors.primary : colors.borderStrong,
                  }}
                >
                  <Text variant="bodySm" tone={on ? 'primary' : 'muted'}>
                    {s.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={{ minHeight: 200, justifyContent: 'center' }}>
            {chartReady ? (
              <LineChart
                height={200}
                series={chartSeries}
                yAxisSuffix=""
                summary={`Body measurements by week, week zero is your baseline. Showing ${chartSeries.map((s) => s.name).join(', ')}.`}
              />
            ) : (
              <Text variant="bodySm" tone="muted">
                Chart loads when it comes into view.
              </Text>
            )}
          </View>
        </Card>
      ) : null}

      {current && baseline && current !== baseline ? (
        <Card style={{ gap: spacing.md }}>
          <Text variant="h2">Baseline vs latest</Text>
          {SERIES.map((s) => {
            const start = num(baseline[s.key]);
            const now = num(current[s.key]);
            if (!start && !now) return null;
            const delta = now - start;
            const reduced = delta < 0;
            return (
              <View
                key={s.key}
                testID={`measurement-comparison-${s.key}`}
                style={{
                  flexDirection: isCompact ? 'column' : 'row',
                  justifyContent: 'space-between',
                  alignItems: isCompact ? 'flex-start' : 'baseline',
                  gap: isCompact ? spacing.xs : spacing.md,
                }}
              >
                <Text variant="bodySm" tone="muted">
                  {s.name}
                </Text>
                <Text variant="bodySm" numeric>
                  {start} → {now} cm{'  '}
                  <Text variant="bodySm" tone={reduced ? 'success' : 'muted'} numeric>
                    ({delta > 0 ? '+' : ''}
                    {delta.toFixed(1)})
                  </Text>
                </Text>
              </View>
            );
          })}
        </Card>
      ) : null}

      <Button
        label="Add measurements"
        icon={<Plus size={iconSize.md} color={colors.onPrimary} strokeWidth={2.5} />}
        onPress={() => {
          setEditing(null);
          setSheetOpen(true);
        }}
      />

      {rows?.length ? (
        <Text variant="h2" style={{ marginTop: spacing.sm }}>
          History
        </Text>
      ) : null}
    </View>
  );

  return (
    <>
      <Screen scroll={false}>
        <AnimatedFlatList
          data={rows ?? []}
          keyExtractor={(r) => r.id}
          ListHeaderComponent={header}
          renderItem={({ item, index }) => (
            <MeasurementHistoryRow
              row={item}
              weekNumber={(rows?.length ?? 1) - 1 - index}
              onEdit={() => {
                setEditing(item);
                setSheetOpen(true);
              }}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              icon={Ruler}
              title="No measurements yet"
              message="Your first entry becomes the baseline every future week is compared against."
              actionLabel="Add your first"
              onAction={() => {
                setEditing(null);
                setSheetOpen(true);
              }}
            />
          }
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          windowSize={7}
          itemLayoutAnimation={listMotion.itemLayoutAnimation}
          onLayout={handleListLayout}
          onScrollEndDrag={handleScrollSettled}
          onMomentumScrollEnd={handleScrollSettled}
        />
      </Screen>

      <MeasurementSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        editing={editing}
        previous={current}
        onSaved={setPayoff}
      />
    </>
  );
}
