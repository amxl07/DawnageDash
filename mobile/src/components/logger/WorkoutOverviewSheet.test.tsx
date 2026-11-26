/* eslint-disable @typescript-eslint/no-require-imports -- Jest mock factories load native primitives lazily. */
import { fireEvent, render } from '@testing-library/react-native';

import { WorkoutOverviewSheet } from './WorkoutOverviewSheet';

jest.mock('lucide-react-native', () => ({ Check: () => null, ChevronRight: () => null }));
jest.mock('@/components/ui', () => {
  const { Pressable, Text, TextInput, View } = require('react-native');
  return {
    Text,
    Sheet: ({ visible, children }: any) => visible ? <View>{children}</View> : null,
    SheetScrollView: View,
    Input: ({ label, ...props }: any) => <TextInput accessibilityLabel={label} {...props} />,
    Button: ({ label, onPress, ...props }: any) => <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} {...props}><Text>{label}</Text></Pressable>,
  };
});
jest.mock('@/theme', () => ({ spacing: {}, radius: {}, useTheme: () => ({ colors: {} }) }));

it('offers bounded matching exercise names and adds the chosen suggestion directly', async () => {
  const add = jest.fn();
  const view = await render(
    <WorkoutOverviewSheet
      visible
      exercises={[]}
      activeIndex={0}
      onClose={jest.fn()}
      onSelect={jest.fn()}
      newExerciseName="PRESS"
      onNewExerciseNameChange={jest.fn()}
      onAddExercise={add}
      exerciseSuggestions={['Bench Press', 'Incline Press', 'Pressdown', 'Press up', 'Shoulder press', 'Chest press', 'Overhead press']}
    />,
  );

  expect(view.getAllByLabelText(/^Add .* from suggestions$/)).toHaveLength(6);
  await fireEvent.press(view.getByRole('button', { name: 'Add Bench Press from suggestions' }));
  expect(add).toHaveBeenCalledWith('Bench Press');
});

it('keeps custom entry available when no saved exercise matches', async () => {
  const add = jest.fn();
  const view = await render(
    <WorkoutOverviewSheet
      visible
      exercises={[]}
      activeIndex={0}
      onClose={jest.fn()}
      onSelect={jest.fn()}
      newExerciseName="Dragon flag"
      onNewExerciseNameChange={jest.fn()}
      onAddExercise={add}
      exerciseSuggestions={['Squat']}
    />,
  );

  expect(view.getByText('No matches · add a custom exercise.')).toBeTruthy();
  await fireEvent.press(view.getByTestId('workout-add-exercise'));
  expect(add).toHaveBeenCalledWith();
});
