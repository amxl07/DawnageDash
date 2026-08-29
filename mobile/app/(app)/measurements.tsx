import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { Plus, Ruler, Scale, TrendingDown } from 'lucide-react-native';
import { memo, useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';

import { LineChart } from '@/components/charts';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { MeasurementSheet } from '@/components/measurements/MeasurementSheet';
import { Button, Card, EmptyState, ErrorState, PageHeader, Screen, SkeletonCard, Text ,
  AnimatedFlatList,
  useListMotion,
} from '@/components/ui';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useMeasurements } from '@/hooks/useMeasurements';
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

const HistoryRow = memo(function HistoryRow({
  row,
  weekNumber,
  onEdit,
}: {
  row: BodyMeasurement;
  weekNumber: number;
  onEdit: () => void;
}) {
  const values = SERIES.map((s) => `${s.name} ${num(row[s.key]) || '—'}`).join(', ');
  return (
    <Pressable
      onPress={onEdit}
      accessibilityRole="button"
      accessibilityLabel={`Week ${weekNumber}, ${format(parseLocalDate(row.date), 'd MMMM yyyy')}. ${values}. Tap to edit.`}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, marginBottom: spacing.md })}
    >
      <Card style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text variant="h2">
            Week {weekNumber}
            {weekNumber === 0 ? ' · Baseline' : ''}
          </Text>
          <Text variant="bodySm" tone="muted">
            {format(parseLocalDate(row.date), 'd MMM yyyy')}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {SERIES.map((s) => (
            <View key={s.key} style={{ minWidth: 64 }}>
              <Text variant="label" tone="muted">
                {s.name}
              </Text>
              <Text variant="bodySm" numeric>
                {num(row[s.key]) ? `${num(row[s.key])} cm` : '—'}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    </Pressable>
  );
});

export default function MeasurementsScreen() {
  const { colors } = useTheme();
  const listMotion = useListMotion();
  const router = useRouter();
  const { data: rows, isLoading, isError, refetch } = useMeasurements();
  const { checkIns } = useDashboardData();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<BodyMeasurement | null>(null);
  const [payoff, setPayoff] = useState<string | null>(null);
  const [visible, setVisible] = useState<SeriesKey[]>(['chest', 'waist', 'hips']);

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

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
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
      </View>
      <MetricCard
        icon={Ruler}
        label="Avg weekly loss"
        value={metrics.avgWeeklyLoss}
        unit="kg"
        trend={{ value: 0, goodDirection: 'up', caption: 'Per week' }}
      />

      {rows && rows.length >= 2 ? (
        <Card style={{ gap: spacing.md }}>
          <Text variant="h2">Progress</Text>
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
                    minHeight: 36,
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
          <LineChart
            height={200}
            series={chartSeries}
            yAxisSuffix=""
            summary={`Body measurements by week, week zero is your baseline. Showing ${chartSeries.map((s) => s.name).join(', ')}.`}
          />
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
                style={{ flexDirection: 'row', justifyContent: 'space-between' }}
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
            <HistoryRow
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
