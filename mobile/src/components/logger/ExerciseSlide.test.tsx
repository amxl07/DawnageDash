/* eslint-disable @typescript-eslint/no-require-imports -- Jest mock factories load native primitives lazily. */
import { act, fireEvent, render } from '@testing-library/react-native';
import { useRef, useState } from 'react';
import { Pressable, Text as NativeText } from 'react-native';
import { ExerciseSlide } from './ExerciseSlide';
import type { HistoricalExercise } from '@/features/workout/workoutSuggestions';
import { applyWorkoutEdit, type WorkoutEditAction } from '@/features/workout/workoutSave';
import { initialWorkoutState, type WorkoutExercise } from '@/features/workout/workoutReducer';
let mockCompleteSetPress: (() => void) | undefined;
jest.mock('lucide-react-native', () => ({ ChevronDown: () => null, ChevronUp: () => null, Copy: () => null, Minus: () => null, Plus: () => null, RotateCcw: () => null, Check: () => null, ChevronRight: () => null }));
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
function Probe({ restore = true, initialExercise = exercise, history, onContinue, continueLabel }: { restore?: boolean; initialExercise?: WorkoutExercise; history?: any[]; onContinue?: () => void; continueLabel?: string }) {
  const snapshot = useRef({ generation: 0, state: { ...initialWorkoutState, exercises: [initialExercise] } });
  const [state, setState] = useState(snapshot.current.state);
  const dispatch = (action: WorkoutEditAction) => {
    const next = applyWorkoutEdit(snapshot.current, action);
    if (next === snapshot.current) return false;
    snapshot.current = next;
    setState(next.state);
    return true;
  };
  return <><NativeText testID="state">{JSON.stringify(state.exercises[0])}</NativeText><ExerciseSlide exercise={state.exercises[0]} history={history} onUpdateSet={(setId, field, value) => {
    const setIndex = state.exercises[0].sets.findIndex((set) => set.id === setId);
    if (setIndex >= 0) dispatch({ type: 'UPDATE_SET', payload: { exerciseIndex: 0, setIndex, field, value } });
  }} onAddSet={() => {}}
    onCompleteSet={(setId, suggestion) => { const setIndex = snapshot.current.state.exercises[0].sets.findIndex((set) => set.id === setId); return setIndex >= 0 && dispatch({ type: 'COMPLETE_SET', payload: { exerciseIndex: 0, setIndex, suggestion } }); }}
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
it('keeps every completed set visible and editable without a disclosure tap', async () => {
  const completed = { ...exercise, sets: exercise.sets.map((set) => ({ ...set, completed: true })) };
  const view = await render(<Probe initialExercise={completed} />);
  await fireEvent.press(view.getByLabelText(/^Edit warm-up 1:/));
  expect(view.getByLabelText('Warm-up 1 duration in seconds')).toBeTruthy();
  expect(view.getByRole('button', { name: 'Mark set incomplete' })).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Back to exercise summary' }));
  expect(view.getByText('Exercise complete')).toBeTruthy();
});
it('wraps to earlier incomplete work after completing a manually selected last set', async () => {
  const view = await render(<Probe />);
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

it('keeps Undo copy available after copied values stop being applicable suggestions', async () => {
  const initialExercise = { ...exercise, sets: [{ ...exercise.sets[0], duration: '' }] };
  const history: HistoricalExercise[] = [{ date: '2026-09-20', tracking: 'duration', sets: [
    { setNumber: 1, duration: '60', reps: '', weight: '', rpe: '', kind: 'warmup', completed: true },
  ] }];
  const view = await render(<Probe initialExercise={initialExercise} history={history} />);
  await fireEvent.press(view.getByRole('button', { name: 'Use suggested values for warm-up 1' }));
  expect(view.getByLabelText('Warm-up 1 duration in seconds').props.value).toBe('60');
  await fireEvent.press(view.getByRole('button', { name: 'Undo copied set values' }));
  expect(view.getByLabelText('Warm-up 1 duration in seconds').props.value).toBe('');
  expect(JSON.parse(view.getByTestId('state').props.children).sets[0].completed).toBe(false);
});
it('keeps the current set active and releases both locks when owned state rejects completion', async () => {
  const complete = jest.fn(() => false);
  const view = await render(<ExerciseSlide
    exercise={{ ...exercise, sets: exercise.sets.slice(0, 2) }}
    onUpdateSet={jest.fn()}
    onCompleteSet={complete}
    onToggleSet={jest.fn()}
    onAddSet={jest.fn()}
    onRemoveSet={jest.fn()}
  />);
  const button = view.getByRole('button', { name: 'Complete set' });

  await fireEvent.press(button);
  await fireEvent.press(button);

  expect(complete).toHaveBeenCalledTimes(2);
  expect(view.getByLabelText('Warm-up 1 duration in seconds')).toBeTruthy();
  expect(view.queryByText('Warm-up 1 complete')).toBeNull();
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

it('routes compact-row completion through the atomic suggestion action', async () => {
  const blank: WorkoutExercise = {
    ...exercise,
    sets: [
      { ...exercise.sets[0], id: 's1', duration: '45' },
      { ...exercise.sets[1], id: 's2', duration: '' },
    ],
  };
  function SuggestedProbe() {
    const snapshot = useRef({ generation: 0, state: { ...initialWorkoutState, exercises: [blank] } });
    const [state, setState] = useState(snapshot.current.state);
    const dispatch = (action: WorkoutEditAction) => {
      const next = applyWorkoutEdit(snapshot.current, action);
      if (next === snapshot.current) return false;
      snapshot.current = next;
      setState(next.state);
      return true;
    };
    return <><NativeText testID="state">{JSON.stringify(state.exercises[0])}</NativeText><ExerciseSlide
      exercise={state.exercises[0]}
      history={[{ date: '2026-09-20', tracking: 'duration', sets: [
        { setNumber: 1, weight: '', reps: '', rpe: '', duration: '30', kind: 'warmup', completed: true },
        { setNumber: 2, weight: '', reps: '', rpe: '', duration: '60', kind: 'warmup', completed: true },
      ] }]}
      onUpdateSet={() => {}}
      onCompleteSet={(setId, suggestion) => { const setIndex = snapshot.current.state.exercises[0].sets.findIndex((set) => set.id === setId); return dispatch({ type: 'COMPLETE_SET', payload: { exerciseIndex: 0, setIndex, suggestion } }); }}
      onToggleSet={(setId) => { const setIndex = state.exercises[0].sets.findIndex((set) => set.id === setId); dispatch({ type: 'TOGGLE_SET', payload: { exerciseIndex: 0, setIndex } }); }}
      onAddSet={() => {}}
      onRemoveSet={() => {}}
    /></>;
  }

  const view = await render(<SuggestedProbe />);
  await fireEvent.press(view.getByRole('checkbox', { name: 'Mark warm-up 2 complete' }));
  expect(JSON.parse(view.getByTestId('state').props.children).sets[1]).toMatchObject({ duration: '60', completed: true });
});

it('preserves an explicitly cleared suggested weight when completing a bodyweight set', async () => {
  const bodyweight: WorkoutExercise = {
    id: 'pushup', name: 'Push-up', tracking: 'weight-reps',
    sets: [{ id: 'pushup-1', weight: '', reps: '', rpe: '', duration: '', kind: 'work', completed: false }],
  };
  const history: HistoricalExercise[] = [{ date: '2026-09-20', tracking: 'weight-reps', sets: [
    { setNumber: 1, weight: '20', reps: '10', rpe: '8', kind: 'work', completed: true },
  ] }];
  const view = await render(<Probe initialExercise={bodyweight} history={history} />);

  await fireEvent.press(view.getByRole('button', { name: 'Keep set 1 weight blank for bodyweight' }));
  await fireEvent.press(view.getByRole('button', { name: 'Complete set' }));

  expect(JSON.parse(view.getByTestId('state').props.children).sets[0]).toMatchObject({ weight: '', reps: '10', completed: true });
});

it('keeps an explicit bodyweight choice after switching away and back', async () => {
  const bodyweight: WorkoutExercise = {
    id: 'pushup', name: 'Push-up', tracking: 'weight-reps',
    sets: [{ id: 'pushup-1', weight: '', reps: '', rpe: '', duration: '', kind: 'work', completed: false }],
  };
  const history: HistoricalExercise[] = [{ date: '2026-09-20', tracking: 'weight-reps', sets: [
    { setNumber: 1, weight: '20', reps: '10', rpe: '8', kind: 'work', completed: true },
  ] }];
  const row: WorkoutExercise = {
    id: 'row', name: 'Row', tracking: 'weight-reps',
    sets: [{ id: 'row-1', weight: '', reps: '8', rpe: '', duration: '', kind: 'work', completed: false }],
  };
  function SwitchProbe() {
    const snapshot = useRef({ generation: 0, state: { ...initialWorkoutState, exercises: [bodyweight, row] } });
    const [state, setState] = useState(snapshot.current.state);
    const [active, setActive] = useState(0);
    const dispatch = (action: WorkoutEditAction) => {
      const next = applyWorkoutEdit(snapshot.current, action);
      if (next === snapshot.current) return false;
      snapshot.current = next;
      setState(next.state);
      return true;
    };
    const current = state.exercises[active];
    return <>
      <NativeText testID="state">{JSON.stringify(state.exercises[0])}</NativeText>
      <Pressable accessibilityRole="button" accessibilityLabel="Show Push-up" onPress={() => setActive(0)} />
      <Pressable accessibilityRole="button" accessibilityLabel="Show Row" onPress={() => setActive(1)} />
      <ExerciseSlide
        exercise={current}
        history={current.id === 'pushup' ? history : []}
        onUpdateSet={(setId, field, value) => { const setIndex = current.sets.findIndex((set) => set.id === setId); dispatch({ type: 'UPDATE_SET', payload: { exerciseIndex: active, setIndex, field, value } }); }}
        onCompleteSet={(setId, suggestion) => { const setIndex = snapshot.current.state.exercises[active].sets.findIndex((set) => set.id === setId); return dispatch({ type: 'COMPLETE_SET', payload: { exerciseIndex: active, setIndex, suggestion } }); }}
        onToggleSet={() => {}}
        onAddSet={() => {}}
        onRemoveSet={() => {}}
      />
    </>;
  }
  const view = await render(<SwitchProbe />);

  await fireEvent.press(view.getByRole('button', { name: 'Keep set 1 weight blank for bodyweight' }));
  await fireEvent.press(view.getByRole('button', { name: 'Show Row' }));
  await fireEvent.press(view.getByRole('button', { name: 'Show Push-up' }));

  expect(view.queryByRole('button', { name: 'Keep set 1 weight blank for bodyweight' })).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Complete set' }));
  expect(JSON.parse(view.getByTestId('state').props.children).sets[0]).toMatchObject({ weight: '', reps: '10', completed: true });
});
