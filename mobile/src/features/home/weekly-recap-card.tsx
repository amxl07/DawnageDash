import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { InlineAction } from '@/components/ui/InlineAction';
import { reportingWindowLabel } from '@/features/weekly/selectors';
import { parseLocalDate } from '@/lib/dates';
import { spacing, useTheme } from '@/theme';
import type { HomeData } from './types';
import { weeklyRecap } from './weekly-recap';

const sourceDate = (date: string) => new Intl.DateTimeFormat(undefined, {
  day: 'numeric', month: 'short', year: 'numeric',
}).format(parseLocalDate(date));

export function WeeklyRecap({ history, workouts, today, onOpen }: {
  history: HomeData['checkIns'];
  workouts: HomeData['workouts'];
  today: string;
  onOpen: () => void;
}) {
  const { colors } = useTheme();
  const summary = weeklyRecap(history.state === 'ready' ? history.data : [], workouts.state === 'ready' ? workouts.data : [], today);
  const { weight } = summary;
  const changeSign = weight.change !== null && weight.change < 0 ? '−' : weight.change !== null && weight.change > 0 ? '+' : '';
  const weightStatus = history.state === 'loading' ? 'Loading progress…'
    : history.state === 'error' ? 'Progress is unavailable. Pull down to retry.'
    : history.stale ? weight.latest ? 'Saved data · may be out of date.' : 'Saved check-ins have no morning weight. Refresh to check for updates.'
    : history.refreshing ? 'Checking for newer check-ins…'
    : !weight.latest ? 'No morning weight recorded yet.' : null;
  const workoutStatus = workouts.state === 'loading' ? 'Loading workouts…'
    : workouts.state === 'error' ? 'Workout history is unavailable. Pull down to retry.'
    : workouts.stale ? 'Saved workout history may be out of date.'
    : workouts.refreshing ? 'Checking for newer workouts…'
    : !summary.workouts.logged ? 'No synced workouts this week.' : null;
  const counts = summary.workouts;
  const workoutDetails = [
    `${counts.logged} recorded`,
    ...(counts.completed ? [`${counts.completed} completed`] : []),
    ...(counts.partial ? [`${counts.partial} partial`] : []),
    ...(counts.unknown ? [`${counts.unknown} completion unknown`] : []),
  ].join(' · ');

  return (
    <View style={[styles.recap, { borderColor: colors.border }]} testID="home-weekly-recap">
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text variant="label">Week so far</Text>
          <Text variant="bodySm" tone="muted" selectable>{reportingWindowLabel(summary.window)}</Text>
        </View>
        <InlineAction label="View progress" tone="neutral" onPress={onOpen} />
      </View>
      <View style={styles.observation}>
        <Text variant="bodySm" tone="muted">Workouts</Text>
        {counts.logged > 0 ? <>
          <Text variant="body" numeric selectable>{workoutDetails}</Text>
        </> : null}
        {workoutStatus ? <Text variant="bodySm" tone="muted" selectable>{workoutStatus}</Text> : null}
      </View>
      <View style={styles.observation}>
        <Text variant="bodySm" tone="muted">Morning weight</Text>
        {weight.latest ? <>
          <Text variant="h2" numeric selectable>{weight.latest.value.toFixed(1)} kg</Text>
          <Text variant="bodySm" tone="muted" selectable>Check-in · {sourceDate(weight.latest.date)}</Text>
          {weight.change !== null ? <Text variant="bodySm" tone="muted" selectable>{changeSign}{Math.abs(weight.change).toFixed(1)} kg across {weight.observations.length} dates this week</Text>
            : weight.observations.length === 1 ? <Text variant="bodySm" tone="muted">1 weigh-in this week.</Text>
            : <Text variant="bodySm" tone="muted">{history.state === 'ready' && !history.stale && !history.refreshing
              ? 'Before this week · No weight observations in this window.' : 'Latest saved weight · Before this week.'}</Text>}
        </> : null}
        {weightStatus ? <Text variant="bodySm" tone="muted" selectable>{weightStatus}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  recap: { borderTopWidth: 1, paddingTop: spacing.md, gap: spacing.md },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: spacing.md, rowGap: spacing.xs },
  heading: { flexGrow: 1, flexShrink: 1, minWidth: 0, gap: spacing.xs },
  observation: { gap: spacing.xs },
});
