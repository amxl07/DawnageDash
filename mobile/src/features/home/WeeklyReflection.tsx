import { View } from 'react-native';
import { Text } from '@/components/ui';
import { hasWeeklySubmission, reconcileWeeklyDraft, reportingWindowLabel, weeklyReportingWindow } from '@/features/weekly/selectors';
import type { WeeklyCheckIn, WeeklyFeedbackDraft } from '@/lib/weekly-feedback';
import { spacing, useTheme } from '@/theme';
import type { HomeSection } from './types';
import { HomeProblem, HomeSectionHeading } from './TodayBrief';

type Props = {
  today: string;
  history: HomeSection<WeeklyCheckIn[]>;
  draft: WeeklyFeedbackDraft | null | undefined;
  localReady: boolean;
  draftError: boolean;
  onRetryLocal: () => void;
  onOpen: () => void;
};

export function WeeklyReflection({ today, history, draft, localReady, draftError, onRetryLocal, onOpen }: Props) {
  const { colors } = useTheme();
  if (!localReady) return null;
  if (draftError) return <HomeProblem title="Saved weekly draft couldn’t load" message="Retry to check your saved answers before starting." onRetry={onRetryLocal} />;
  if (!draft) {
    if (history.state === 'loading') return null;
    if (history.state === 'error' || history.stale) return <HomeProblem title="Weekly check-in status couldn’t load" message="Retry to check whether you have already submitted this week." onRetry={history.retry} />;
    if (hasWeeklySubmission(history.data, today)) return null;
  }
  const recovery = draft && history.state === 'ready' ? reconcileWeeklyDraft(draft, history.data, today) : { kind: 'editable' as const };
  const action = recovery.kind === 'cleanup' ? 'Finish weekly cleanup'
    : recovery.kind === 'conflict' ? 'Review saved weekly draft'
    : draft ? 'Resume weekly check-in' : 'Start weekly check-in';
  const detail = recovery.kind === 'cleanup' ? 'Your report was sent. A matching draft still needs local cleanup.'
    : recovery.kind === 'conflict' ? 'A report was already sent for this week. Your different saved answers have been kept for review.'
    : draft ? 'Your saved answers are ready to continue.' : `Share a reflection for ${reportingWindowLabel(weeklyReportingWindow(today))}.`;
  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, gap: spacing.xs }}>
      <HomeSectionHeading title="Weekly check-in" action={action} onPress={onOpen} />
      <Text variant="bodySm" tone="muted">
        {detail}
      </Text>
    </View>
  );
}
