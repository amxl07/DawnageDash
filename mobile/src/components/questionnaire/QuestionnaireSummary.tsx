import { CheckCircle2 } from 'lucide-react-native';
import { View } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';
import { questionnaireSections, historicalGuidance, readbackSections, validCompletedSections, type Answers } from '@/lib/questionnaire-data';
import { iconSize, spacing, useTheme } from '@/theme';

type Props = {
  answers: Answers;
  completed?: string[];
  onEdit: () => void;
  screenHeader?: React.ReactNode;
};

/** Read-back view once all 10 sections are complete. */
export function QuestionnaireSummary({ answers, completed = [], onEdit, screenHeader }: Props) {
  const { colors } = useTheme();

  return (
    <Screen>
      {screenHeader}
      <View style={{ alignItems: 'center', gap: spacing.sm, paddingTop: spacing.base }}>
        <CheckCircle2 size={iconSize.xl} color={colors.success} strokeWidth={2} accessible={false} />
        <Text variant="h1">{validCompletedSections(answers, completed).length === questionnaireSections.length ? 'Assessment complete' : 'Assessment in progress'}</Text>
        <Text variant="bodySm" tone="muted" style={{ textAlign: 'center' }}>
          Your coach uses these answers to build your plan. You can update them any time.
        </Text>
        <Button label="Edit answers" variant="secondary" onPress={onEdit} />
      </View>

      <View style={{ gap: spacing.base, marginTop: spacing.lg }}>
        {readbackSections(answers).map((section) => {
          const answered = [...section.current, ...section.earlier];
          if (!answered.length) return null;
          return (
            <Card key={section.id} style={{ gap: spacing.md }}>
              <Text variant="h2">{section.title}</Text>
              {section.id === 'body_measurements' ? <Text variant="bodySm" tone="muted">Initial measurements in cm · {section.description}</Text> : null}
              {answered.map((q) => (
                <View key={q.id} style={{ gap: spacing.xs }}>
                  {section.earlier.includes(q) ? <Text variant="label" tone="muted">Earlier or currently hidden answer</Text> : null}
                  <Text variant="label" tone="muted">
                    {q.text}
                  </Text>
                  {historicalGuidance(q) ? <Text variant="bodySm" tone="muted">{historicalGuidance(q)}</Text> : null}
                  {q.placeholder ? <Text variant="bodySm" tone="muted">{q.placeholder}</Text> : null}
                  <Text variant="bodySm">{String(answers[q.id])}{q.type === 'rating' ? ` (${q.min ?? 1}–${q.max ?? 5})` : ''}</Text>
                </View>
              ))}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
