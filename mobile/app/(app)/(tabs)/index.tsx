import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronDown, Flame, Trophy, Weight, Zap } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import { InteractionManager, Pressable, RefreshControl, View } from 'react-native';

import { DawnGlow, Logo } from '@/components/brand';
import { BarChart, DonutChart, LineChart } from '@/components/charts';
import { CheckInHistorySheet } from '@/components/dashboard/CheckInHistorySheet';
import { ConsistencyGrid } from '@/components/dashboard/ConsistencyGrid';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { StreakHero } from '@/components/dashboard/StreakHero';
import { TodayActionCard } from '@/components/dashboard/TodayActionCard';
import { WeekStrip } from '@/components/dashboard/WeekStrip';
import {
  Card,
  EmptyState,
  ErrorState,
  ProgressBar,
  Screen,
  SkeletonCard,
  Stagger,
  Text,
} from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useWorkoutPlan } from '@/hooks/usePlans';
import { usePlanProvenance } from '@/hooks/usePlanProvenance';
import { resolveTodayAction } from '@/lib/today-action';
import { supabase } from '@/lib/supabase';
import { buildWeekStrip, calculateStreak } from '@/lib/streak';
import { localDateString } from '@/lib/dates';
import { num } from '@/types/db';
import { iconSize, spacing, useTheme } from '@/theme';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { data: plan } = useWorkoutPlan();
  const provenance = usePlanProvenance(plan?.days);
  const [showInsights, setShowInsights] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const selectedHistoryDate = useRef<string | null>(null);
  const {
    checkIns,
    metrics,
    processed,
    weightTrend,
    weightChartData,
    performanceChartData,
    nutritionBreakdown,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useDashboardData();

  const { data: profile } = useQuery({
    queryKey: ['userProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('users')
        .select('full_name, package_start_date')
        .eq('id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const firstName = (profile?.full_name ?? '').split(' ')[0] || 'there';
  const streak = useMemo(() => calculateStreak(processed), [processed]);
  const week = useMemo(() => buildWeekStrip(processed), [processed]);
  const todayStr = localDateString();
  const checkedInToday = processed.some((p) => p.dateString === todayStr && p.status === 'done');
  const todayAction = resolveTodayAction({
    checkedInToday,
    hasWorkoutPlan: Boolean(plan?.days.length),
    planChanged: provenance.hasChanged,
  });
  const fullDate = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date());

  const dayNumber = processed.length ? processed[0].dayNumber : 0;
  const weekNumber = Math.max(1, Math.ceil(dayNumber / 7));

  // Current-week progress (last 7 entries) — targets from the web dashboard.
  const last7 = useMemo(() => (checkIns ?? []).slice(-7), [checkIns]);
  const avg = (pick: (c: (typeof last7)[number]) => number) =>
    last7.length ? last7.reduce((s, c) => s + pick(c), 0) / last7.length : 0;
  const avgSteps = avg((c) => c.daily_steps ?? 0);
  const avgNutrition = avg((c) => c.nutrition_score ?? 0);
  const weeklyWorkouts = last7.filter((c) => c.workout_status === 'done').length;
  const weeklySleep = last7.reduce((s, c) => s + num(c.sleep_hours), 0);

  const macroTotal =
    nutritionBreakdown.protein + nutritionBreakdown.carbs + nutritionBreakdown.fats;

  useEffect(() => {
    if (historyOpen || !selectedHistoryDate.current) return;

    const dateString = selectedHistoryDate.current;
    selectedHistoryDate.current = null;
    const interaction = InteractionManager.runAfterInteractions(() => {
      router.push({ pathname: '/(app)/(tabs)/check-in', params: { date: dateString } });
    });

    return () => interaction.cancel();
  }, [historyOpen, router]);

  if (isLoading) {
    return (
      <Screen archetype="root">
        <View style={{ gap: spacing.base }}>
          <SkeletonCard lines={1} />
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <SkeletonCard lines={2} />
            <SkeletonCard lines={2} />
          </View>
          <SkeletonCard lines={4} />
        </View>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen archetype="root">
        <ErrorState
          title="Couldn't load your dashboard"
          message="Check your connection and try again."
          onRetry={refetch}
        />
      </Screen>
    );
  }

  if (!checkIns?.length) {
    return (
      <Screen archetype="root">
        <View style={{ gap: spacing.lg }}>
          <View style={{ gap: spacing.xs }}>
            <Text variant="h1">{greeting()}, {firstName}</Text>
            <Text variant="bodySm" tone="muted">
              {fullDate}
            </Text>
          </View>
          <TodayActionCard action={todayAction} onPress={() => router.push(todayAction.route)} />
          <Card>
            <EmptyState
              icon={null}
              title="Welcome to Dawnage Coaching! 🎉"
              message="Your first check-in starts everything — the charts, your streak, and the weekly report your coach sees."
            />
          </Card>
        </View>
      </Screen>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
    <DawnGlow height={220} intensity={0.7} />
    <Screen
      archetype="root"
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
      }
    >
      <View style={{ gap: spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.xs }}>
            <Text variant="h1">
              {greeting()}, {firstName}
            </Text>
            <Text variant="bodySm" tone="muted">
              {fullDate}
            </Text>
            <Text variant="bodySm" tone="muted">
              {checkedInToday ? "Today's logged." : 'Your check-in is waiting.'}
            </Text>
          </View>
          {/* Quiet brand presence — the mark, tinted back, not a full lockup. */}
          <Logo variant="glyph" size={20} color={colors.mutedForeground} label={false} />
        </View>

        <TodayActionCard action={todayAction} onPress={() => router.push(todayAction.route)} />

        <StreakHero
          streak={streak}
          dayNumber={dayNumber}
          weekNumber={weekNumber}
          checkedInToday={checkedInToday}
          onCheckIn={() => router.push('/(app)/(tabs)/check-in')}
        />

        <WeekStrip
          days={week}
          onSelectDay={(d) =>
            router.push({ pathname: '/(app)/(tabs)/check-in', params: { date: d.dateString } })
          }
        />

        <ConsistencyGrid
          processed={processed}
          onOpenHistory={() => {
            selectedHistoryDate.current = null;
            setHistoryOpen(true);
          }}
        />

        <Stagger index={0}>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <MetricCard
            icon={Weight}
            label="Weight"
            value={metrics.currentWeight ? metrics.currentWeight.toFixed(1) : '—'}
            unit="kg"
            trend={{ value: weightTrend, goodDirection: 'down', caption: 'Last 7 days' }}
          />
          <MetricCard
            icon={Trophy}
            label="Workouts"
            value={String(metrics.totalWorkouts)}
            trend={{ value: 0, goodDirection: 'up', caption: 'Total tracked' }}
          />
        </View>
        </Stagger>

        <Pressable
          onPress={() => setShowInsights((shown) => !shown)}
          accessibilityRole="button"
          accessibilityLabel="Insights and trends"
          accessibilityState={{ expanded: showInsights }}
          style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
        >
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text variant="h2">Insights & trends</Text>
              <Text variant="bodySm" tone="muted">
                Energy, nutrition, charts, and weekly targets
              </Text>
            </View>
            <ChevronDown
              size={iconSize.md}
              color={colors.mutedForeground}
              strokeWidth={2}
              style={{ transform: [{ rotate: showInsights ? '180deg' : '0deg' }] }}
              accessible={false}
            />
          </Card>
        </Pressable>

        {showInsights ? (
          <View style={{ gap: spacing.lg }}>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <MetricCard
                icon={Flame}
                label="Nutrition"
                value={metrics.avgNutritionScore}
                unit="/10"
                trend={{ value: 0, goodDirection: 'up', caption: 'All-time average' }}
              />
              <MetricCard
                icon={Zap}
                label="Energy"
                value={String(metrics.avgEnergyLevel)}
                unit="/10"
                trend={{ value: 0, goodDirection: 'up', caption: 'All-time average' }}
              />
            </View>

            {weightChartData.length >= 2 ? (
              <Card style={{ gap: spacing.md }}>
                <Text variant="h2">Weight trend</Text>
                <LineChart
                  height={190}
                  legend={false}
                  series={[{ name: 'Weight', color: colors.chart1, data: weightChartData }]}
                  summary={`Weight over ${weightChartData.length} check-ins, from ${weightChartData[0].value} to ${weightChartData[weightChartData.length - 1].value} kilograms.`}
                />
              </Card>
            ) : null}

            {performanceChartData.length ? (
              <Card style={{ gap: spacing.md }}>
                <Text variant="h2">Weekly performance</Text>
                <BarChart
                  height={180}
                  maxValue={10}
                  series={[
                    {
                      name: 'Performance',
                      color: colors.chart4,
                      data: performanceChartData.map((d) => ({ label: d.day, value: d.performance })),
                    },
                    {
                      name: 'Nutrition',
                      color: colors.chart2,
                      data: performanceChartData.map((d) => ({ label: d.day, value: d.nutrition })),
                    },
                    {
                      name: 'Energy',
                      color: colors.chart3,
                      data: performanceChartData.map((d) => ({ label: d.day, value: d.energy })),
                    },
                  ]}
                  summary={`Performance, nutrition and energy scores out of ten for the last ${performanceChartData.length} days. Missed days show as zero.`}
                />
              </Card>
            ) : null}

            {macroTotal > 0 ? (
              <Card style={{ gap: spacing.md }}>
                <Text variant="h2">Macro distribution</Text>
                <DonutChart
                  height={150}
                  centerLabel="grams"
                  centerValue={String(macroTotal)}
                  slices={[
                    { name: 'Protein', value: nutritionBreakdown.protein, color: colors.chart1 },
                    { name: 'Carbs', value: nutritionBreakdown.carbs, color: colors.chart2 },
                    { name: 'Fats', value: nutritionBreakdown.fats, color: colors.chart3 },
                  ]}
                  summary={`Average daily macros: ${nutritionBreakdown.protein} grams protein, ${nutritionBreakdown.carbs} grams carbs, ${nutritionBreakdown.fats} grams fat.`}
                />
              </Card>
            ) : null}

            <Card style={{ gap: spacing.base }}>
              <Text variant="h2">Current week progress</Text>
              {[
                { label: 'Steps', now: Math.round(avgSteps), target: 10000, color: colors.success, unit: '/day avg' },
                { label: 'Nutrition', now: Number(avgNutrition.toFixed(1)), target: 10, color: colors.gold, unit: 'avg score' },
                { label: 'Workouts', now: weeklyWorkouts, target: 6, color: colors.primary, unit: 'this week' },
                { label: 'Sleep', now: Math.round(weeklySleep), target: 56, color: colors.success, unit: 'hours' },
              ].map((row) => (
                <View key={row.label} style={{ gap: spacing.xs }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text variant="bodySm">{row.label}</Text>
                    <Text variant="bodySm" tone="muted" numeric>
                      {row.now.toLocaleString()} / {row.target.toLocaleString()} {row.unit}
                    </Text>
                  </View>
                  <ProgressBar
                    value={row.now / row.target}
                    color={row.color}
                    accessibilityLabel={`${row.label}: ${row.now} of ${row.target} ${row.unit}`}
                  />
                </View>
              ))}
            </Card>
          </View>
        ) : null}
      </View>
    </Screen>
    <CheckInHistorySheet
      visible={historyOpen}
      processed={processed}
      onSelectDay={(dateString) => {
        selectedHistoryDate.current = dateString;
      }}
      onClose={() => setHistoryOpen(false)}
    />
    </View>
  );
}
