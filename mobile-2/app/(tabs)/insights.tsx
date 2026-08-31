import { ActivityIndicator, ScrollView, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { useResponsiveLayout } from '@/components/ui/responsive-layout';
import { ScreenState } from '@/components/ui/screen-state';
import { StatusBanner } from '@/components/ui/status-banner';
import { TabScreenBoundary } from '@/components/ui/tab-screen-boundary';
import {
  getCalorieBarHeight,
  getCalorieChartMaximum,
  getDatedCalorieAccessibilityLabel,
} from '@/features/summary/insights-chart';
import { getOfflineColdStartState } from '@/features/summary/screen-data-state';
import { useSevenDaySummaries } from '@/features/summary/summary-hooks';
import { useConnectionState } from '@/query/query-provider';
import { useSession } from '@/session/session-context';
import { useTheme } from '@/theme/theme';

export default function InsightsScreen() {
  const { dates, results } = useSevenDaySummaries();
  const { isOnline } = useConnectionState();
  const { session } = useSession();
  const { colors, radii, spacing } = useTheme();
  const layout = useResponsiveLayout();
  const summaries = results.map((result, index) => ({ date: dates[index], summary: result.data })).filter((item): item is { date: string; summary: NonNullable<typeof item.summary> } => Boolean(item.summary));
  const anyLoading = results.some((result) => result.isLoading);
  const anyError = results.some((result) => result.isError);

  if (getOfflineColdStartState({ hasData: summaries.length > 0, isOnline, mode: session?.mode ?? 'connected' }) === 'unavailable') {
    return <TabScreenBoundary><ScreenState actionLabel="Try again" detail="Connect to the internet to load insights for the first time." onAction={() => results.forEach((result) => void result.refetch())} title="Insights unavailable offline" /></TabScreenBoundary>;
  }
  if (anyLoading && summaries.length === 0) {
    return <TabScreenBoundary><View accessibilityLabel="Loading seven day insights" accessibilityRole="progressbar" style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.accent} /></View></TabScreenBoundary>;
  }
  if (summaries.length === 0) {
    return <TabScreenBoundary><ScreenState actionLabel="Try again" detail="We couldn't load enough daily data to show a trend." onAction={() => results.forEach((result) => void result.refetch())} title="Insights unavailable" /></TabScreenBoundary>;
  }
  const maxCalories = getCalorieChartMaximum(summaries.map(({ summary }) => summary.calories));
  const average = Math.round(summaries.reduce((total, item) => total + item.summary.calories.consumed, 0) / summaries.length);

  return (
    <TabScreenBoundary>
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ gap: spacing.md, padding: spacing.md, paddingBottom: spacing.xxl }}>
      <View style={{ gap: 4 }}><AppText variant="title">Insights</AppText><AppText tone="muted">Your actual last seven days.</AppText></View>
      {!isOnline ? <StatusBanner>Offline — showing saved trend data.</StatusBanner> : null}
      {anyError ? <StatusBanner tone="danger">Some days couldn’t refresh. Available days are still shown.</StatusBanner> : null}
      <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.card, borderWidth: 1, gap: 16, padding: 20 }}>
        <View style={{ gap: 2 }}><AppText tone="muted" variant="caption">DAILY AVERAGE</AppText><AppText variant="display">{average}</AppText><AppText tone="muted">kcal across {summaries.length} available days</AppText></View>
        <View accessibilityLabel="Seven day calorie trend" style={layout === 'stacked' ? { gap: 14 } : { alignItems: 'flex-end', flexDirection: 'row', gap: 8, height: 164 }}>
          {summaries.map(({ date, summary }) => {
            const accessibilityLabel = getDatedCalorieAccessibilityLabel(date, summary.calories.consumed, summary.calories.goal);
            if (layout === 'stacked') {
              const width = getCalorieBarHeight(summary.calories.consumed, maxCalories, 100);
              return <View accessible accessibilityLabel={accessibilityLabel} accessibilityRole="text" key={date} style={{ gap: 6 }}><View style={{ alignItems: 'baseline', flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }}><AppText variant="caption">{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</AppText><AppText tone="muted" variant="caption">{Math.round(summary.calories.consumed)} kcal</AppText></View><View style={{ backgroundColor: colors.progressTrack, borderRadius: radii.pill, height: 12, overflow: 'hidden' }}><View style={{ backgroundColor: colors.accent, borderRadius: radii.pill, height: '100%', width: `${width}%` }} /></View></View>;
            }

            const height = getCalorieBarHeight(summary.calories.consumed, maxCalories, 126);
            return <View accessible accessibilityLabel={accessibilityLabel} accessibilityRole="text" key={date} style={{ alignItems: 'center', flex: 1, gap: 6, justifyContent: 'flex-end' }}><AppText variant="caption">{Math.round(summary.calories.consumed)}</AppText><View style={{ backgroundColor: colors.accent, borderRadius: radii.pill, height, width: '100%' }} /><AppText tone="muted" variant="caption">{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}</AppText></View>;
          })}
        </View>
      </View>
    </ScrollView>
    </TabScreenBoundary>
  );
}
