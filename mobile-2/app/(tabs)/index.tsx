import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import { AppButton } from '@/components/ui/app-button';
import { AppText } from '@/components/ui/app-text';
import { NutrientBar } from '@/components/ui/nutrient-bar';
import { ScreenState } from '@/components/ui/screen-state';
import { StatusBanner } from '@/components/ui/status-banner';
import { MetricStrip } from '@/features/summary/metric-strip';
import { HeroSummary } from '@/features/summary/hero-summary';
import { useDailySummary } from '@/features/summary/summary-hooks';
import { getOfflineColdStartState } from '@/features/summary/screen-data-state';
import { formatDate } from '@/domain/date';
import { useConnectionState } from '@/query/query-provider';
import { useSession } from '@/session/session-context';
import { useTheme } from '@/theme/theme';

export default function TodayScreen() {
  const date = formatDate(new Date());
  const summaryQuery = useDailySummary(date);
  const { isOnline } = useConnectionState();
  const { session } = useSession();
  const { colors, spacing } = useTheme();
  const summary = summaryQuery.data;

  if (getOfflineColdStartState({ hasData: Boolean(summary), isOnline, mode: session?.mode ?? 'connected' }) === 'unavailable') {
    return <ScreenState actionLabel="Try again" detail="Connect to the internet to load today’s summary for the first time." onAction={() => void summaryQuery.refetch()} title="Today's summary is unavailable offline" />;
  }

  if (summaryQuery.isLoading && !summary) {
    return <View accessibilityLabel="Loading today's summary" accessibilityRole="progressbar" style={{ alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.accent} /></View>;
  }
  if (summaryQuery.isError && !summary) {
    return <ScreenState actionLabel="Try again" detail="We couldn't load today's summary." onAction={() => void summaryQuery.refetch()} title="Today's summary is unavailable" />;
  }
  if (!summary) return null;
  const hasEntries = summary.meals.some((meal) => meal.entries.length > 0);

  return (
    <ScrollView contentContainerStyle={{ backgroundColor: colors.background, gap: spacing.md, padding: spacing.md, paddingBottom: spacing.xxl }} refreshControl={<RefreshControl refreshing={summaryQuery.isRefetching} onRefresh={() => void summaryQuery.refetch()} tintColor={colors.accent} />}>
      <View style={{ gap: 4 }}>
        <AppText variant="title">Today</AppText>
        <AppText tone="muted">{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</AppText>
      </View>
      {!isOnline ? <StatusBanner>Offline — showing saved data.</StatusBanner> : null}
      {summaryQuery.isError ? <StatusBanner tone="danger">Couldn't refresh. Showing your last saved summary.</StatusBanner> : null}
      {!hasEntries ? <ScreenState actionLabel="Add food" detail="Start with a meal or snack to make today’s summary useful." onAction={() => router.navigate('/add')} title="No food logged today" /> : <>
        <HeroSummary summary={summary} />
        <MetricStrip summary={summary} />
        <View style={{ gap: spacing.sm }}>
          <AppText variant="title">Macros</AppText>
          <NutrientBar current={Math.round(summary.macros.protein)} goal={160} label="Protein" unit="g" />
          <NutrientBar current={Math.round(summary.macros.carbohydrates)} goal={275} label="Carbs" unit="g" />
          <NutrientBar current={Math.round(summary.macros.fat)} goal={70} label="Fat" unit="g" />
        </View>
        <AppButton accessibilityLabel="Add food to today" onPress={() => router.navigate('/add')}>Add food</AppButton>
      </>}
    </ScrollView>
  );
}
