import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { PlateCalculatorSheet } from '@/components/logger/PlateCalculatorSheet';
import { SetEditor } from '@/components/logger/SetEditor';
import { ExercisePrescriptionSheet } from '@/components/plans/ExercisePrescriptionSheet';
import { Card, Text } from '@/components/ui';
import type { DraftExercise } from '@/hooks/useWorkoutDraft';
import type { PlanExercise } from '@/hooks/usePlans';
import { HIT_SLOP_MIN, radius, spacing, useTheme } from '@/theme';

type PreviousSet = { weight: string; reps: string; rpe: string };

type Props = {
  exercise: DraftExercise;
  prescription?: PlanExercise;
  targetReps?: string;
  targetDuration?: string;
  /** Set-by-set performance from the previous session. */
  previous?: PreviousSet[];
  onUpdateSet: (
    setIndex: number,
    field: 'reps' | 'weight' | 'rpe' | 'duration',
    value: string,
  ) => void;
  onToggleSet: (setIndex: number) => void;
  onAddSet: () => void;
  onRemoveSet: (setIndex: number) => void;
  onSubstitute?: (exercise: PlanExercise) => void;
};

export function ExerciseSlide({
  exercise,
  prescription,
  targetReps,
  targetDuration,
  previous,
  onUpdateSet,
  onToggleSet,
  onAddSet,
  onRemoveSet,
  onSubstitute,
}: Props) {
  const { colors } = useTheme();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [plateSetIndex, setPlateSetIndex] = useState<number | null>(null);
  const firstIncompleteIndex = exercise.sets.findIndex((set) => !set.completed);
  const previousSummary = exercise.tracking === 'weight-reps' && previous?.length
    ? previous
        .map((set) => (set.weight ? `${set.weight}kg × ${set.reps}` : `${set.reps} reps`))
        .join(', ')
    : null;

  return (
    <>
      <Card style={{ gap: spacing.base }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text variant="h2" style={{ flex: 1 }}>
            {exercise.name}
          </Text>
          {prescription ? (
            <Pressable
              onPress={() => setDetailsOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Show details for ${exercise.name}`}
              style={{
                minWidth: HIT_SLOP_MIN,
                minHeight: HIT_SLOP_MIN,
                justifyContent: 'center',
              }}
            >
              <Text variant="bodySm" tone="primary">
                Details
              </Text>
            </Pressable>
          ) : null}
        </View>

        {previousSummary ? (
          <Pressable
            onPress={() => {
              previous!.forEach((set, setIndex) => {
                if (setIndex < exercise.sets.length) {
                  onUpdateSet(setIndex, 'weight', set.weight);
                  onUpdateSet(setIndex, 'reps', set.reps);
                  onUpdateSet(setIndex, 'rpe', set.rpe);
                }
              });
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Last session: ${previousSummary}. Tap to copy into these sets.`}
            style={{
              padding: spacing.md,
              borderRadius: radius.sm,
              backgroundColor: colors.elevated,
              minHeight: HIT_SLOP_MIN,
              justifyContent: 'center',
            }}
          >
            <Text variant="bodySm" tone="muted">
              Last session: {previousSummary}
            </Text>
            <Text variant="bodySm" tone="primary">
              Tap to copy
            </Text>
          </Pressable>
        ) : null}

        {exercise.sets.map((set, setIndex) => (
          <SetEditor
            key={set.id}
            index={setIndex}
            set={set}
            previous={
              exercise.tracking === 'weight-reps' ? previous?.[setIndex] : undefined
            }
            tracking={exercise.tracking}
            targetReps={targetReps}
            targetDuration={targetDuration}
            isCurrent={setIndex === firstIncompleteIndex}
            canRemove={exercise.sets.length > 1}
            onUpdate={(field, value) => onUpdateSet(setIndex, field, value)}
            onToggle={() => onToggleSet(setIndex)}
            onRemove={() => onRemoveSet(setIndex)}
            onOpenPlateCalculator={
              exercise.tracking === 'weight-reps' ? () => setPlateSetIndex(setIndex) : undefined
            }
          />
        ))}

        <Pressable
          onPress={onAddSet}
          accessibilityRole="button"
          accessibilityLabel="Add a set"
          style={{
            minHeight: HIT_SLOP_MIN,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: radius.sm,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: colors.borderStrong,
          }}
        >
          <Text variant="bodySm" tone="primary">
            + Add set
          </Text>
        </Pressable>
      </Card>

      {detailsOpen && prescription ? (
        <ExercisePrescriptionSheet
          visible
          exercise={prescription}
          onClose={() => setDetailsOpen(false)}
          onSubstitute={onSubstitute}
        />
      ) : null}

      {plateSetIndex !== null ? (
        <PlateCalculatorSheet
          visible
          initialTargetKg={exercise.sets[plateSetIndex]?.weight ?? ''}
          onClose={() => setPlateSetIndex(null)}
          onUse={(weight) => onUpdateSet(plateSetIndex, 'weight', weight)}
        />
      ) : null}
    </>
  );
}
