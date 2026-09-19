import { Check, ChevronRight } from 'lucide-react-native';
import type { RefObject } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Input, Sheet, SheetScrollView, Text } from '@/components/ui';
import type { WorkoutExercise } from '@/features/workout/workoutReducer';
import { radius, spacing, useTheme } from '@/theme';

type Props = {
  visible: boolean;
  exercises: WorkoutExercise[];
  activeIndex: number;
  onClose: () => void;
  onSelect: (index: number) => void;
  onFinish?: () => void;
  newExerciseName?: string;
  onNewExerciseNameChange?: (name: string) => void;
  onAddExercise?: () => void;
  returnFocusRef?: RefObject<View | null>;
};

export function WorkoutOverviewSheet({ visible, exercises, activeIndex, onClose, onSelect, onFinish, newExerciseName = '', onNewExerciseNameChange, onAddExercise, returnFocusRef }: Props) {
  const { colors } = useTheme();
  return <Sheet visible={visible} onClose={onClose} title="Your session" returnFocusRef={returnFocusRef}>
    <SheetScrollView testID="workout-overview-scroll" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.base, gap: spacing.sm }}>
      <Text variant="bodySm" tone="muted">Choose an exercise to view its sets. Your entries stay in place.</Text>
      {onFinish ? <Button testID="logger-finish" label="Review workout" onPress={onFinish} /> : null}
      {exercises.map((exercise, index) => {
        const count = exercise.sets.filter((set) => set.completed).length;
        return <Pressable key={exercise.id} onPress={() => { onSelect(index); onClose(); }} accessibilityRole="button" accessibilityLabel={exercise.name + ', ' + count + ' of ' + exercise.sets.length + ' sets complete'} accessibilityState={{ selected: activeIndex === index }}
          style={({ pressed }) => ({ padding: spacing.base, minHeight: 84, borderRadius: radius.card, borderWidth: 1, borderColor: activeIndex === index ? colors.primary : colors.border, backgroundColor: pressed || activeIndex === index ? colors.elevated : colors.card, flexDirection: 'row', alignItems: 'center', gap: spacing.base })}>
          <Text variant="bodySm" tone="muted" numeric>{String(index + 1).padStart(2, '0')}</Text>
          <View style={{ flex: 1, gap: spacing.xs }}><Text variant="h2">{exercise.name}</Text><Text variant="bodySm" tone="muted">{count} of {exercise.sets.length} sets complete</Text></View>
          {count > 0 && count === exercise.sets.length ? <Check size={19} color={colors.success} accessible={false} /> : <ChevronRight size={19} color={colors.mutedForeground} accessible={false} />}
        </Pressable>;
      })}
      {onNewExerciseNameChange && onAddExercise ? <View style={{ gap: spacing.sm, paddingTop: spacing.base }}>
        <Text variant="label">Add exercise</Text>
        <Input sheetAware testID="workout-exercise-name" label="Add an exercise" value={newExerciseName} onChangeText={onNewExerciseNameChange} placeholder="e.g. Cable fly" returnKeyType="done" onSubmitEditing={onAddExercise} />
        <Button testID="workout-add-exercise" label="Add exercise" variant="secondary" disabled={!newExerciseName.trim()} onPress={onAddExercise} />
      </View> : null}
    </SheetScrollView>
  </Sheet>;
}
