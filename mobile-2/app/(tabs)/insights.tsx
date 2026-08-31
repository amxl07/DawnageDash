import { ActivityIndicator, ScrollView, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { ScreenState } from '@/components/ui/screen-state';
import { StatusBanner } from '@/components/ui/status-banner';
import { useSevenDaySummaries } from '@/features/summary/summary-hooks';
import { useConnectionState } from '@/query/query-provider';
import { useTheme } from '@/theme/theme';

export default function InsightsScreen() {
  const { dates, results } = useSevenDaySummaries();
  const { isOnline } = useConnectionState();
  const { colors, radii, spacing } = useTheme();
  const summaries = results.map((result, index) => ({ date: dates[index], summary: result.data })).filter((item): item is { date: string; summary: NonNullable<typeof item.summary> } => Boolean(item.summary));
  const anyLoading = results.some((result) => result.isLoading);
  const anyError = results.some((result) => result.isError);

  if (anyLoading && summaries.length === 0) {
    return <View accessibilityLabel="Loading seven day insights" accessibilityRole="progressbar" style={{ alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.accent} /></View>;
  }
  if (summaries.length === 0) {
    return <ScreenState actionLabel="Try again" detail="We couldn't load enough daily data to show a trend." onAction={() => results.forEach((result) => void result.refetch())} title="Insights unavailable" />;
  }
  const maxCalories = Math.max(...summaries.map(({ summary }) => summary.calories.goal || summary.calories.consumed), 1);
  const average = Math.round(summaries.reduce((total, item) => total + item.summary.calories.consumed, 0) / summaries.length);

  return (
    <ScrollView contentContainerStyle={{ backgroundColor: colors.background, gap: spacing.md, padding: spacing.md, paddingBottom: spacing.xxl }}>
      <View style={{ gap: 4 }}><AppText variant="title">Insights</AppText><AppText tone="muted">Your actual last seven days.</AppText></View>
      {!isOnline ? <StatusBanner>Offline — showing saved trend data.</StatusBanner> : null}
      {anyError ? <StatusBanner tone="danger">Some days couldn’t refresh. Available days are still shown.</StatusBanner> : null}
      <View style={{ backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.card, borderWidth: 1, gap: 16, padding: 20 }}>
        <View style={{ gap: 2 }}><AppText tone="muted" variant="caption">DAILY AVERAGE</AppText><AppText variant="display">{average}</AppText><AppText tone="muted">kcal across {summaries.length} available days</AppText></View>
        <View accessibilityLabel="Seven day calorie trend" accessibilityRole="image" style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 8, height: 164 }}>
          {summaries.map(({ date, summary }) => {
            const height = Math.max(8, Math.round((summary.calories.consumed / maxCalories) * 126));
            return <View key={date} style={{ alignItems: 'center', flex: 1, gap: 6, justifyContent: 'flex-end' }}><AppText variant="caption">{Math.round(summary.calories.consumed)}</AppText><View style={{ backgroundColor: colors.accent, borderRadius: radii.pill, height, width: '100%' }} /><AppText tone="muted" variant="caption">{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}</AppText></View>;
          })}
        </View>
      </View>
    </ScrollView>
  );
}
