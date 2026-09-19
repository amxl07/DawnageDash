/* eslint-disable @typescript-eslint/no-require-imports -- Jest mock factories load native primitives lazily. */
import { act, fireEvent, render } from '@testing-library/react-native';
import { useState } from 'react';
import { Text as NativeText } from 'react-native';
import { ExerciseSlide } from './ExerciseSlide';
import { workoutReducer, initialWorkoutState, type WorkoutExercise } from '@/features/workout/workoutReducer';
let mockCompleteSetPress: (() => void) | undefined;
jest.mock('lucide-react-native', () => ({ ChevronDown: () => null, ChevronUp: () => null, Copy: () => null, RotateCcw: () => null, Check: () => null, ChevronRight: () => null }));
jest.mock('@/components/ui/DisclosureChevron', () => ({ DisclosureChevron: () => null }));
jest.mock('@/components/ui/MotionReveal', () => ({ MotionReveal: ({ children }: any) => children }));
jest.mock('@/components/logger/PlateCalculatorSheet', () => ({ PlateCalculatorSheet: () => null }));
jest.mock('@/components/plans/ExercisePrescriptionSheet', () => ({ ExercisePrescriptionSheet: () => null }));
jest.mock('@/components/ui', () => {
  const { Pressable, Text, TextInput } = require('react-native');
  return { Text, Button: ({ label, onPress, ...props }: any) => {
    if (label === 'Complete set') mockCompleteSetPress = onPress;
    return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} {...props}><Text>{label}</Text></Pressable>;
  }, Input: ({ label, ...props }: any) => <TextInput accessibilityLabel={label} {...props} /> };
});
jest.mock('@/theme', () => ({ ...jest.requireActual('@/theme/tokens'), useMotion: () => ({ enabled: false, duration: { feedback: 160 } }), useTheme: () => ({ colors: jest.requireActual('@/theme/colors').dark }) }));
const exercise: WorkoutExercise = { id: 'x', name: 'Plank', tracking: 'duration', sets: [1, 2, 3].map((i) => ({ id: 's' + i, weight: '', reps: '', rpe: '7', duration: '45', kind: 'warmup', completed: false })) };
beforeEach(() => { mockCompleteSetPress = undefined; });
function Probe({ restore = true, initialExercise = exercise, onContinue, continueLabel }: { restore?: boolean; initialExercise?: WorkoutExercise; onContinue?: () => void; continueLabel?: string }) {
  const [state, setState] = useState({ ...initialWorkoutState, exercises: [initialExercise] });
  const dispatch = (action: any) => setState((current) => workoutReducer(current, action));
  return <><NativeText testID="state">{JSON.stringify(state.exercises[0])}</NativeText><ExerciseSlide exercise={state.exercises[0]} onUpdateSet={(setId, field, value) => {
    const setIndex = state.exercises[0].sets.findIndex((set) => set.id === setId);
    if (setIndex >= 0) dispatch({ type: 'UPDATE_SET', payload: { exerciseIndex: 0, setIndex, field, value } });
  }} onAddSet={() => {}}
    onToggleSet={(setId) => { const setIndex = state.exercises[0].sets.findIndex((set) => set.id === setId); if (setIndex >= 0) dispatch({ type: 'TOGGLE_SET', payload: { exerciseIndex: 0, setIndex } }); }}
    onRemoveSet={(setIndex) => dispatch({ type: 'REMOVE_SET', payload: { exerciseIndex: 0, setIndex } })}
    onRestoreSet={restore ? (set, index) => dispatch({ type: 'RESTORE_SET', payload: { exerciseIndex: 0, set, index } }) : undefined}
    onContinue={onContinue} continueLabel={continueLabel} /></>;
}
it('replaces the final completed set editor with explicit exercise guidance', async () => {
  const onContinue = jest.fn();
  const finalSet = { ...exercise, sets: [exercise.sets[0]] };
  const view = await render(<Probe initialExercise={finalSet} onContinue={onContinue} continueLabel="Review workout" />);
  await fireEvent.press(view.getByRole('button', { name: 'Complete set' }));
  expect(view.getByText('Exercise complete')).toBeTruthy();
  expect(view.queryByLabelText('Warm-up 1 duration in seconds')).toBeNull();
  await fireEvent.press(view.getByTestId('workout-continue'));
  expect(onContinue).toHaveBeenCalledTimes(1);
});
it('keeps completed sets editable behind a collapsed Sets disclosure', async () => {
  const completed = { ...exercise, sets: exercise.sets.map((set) => ({ ...set, completed: true })) };
  const view = await render(<Probe initialExercise={completed} />);
  expect(view.queryByLabelText(/^Edit warm-up 1:/)).toBeNull();
  await fireEvent.press(view.getByTestId('workout-sets-toggle'));
  await fireEvent.press(view.getByLabelText(/^Edit warm-up 1:/));
  expect(view.getByLabelText('Warm-up 1 duration in seconds')).toBeTruthy();
  expect(view.getByRole('button', { name: 'Mark set incomplete' })).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Back to exercise summary' }));
  expect(view.getByText('Exercise complete')).toBeTruthy();
});
it('wraps to earlier incomplete work after completing a manually selected last set', async () => {
  const view = await render(<Probe />);
  await fireEvent.press(view.getByTestId('workout-sets-toggle'));
  await fireEvent.press(view.getByLabelText(/^Edit warm-up 3:/));
  await fireEvent.press(view.getByRole('button', { name: 'Complete set' }));
  expect(view.getByLabelText('Warm-up 1 duration in seconds')).toBeTruthy();
});
it('keeps later edits when Undo targets the captured completed set', async () => {
  const view = await render(<Probe />);
  await fireEvent.press(view.getByRole('button', { name: 'Complete set' }));

  expect(view.getByText('Warm-up 1 complete')).toBeTruthy();
  expect(view.getByLabelText('Warm-up 2 duration in seconds')).toBeTruthy();
  await fireEvent.changeText(view.getByLabelText('Warm-up 2 duration in seconds'), '60');
  await fireEvent.press(view.getByRole('button', { name: 'Undo completed warm-up 1' }));

  const state = JSON.parse(view.getByTestId('state').props.children) as WorkoutExercise;
  expect(state.sets.find((set) => set.id === 's1')).toMatchObject({ completed: false, duration: '45' });
  expect(state.sets.find((set) => set.id === 's2')).toMatchObject({ completed: false, duration: '60' });
});
it('ignores a repeated completion callback from the disappearing set control', async () => {
  const view = await render(<Probe />);
  const complete = mockCompleteSetPress;
  expect(complete).toEqual(expect.any(Function));
  if (typeof complete !== 'function') throw new Error('Complete set press handler was not found');

  await act(async () => {
    complete();
    complete();
  });

  const state = JSON.parse(view.getByTestId('state').props.children) as WorkoutExercise;
  expect(state.sets.find((set) => set.id === 's1')?.completed).toBe(true);
  expect(state.sets.find((set) => set.id === 's2')?.completed).toBe(false);
  expect(view.getByLabelText('Warm-up 2 duration in seconds')).toBeTruthy();
});
it('restores the full set at its original position with Undo', async () => {
  const view = await render(<Probe />);
  await fireEvent.press(view.getByRole('button', { name: 'Effort and set options' }));
  await fireEvent.press(view.getByRole('button', { name: 'Remove warm-up 1' }));
  await fireEvent.press(view.getByRole('button', { name: 'Undo removed set' }));
  expect(JSON.parse(view.getByTestId('state').props.children)).toEqual(exercise);
});
it('withholds removal if no restoration callback exists', async () => {
  const view = await render(<Probe restore={false} />);
  await fireEvent.press(view.getByRole('button', { name: 'Effort and set options' }));
  expect(view.queryByRole('button', { name: 'Remove warm-up 1' })).toBeNull();
});
