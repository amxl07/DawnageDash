import { memo } from 'react';
import { View } from 'react-native';
import { format } from 'date-fns';
import { Card, Text } from '@/components/ui';
import { WEEKLY_STEPS } from '@/components/weekly/steps';
import { weeklyAnswer, type WeeklyCheckIn, type WeeklyFeedbackForm } from '@/lib/weekly-feedback';
import { spacing } from '@/theme';

type HistoryCardProps = { item: WeeklyCheckIn; weekNumber: number };

/** Also used to review a retained draft alongside an already-submitted report. */
export function WeeklyFeedbackAnswers({ answers }: { answers: WeeklyCheckIn | WeeklyFeedbackForm }) {
  return <>{WEEKLY_STEPS.map((section) => {
    const answered = section.fields.flatMap((field) => {
      const value = weeklyAnswer(answers, field.key);
      return value?.trim() ? [{ ...field, value }] : [];
    });
    if (!answered.length) return null;
    return (
      <View key={section.title} style={{ gap: spacing.xs, paddingTop: spacing.sm }}>
        <Text variant="label" tone="muted">{section.title}</Text>
        {answered.map(({ key, label, unit, value }) => (
          <View key={key} style={{ gap: spacing.xs }}>
            <Text variant="bodySm" tone="muted">{label}</Text>
            <Text variant="bodySm" selectable>{unit ? `${value} ${unit}` : value}</Text>
          </View>
        ))}
      </View>
    );
  })}</>;
}

export const WeeklyFeedbackHistoryCard = memo(function WeeklyFeedbackHistoryCard({ item, weekNumber }: HistoryCardProps) {
  return (
    <Card style={{ gap: spacing.sm, marginBottom: spacing.md }}>
      <Text variant="h2">Week {weekNumber}</Text>
      <Text variant="bodySm" tone="muted">
        {item.created_at ? format(new Date(item.created_at), 'd MMM yyyy') : 'Date unavailable'}
      </Text>
      <WeeklyFeedbackAnswers answers={item} />
    </Card>
  );
});
