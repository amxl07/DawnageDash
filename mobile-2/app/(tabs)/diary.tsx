import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';

import { AppText } from '@/components/ui/app-text';
import { ScreenState } from '@/components/ui/screen-state';
import { StatusBanner } from '@/components/ui/status-banner';
import { TabScreenBoundary } from '@/components/ui/tab-screen-boundary';
import { useCurrentDate } from '@/domain/use-current-date';
import { MealSection } from '@/features/diary/meal-section';
import { getDiaryMealTypes } from '@/features/diary/meal-type-visibility';
import { useDailySummary, useMealTypes } from '@/features/summary/summary-hooks';
import { getOfflineColdStartState } from '@/features/summary/screen-data-state';
import { useConnectionState } from '@/query/query-provider';
import { useSession } from '@/session/session-context';
import { useTheme } from '@/theme/theme';

export default function DiaryScreen() {
  const date = useCurrentDate();
  const summaryQuery = useDailySummary(date);
  const mealTypesQuery = useMealTypes();
  const { isOnline } = useConnectionState();
  const { session } = useSession();
  const { colors, spacing } = useTheme();
  const summary = summaryQuery.data;
  const mealTypes = mealTypesQuery.data;

  if (getOfflineColdStartState({ hasData: Boolean(summary && mealTypes), isOnline, mode: session?.mode ?? 'connected' }) === 'unavailable') {
    return <TabScreenBoundary><ScreenState actionLabel="Try again" detail="Connect to the internet to load your diary for the first time." onAction={() => { void summaryQuery.refetch(); void mealTypesQuery.refetch(); }} title="Diary unavailable offline" /></TabScreenBoundary>;
  }

  if ((summaryQuery.isLoading || mealTypesQuery.isLoading) && (!summary || !mealTypes)) {
    return <TabScreenBoundary><View accessibilityLabel="Loading your diary" accessibilityRole="progressbar" style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.accent} /></View></TabScreenBoundary>;
  }
  if ((summaryQuery.isError || mealTypesQuery.isError) && (!summary || !mealTypes)) {
    return <TabScreenBoundary><ScreenState actionLabel="Try again" detail="We couldn't load your diary right now." onAction={() => { void summaryQuery.refetch(); void mealTypesQuery.refetch(); }} title="Diary unavailable" /></TabScreenBoundary>;
  }
  if (!summary || !mealTypes) return <TabScreenBoundary />;
  const meals = getDiaryMealTypes(mealTypes).map((type) => summary.meals.find((meal) => meal.mealTypeId === type.id) ?? { entries: [], mealTypeId: type.id, name: type.name });

  return (
    <TabScreenBoundary>
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ gap: spacing.lg, padding: spacing.md, paddingBottom: spacing.xxl }} refreshControl={<RefreshControl refreshing={summaryQuery.isRefetching || mealTypesQuery.isRefetching} onRefresh={() => { void summaryQuery.refetch(); void mealTypesQuery.refetch(); }} tintColor={colors.accent} />}>
      <View style={{ gap: 4 }}><AppText variant="title">Diary</AppText><AppText tone="muted">{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</AppText></View>
      {!isOnline ? <StatusBanner>Offline — showing saved data.</StatusBanner> : null}
      {summaryQuery.isError || mealTypesQuery.isError ? <StatusBanner tone="danger">Couldn’t refresh. Showing your last saved diary.</StatusBanner> : null}
      {meals.map((meal) => <MealSection key={meal.mealTypeId} meal={meal} onAddFood={() => router.navigate('/add')} />)}
    </ScrollView>
    </TabScreenBoundary>
  );
}
