import { Check, ChevronRight } from 'lucide-react-native';
import type { RefObject } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Input, Sheet, SheetScrollView, Text } from '@/components/ui';
import { suggestExerciseNames } from '@/features/workout/workoutSuggestions';
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
  onAddExercise?: (name?: string) => void;
  exerciseSuggestions?: string[];
  returnFocusRef?: RefObject<View | null>;
};

export function WorkoutOverviewSheet({ visible, exercises, activeIndex, onClose, onSelect, onFinish, newExerciseName = '', onNewExerciseNameChange, onAddExercise, exerciseSuggestions = [], returnFocusRef }: Props) {
  const { colors } = useTheme();
  const suggestedNames = suggestExerciseNames(newExerciseName, exerciseSuggestions);
  return <Sheet role="editor" visible={visible} onClose={onClose} title="Your session" returnFocusRef={returnFocusRef}>
    <SheetScrollView testID="workout-overview-scroll" keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: spacing.base, gap: spacing.sm }}>
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
        <Input sheetAware testID="workout-exercise-name" label="Exercise name" value={newExerciseName} onChangeText={onNewExerciseNameChange} placeholder="e.g. Cable fly" returnKeyType="done" onSubmitEditing={() => onAddExercise()} />
        {suggestedNames.length ? <View accessibilityRole="list" style={{ gap: spacing.xs }}>
          {suggestedNames.map((name) => <Pressable key={name} accessibilityRole="button" accessibilityLabel={`Add ${name} from suggestions`} onPress={() => onAddExercise(name)}
            style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.base, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: pressed ? colors.elevated : colors.card })}>
            <Text variant="body">{name}</Text>
          </Pressable>)}
        </View> : newExerciseName.trim() ? <Text variant="bodySm" tone="muted">No matches · add a custom exercise.</Text>
          : <Text variant="bodySm" tone="muted">No saved exercise suggestions yet. Enter a custom name.</Text>}
        <Button testID="workout-add-exercise" label="Add" variant="secondary" disabled={!newExerciseName.trim()} onPress={() => onAddExercise()} />
      </View> : null}
    </SheetScrollView>
  </Sheet>;
}
