import { CheckCircle2 } from 'lucide-react-native';
import { View } from 'react-native';

import { Button, Card, Screen, Text } from '@/components/ui';
import { questionnaireSections } from '@/lib/questionnaire-data';
import { iconSize, spacing, useTheme } from '@/theme';

type Props = {
  answers: Record<string, string | number>;
  onEdit: () => void;
  screenHeader?: React.ReactNode;
};

/** Read-back view once all 10 sections are complete. */
export function QuestionnaireSummary({ answers, onEdit, screenHeader }: Props) {
  const { colors } = useTheme();

  return (
    <Screen>
      {screenHeader}
      <View style={{ alignItems: 'center', gap: spacing.sm, paddingTop: spacing.base }}>
        <CheckCircle2 size={iconSize.xl} color={colors.success} strokeWidth={2} accessible={false} />
        <Text variant="h1">Assessment complete</Text>
        <Text variant="bodySm" tone="muted" style={{ textAlign: 'center' }}>
          Your coach uses these answers to build your plan. You can update them any time.
        </Text>
        <Button label="Edit answers" variant="secondary" onPress={onEdit} />
      </View>

      <View style={{ gap: spacing.base, marginTop: spacing.lg }}>
        {questionnaireSections.map((section) => {
          const answered = section.questions.filter((q) => {
            const v = answers[q.id];
            return v !== undefined && v !== null && String(v).trim() !== '';
          });
          if (!answered.length) return null;

          return (
            <Card key={section.id} style={{ gap: spacing.md }}>
              <Text variant="h2">{section.title}</Text>
              {answered.map((q) => (
                <View key={q.id} style={{ gap: spacing.xs }}>
                  <Text variant="label" tone="muted">
                    {q.text}
                  </Text>
                  <Text variant="bodySm">{String(answers[q.id])}</Text>
                </View>
              ))}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
