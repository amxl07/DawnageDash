import * as Haptics from 'expo-haptics';
import * as WebBrowser from 'expo-web-browser';
import { Play } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { SetEditor } from '@/components/logger/SetEditor';
import { Card, Text } from '@/components/ui';
import type { DraftExercise } from '@/hooks/useWorkoutDraft';
import { HIT_SLOP_MIN, iconSize, radius, spacing, useTheme } from '@/theme';

type PreviousSet = { weight: string; reps: string; rpe: string };

type Props = {
  exercise: DraftExercise;
  targetReps?: string;
  videoLink?: string;
  notes?: string;
  /** Set-by-set performance from the previous session. */
  previous?: PreviousSet[];
  onUpdateSet: (setIndex: number, field: 'reps' | 'weight' | 'rpe', value: string) => void;
  onToggleSet: (setIndex: number) => void;
  onAddSet: () => void;
  onRemoveSet: (setIndex: number) => void;
};

export function ExerciseSlide({
  exercise,
  targetReps,
  videoLink,
  notes,
  previous,
  onUpdateSet,
  onToggleSet,
  onAddSet,
  onRemoveSet,
}: Props) {
  const { colors } = useTheme();
  const firstIncompleteIndex = exercise.sets.findIndex((set) => !set.completed);
  const previousSummary = previous?.length
    ? previous
        .map((set) => (set.weight ? `${set.weight}kg × ${set.reps}` : `${set.reps} reps`))
        .join(', ')
    : null;

  return (
    <Card style={{ gap: spacing.base }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text variant="h2" style={{ flex: 1 }}>
          {exercise.name}
        </Text>
        {videoLink ? (
          <Pressable
            onPress={() => void WebBrowser.openBrowserAsync(videoLink)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Watch demo for ${exercise.name}`}
            style={{
              minWidth: HIT_SLOP_MIN,
              minHeight: HIT_SLOP_MIN,
              alignItems: 'flex-end',
              justifyContent: 'center',
            }}
          >
            <Play size={iconSize.md} color={colors.primary} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>

      {notes ? (
        <Text variant="bodySm" tone="muted">
          {notes}
        </Text>
      ) : null}

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
          previous={previous?.[setIndex]}
          targetReps={targetReps}
          isCurrent={setIndex === firstIncompleteIndex}
          canRemove={exercise.sets.length > 1}
          onUpdate={(field, value) => onUpdateSet(setIndex, field, value)}
          onToggle={() => onToggleSet(setIndex)}
          onRemove={() => onRemoveSet(setIndex)}
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
  );
}
