import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { InlineAction } from '@/components/ui/InlineAction';
import { parseLocalDate } from '@/lib/dates';
import { spacing, useTheme } from '@/theme';
import { recentWeightSummary } from './selectors';
import type { HomeData } from './types';

const sourceDate = (date: string) => new Intl.DateTimeFormat(undefined, {
  day: 'numeric', month: 'short', year: 'numeric',
}).format(parseLocalDate(date));

export function ProgressSummary({ history, today, onOpen }: {
  history: HomeData['checkIns'];
  today: string;
  onOpen: () => void;
}) {
  const { colors } = useTheme();
  const summary = history.state === 'ready' ? recentWeightSummary(history.data, today) : null;
  const change = summary?.previous ? Number((summary.latest.value - summary.previous.value).toFixed(1)) : null;
  const changeSign = change !== null && change < 0 ? '−' : change !== null && change > 0 ? '+' : '';
  const status = history.state === 'loading' ? 'Loading progress…'
    : history.state === 'error' ? 'Progress is unavailable. Pull down to retry.'
    : history.stale ? summary ? 'Saved data · may be out of date.' : 'Saved check-ins have no morning weight. Refresh to check for updates.'
    : history.refreshing ? 'Checking for newer check-ins…'
    : !summary ? 'No morning weight recorded yet.' : null;

  return (
    <View style={[styles.summary, { borderColor: colors.border }]} testID="home-progress-summary">
      <View style={styles.header}>
        <View style={styles.value}>
          <Text variant="bodySm" tone="muted">{summary ? 'Morning weight' : 'Progress'}</Text>
          {summary ? <Text variant="h2" numeric>{summary.latest.value.toFixed(1)} kg</Text> : null}
        </View>
        <InlineAction label="View progress" tone="neutral" onPress={onOpen} />
      </View>
      {summary ? <Text variant="bodySm" tone="muted">Check-in · {sourceDate(summary.latest.date)}</Text> : null}
      {summary?.previous && change !== null ? <Text variant="bodySm" tone="muted">{changeSign}{Math.abs(change).toFixed(1)} kg since {sourceDate(summary.previous.date)}</Text> : null}
      {status ? <Text variant="bodySm" tone="muted">{status}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { borderTopWidth: 1, paddingTop: spacing.md, gap: spacing.xs },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: spacing.md, rowGap: spacing.xs },
  value: { minWidth: 0, flexGrow: 1, flexShrink: 1, gap: spacing.xs },
});
