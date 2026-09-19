/* eslint-disable @typescript-eslint/no-require-imports -- Jest mock factories load native primitives lazily. */
import * as Haptics from 'expo-haptics';
import { fireEvent, render } from '@testing-library/react-native';
import { useState } from 'react';
import { Keyboard, StyleSheet } from 'react-native';
import type { WorkoutExercise } from '@/features/workout/workoutReducer';
import { CurrentSetEditor } from './CurrentSetEditor';
jest.mock('lucide-react-native', () => ({ ChevronDown: () => null, ChevronUp: () => null, Copy: () => null, RotateCcw: () => null }));
jest.mock('@/components/ui/DisclosureChevron', () => ({ DisclosureChevron: () => null }));

jest.mock('@/components/ui', () => {
  const { Pressable, Text, TextInput } = require('react-native');
  return { Text,
    Button: ({ label, onPress, ...props }: { label: string; onPress: () => void }) => <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} {...props}><Text>{label}</Text></Pressable>,
    Input: ({ label, ...props }: { label: string }) => <TextInput accessibilityLabel={label} {...props} />,
  };
});
jest.mock('@/theme', () => ({ ...jest.requireActual('@/theme/tokens'), useMotion: () => ({ enabled: false, duration: { feedback: 160 } }), useTheme: () => ({ colors: jest.requireActual('@/theme/colors').dark }) }));

const exercise: WorkoutExercise = { id: 'bench', name: 'Bench press', tracking: 'weight-reps', sets: [{ id: 'set-1', weight: '70', reps: '', rpe: '', duration: '', kind: 'work', completed: false }] };

it('copies only empty fields of the chosen set and allows Undo without completing it', async () => {
  const complete = jest.fn();
  function Probe() {
    const [state, setState] = useState(exercise);
    return <CurrentSetEditor exercise={state} setId="set-1" previous={{ weight: '60', reps: '8', rpe: '7' }} previousDate="2026-09-12" onComplete={complete}
      onChange={(id, patch) => setState((current) => ({ ...current, sets: current.sets.map((set) => set.id === id ? { ...set, ...patch } : set) }))} />;
  }
  const view = await render(<Probe />);
  await fireEvent.press(view.getByRole('button', { name: 'Copy previous values into empty fields of set 1' }));
  expect(view.getByLabelText('Set 1 weight in kilograms').props.value).toBe('70');
  expect(view.getByLabelText('Set 1 repetitions').props.value).toBe('8');
  expect(complete).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole('button', { name: 'Effort and set options' }));
  expect(view.getByLabelText('Set 1 RPE (optional)').props.value).toBe('');
  await fireEvent.press(view.getByRole('button', { name: 'Undo copied set values' }));
  expect(view.getByLabelText('Set 1 repetitions').props.value).toBe('');
  expect(view.getByLabelText('Set 1 weight in kilograms').props.value).toBe('70');
});

it('keeps completion explicit and addresses the stable set identity', async () => {
  jest.clearAllMocks();
  const complete = jest.fn();
  const view = await render(<CurrentSetEditor exercise={exercise} setId="set-1" onChange={jest.fn()} onComplete={complete} />);
  const button = view.getByRole('button', { name: 'Complete set' });
  await fireEvent.press(button);
  await fireEvent.press(button);
  expect(complete).toHaveBeenCalledTimes(1);
  expect(complete).toHaveBeenCalledWith('set-1');
  expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);
});

it('dismisses the numeric keyboard on submit without implicitly completing the set', async () => {
  const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
  const complete = jest.fn();
  const view = await render(<CurrentSetEditor exercise={exercise} setId="set-1" onChange={() => {}} onComplete={complete} />);
  await fireEvent(view.getByLabelText('Set 1 repetitions'), 'submitEditing');
  expect(dismiss).toHaveBeenCalledTimes(1);
  expect(complete).not.toHaveBeenCalled();
  dismiss.mockRestore();
});

it('keeps number-field geometry stable while showing keyboard focus', async () => {
  const view = await render(<CurrentSetEditor exercise={exercise} setId="set-1" onChange={jest.fn()} onComplete={jest.fn()} />);
  const field = view.getByTestId('Set 1 weight in kilograms-field');
  const before = StyleSheet.flatten(field.props.style);
  expect(before.borderColor).toBe('#6B6F76');

  await fireEvent(view.getByLabelText('Set 1 weight in kilograms'), 'focus');
  const focused = StyleSheet.flatten(view.getByTestId('Set 1 weight in kilograms-field').props.style);
  expect(focused.borderColor).toBe('#F04E45');
  expect(focused.borderWidth).toBe(before.borderWidth);
});
