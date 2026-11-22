import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { Plus, Ruler, Scale } from 'lucide-react-native';
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
  Skeleton,
  Text,
  useListMotion,
} from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useDailyCheckIns } from '@/hooks/useDashboardData';
import { useMeasurements } from '@/hooks/useMeasurements';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { calculateWeeklyAverages } from '@/lib/checkin-utils';
import { parseLocalDate } from '@/lib/dates';
import {
  buildMeasurementChartSeries,
  measurementComparison,
} from '@/features/measurements/observations';
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

function MeasurementMetricSkeleton() {
  return (
    <Card testID="measurement-metric-skeleton" style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Skeleton width={36} height={36} />
        <Skeleton width="45%" height={14} />
      </View>
      <Skeleton width="55%" height={32} />
      <Skeleton width="70%" height={14} />
    </Card>
  );
}

export default function MeasurementsScreen() {
  const { user } = useAuth();
  return <MeasurementsContent key={user?.id ?? 'signed-out'} />;
}

function MeasurementsContent() {
  const { colors } = useTheme();
  const { isCompact } = useResponsiveLayout();
  const listMotion = useListMotion();
  const router = useRouter();
  const { data: rows, isLoading, isError, refetch } = useMeasurements();
  const { data: checkIns } = useDailyCheckIns();

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

  // Rows are newest-first. Field comparisons resolve their own valid endpoints.
  const current = rows?.[0] ?? null;
  const comparisons = useMemo(
    () =>
      Object.fromEntries(
        SERIES.map((series) => [series.key, measurementComparison(rows ?? [], series.key)]),
      ) as Record<SeriesKey, ReturnType<typeof measurementComparison>>,
    [rows],
  );

  const metrics = useMemo(() => {
    let totalWeightChange = '—';
    let avgWeeklyChange = '—';
    if (checkIns?.length) {
      const sorted = [...checkIns].sort((a, b) => (a.date < b.date ? -1 : 1));
      const first = sorted.find((c) => num(c.morning_weight) > 0);
      const last = [...sorted].reverse().find((c) => num(c.morning_weight) > 0);
      if (first && last) {
        const change = num(last.morning_weight) - num(first.morning_weight);
        totalWeightChange = change.toFixed(1);
        const weeks = calculateWeeklyAverages(checkIns).length || 1;
        avgWeeklyChange = (change / weeks).toFixed(1);
      }
    }
    const waistChange =
      comparisons.waist.delta === null ? '—' : comparisons.waist.delta.toFixed(1);
    return { totalWeightChange, avgWeeklyChange, waistChange };
  }, [checkIns, comparisons.waist.delta]);

  // Chart is oldest→newest and preserves both elapsed dates and missing observations.
  const chartSeries = useMemo(() => {
    return SERIES.filter((s) => visible.includes(s.key)).map((s) => ({
      ...buildMeasurementChartSeries(rows ?? [], {
        field: s.key,
        name: s.name,
        color: colors[
          (['chart1', 'chart2', 'chart3', 'chart4', 'chart1'] as const)[SERIES.indexOf(s)]
        ],
        dash: s.dash ? [...s.dash] : undefined,
      }),
    }));
  }, [rows, visible, colors]);

  const latestSummaries = useMemo(() => {
    return SERIES.filter((series) => visible.includes(series.key)).map((series) => {
      const comparison = comparisons[series.key];
      if (!comparison.latest) return `${series.name}: no recorded value`;
      const latest = comparison.latest.value;
      if (!comparison.baseline || comparison.delta === null) {
        return `${series.name}: ${latest} cm · first recorded ${format(
          parseLocalDate(comparison.latest.date),
          'd MMM yyyy',
        )}`;
      }
      const delta = comparison.delta;
      const change =
        delta === 0
          ? 'no change from baseline'
          : `${delta < 0 ? 'down' : 'up'} ${Math.abs(delta).toFixed(1)} cm from baseline`;
      return `${series.name}: ${latest} cm · ${change}`;
    });
  }, [comparisons, visible]);
  const latestVisibleDate = SERIES.filter((series) => visible.includes(series.key))
    .map((series) => comparisons[series.key].latest?.date)
    .filter((date): date is string => Boolean(date))
    .sort()
    .at(-1);
  const latestDateSummary = latestVisibleDate
    ? `Latest entry · recorded ${format(parseLocalDate(latestVisibleDate), 'd MMM yyyy')}`
    : 'No recorded values in the selected series';

  if (isLoading) {
    return (
      <Screen>
        <PageHeader title="Measurements" onBack={() => router.back()} />
        <View
          testID="progress-skeleton"
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel="Loading measurement progress"
          accessibilityState={{ busy: true }}
          style={{ gap: spacing.base }}
        >
          <AdaptiveGrid>
            <MeasurementMetricSkeleton />
            <MeasurementMetricSkeleton />
          </AdaptiveGrid>
          <MeasurementMetricSkeleton />
          <Card testID="measurement-chart-skeleton" style={{ gap: spacing.md, minHeight: 260 }}>
            <Skeleton width="35%" height={24} />
            <Skeleton width="72%" height={14} />
            <Skeleton height={200} />
          </Card>
          {[0, 1].map((index) => (
            <Card key={index} testID="measurement-history-skeleton" style={{ gap: spacing.sm }}>
              <Skeleton width="28%" height={18} />
              <Skeleton width="100%" height={16} />
              <Skeleton width="78%" height={16} />
            </Card>
          ))}
        </View>
      </Screen>
    );
  }

  if (isError && rows === undefined) {
    return (
      <Screen>
        <PageHeader title="Measurements" onBack={() => router.back()} />
        <ErrorState onRetry={refetch} />
      </Screen>
    );
  }

  const header = (
    <View style={{ gap: spacing.lg, marginBottom: spacing.base }}>
      <PageHeader title="Measurements" onBack={() => router.back()} />

      {isError ? (
        <ErrorState
          title="Measurements couldn’t refresh"
          message="Your saved measurements are still shown below. Retry when you’re connected."
          onRetry={refetch}
        />
      ) : null}

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
          label="Weight change"
          value={metrics.totalWeightChange}
          unit="kg"
          trend={{ value: 0, goodDirection: 'up', caption: 'Since first recorded weight' }}
        />
        <MetricCard
          icon={Ruler}
          label="Waist change"
          value={metrics.waistChange}
          unit="cm"
          trend={{ value: 0, goodDirection: 'up', caption: 'Since first recorded waist' }}
        />
      </AdaptiveGrid>
      <MetricCard
        icon={Ruler}
        label="Avg weekly change"
        value={metrics.avgWeeklyChange}
        unit="kg"
        trend={{ value: 0, goodDirection: 'up', caption: 'Per recorded week' }}
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
                summary={`Body measurements by recorded date. Missing values appear as gaps. Showing ${chartSeries.map((s) => s.name).join(', ') || 'no series'}.`}
              />
            ) : (
              <Text variant="bodySm" tone="muted">
                Chart loads when it comes into view.
              </Text>
            )}
          </View>
        </Card>
      ) : null}

      {rows && rows.length >= 2 ? (
        <Card style={{ gap: spacing.md }}>
          <Text variant="h2">Baseline vs latest</Text>
          {SERIES.map((s) => {
            const comparison = comparisons[s.key];
            if (!comparison.latest) return null;
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
                  {comparison.baseline && comparison.delta !== null ? (
                    <>
                      {comparison.baseline.value} → {comparison.latest.value} cm{'  '}
                      <Text variant="bodySm" tone="muted" numeric>
                        ({comparison.delta > 0 ? '+' : ''}{comparison.delta.toFixed(1)})
                      </Text>
                    </>
                  ) : (
                    <>{comparison.latest.value} cm · first recorded value</>
                  )}
                </Text>
              </View>
            );
          })}
        </Card>
      ) : null}

      <Button
        testID="measurement-add"
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
