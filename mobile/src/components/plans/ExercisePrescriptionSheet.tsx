import * as WebBrowser from 'expo-web-browser';
import { Play } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Sheet, SheetScrollView, Text } from '@/components/ui';
import type { PlanExercise } from '@/hooks/usePlans';
import { HIT_SLOP_MIN, iconSize, radius, spacing, useTheme } from '@/theme';

type Props = {
  visible: boolean;
  exercise: PlanExercise | null;
  onClose: () => void;
  onSubstitute?: (exercise: PlanExercise) => void;
};

const countLabel = (count: number, singular: string, plural: string) =>
  `${count} ${count === 1 ? singular : plural}`;

function targetLabel(exercise: PlanExercise): string | null {
  if (exercise.reps.trim()) return `${exercise.reps} reps`;
  return exercise.duration ?? null;
}

export function ExercisePrescriptionSheet({
  visible,
  exercise,
  onClose,
  onSubstitute,
}: Props) {
  const { colors } = useTheme();
  if (!exercise) return null;

  const workSets = Math.max(0, exercise.sets - exercise.warmupSets);
  const target = targetLabel(exercise);

  return (
    <Sheet visible={visible} onClose={onClose} title={exercise.name}>
      <SheetScrollView contentContainerStyle={{ padding: spacing.base, gap: spacing.base }}>
        <View style={{ gap: spacing.sm }}>
          <Text variant="label" tone="muted">
            Prescription
          </Text>
          <Text variant="bodySm">
            {countLabel(workSets, 'work set', 'work sets')}
          </Text>
          {exercise.warmupSets > 0 ? (
            <Text variant="bodySm">
              {countLabel(exercise.warmupSets, 'warm-up set', 'warm-up sets')}
            </Text>
          ) : null}
          {target ? <Text variant="bodySm">{target}</Text> : null}
          {exercise.restSeconds !== undefined ? (
            <Text variant="bodySm">{`${exercise.restSeconds} sec rest`}</Text>
          ) : null}
        </View>

        {exercise.notes ? (
          <View style={{ gap: spacing.xs }}>
            <Text variant="label" tone="muted">
              Coach note
            </Text>
            <Text variant="bodySm">{exercise.notes}</Text>
          </View>
        ) : null}

        {exercise.videoLink ? (
          <Pressable
            onPress={() => void WebBrowser.openBrowserAsync(exercise.videoLink!)}
            accessibilityRole="button"
            accessibilityLabel={`Watch demo for ${exercise.name}`}
            style={{
              minHeight: HIT_SLOP_MIN,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              borderRadius: radius.sm,
            }}
          >
            <Play size={iconSize.md} color={colors.primary} strokeWidth={2} accessible={false} />
            <Text variant="bodySm" tone="primary">
              Watch exercise demo
            </Text>
          </Pressable>
        ) : null}

        {exercise.substitutions.length ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="h2">Alternatives</Text>
            {exercise.substitutions.map((substitution, index) => {
              const substitutionTarget = targetLabel(substitution);
              return (
                <View
                  key={substitution.id ?? `${substitution.name}-${index}`}
                  style={{
                    gap: spacing.xs,
                    paddingTop: index === 0 ? 0 : spacing.md,
                    borderTopWidth: index === 0 ? 0 : 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <Text>{substitution.name}</Text>
                  {substitutionTarget ? (
                    <Text variant="bodySm" tone="muted">
                      {substitutionTarget}
                    </Text>
                  ) : null}
                  {onSubstitute ? (
                    <Pressable
                      onPress={() => onSubstitute(substitution)}
                      accessibilityRole="button"
                      accessibilityLabel={`Use ${substitution.name}`}
                      style={{
                        minHeight: HIT_SLOP_MIN,
                        justifyContent: 'center',
                        alignSelf: 'stretch',
                      }}
                    >
                      <Text variant="bodySm" tone="primary">
                        Use {substitution.name}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}
      </SheetScrollView>
    </Sheet>
  );
}
