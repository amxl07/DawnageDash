import { useRouter } from 'expo-router';
import { ChevronDown, Plus, Ruler, Scale } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  InteractionManager,
  Pressable,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

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
import { calculateWeeklyAverages } from '@/lib/checkin-utils';
import { MeasurementProgress } from '@/features/measurements/MeasurementProgress';
import { num, type BodyMeasurement } from '@/types/db';
import { iconSize, spacing, useTheme } from '@/theme';

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
  const listMotion = useListMotion();
  const router = useRouter();
  const { data: rows, isLoading, isError, refetch } = useMeasurements();
  const { data: checkIns } = useDailyCheckIns();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<BodyMeasurement | null>(null);
  const [payoff, setPayoff] = useState<string | null>(null);
  const [weightSummaryOpen, setWeightSummaryOpen] = useState(false);
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

  const current = rows?.[0] ?? null;

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
    return { totalWeightChange, avgWeeklyChange };
  }, [checkIns]);

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

      <MeasurementProgress rows={rows ?? []} chartReady={chartReady} onLayout={handleProgressLayout} />

      <Card style={{ gap: weightSummaryOpen ? spacing.md : 0 }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Weight summary"
          accessibilityState={{ expanded: weightSummaryOpen }} onPress={() => setWeightSummaryOpen((open) => !open)}
          style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text variant="label">Weight summary</Text>
            <Text variant="caption" tone="muted">From daily check-ins · all dates</Text>
          </View>
          <ChevronDown size={iconSize.md} color={colors.mutedForeground} accessible={false}
            style={{ transform: [{ rotate: weightSummaryOpen ? '180deg' : '0deg' }] }} />
        </Pressable>
        {weightSummaryOpen ? <AdaptiveGrid>
          <MetricCard icon={Scale} label="Weight change" value={metrics.totalWeightChange} unit="kg"
            trend={{ value: 0, goodDirection: 'up', caption: 'Since first recorded weight' }} />
          <MetricCard icon={Scale} label="Avg weekly change" value={metrics.avgWeeklyChange} unit="kg"
            trend={{ value: 0, goodDirection: 'up', caption: 'Per recorded week' }} />
        </AdaptiveGrid> : null}
      </Card>

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
