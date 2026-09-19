/* eslint-disable @typescript-eslint/no-require-imports -- Jest mock factories load native primitives lazily. */
import { fireEvent, render } from '@testing-library/react-native';
import { WorkoutSummary } from './WorkoutSummary';
jest.mock('@/components/ui/AdaptiveGrid', () => ({ AdaptiveGrid: require('react-native').View }));
jest.mock('@/components/ui/Card', () => ({ Card: require('react-native').View }));
jest.mock('@/components/ui/Text', () => ({ Text: require('react-native').Text }));
jest.mock('@/components/ui/MotionReveal', () => ({ MotionReveal: ({ children }: any) => children }));
jest.mock('@/components/ui/RecordStatus', () => ({ RecordStatus: ({ value }: any) => { const { Text } = require('react-native'); return <Text>{value}</Text>; } }));
jest.mock('@/components/ui/Button', () => ({ Button: ({ label, onPress }: any) => { const { Pressable, Text } = require('react-native'); return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}><Text>{label}</Text></Pressable>; } }));
jest.mock('@/theme', () => ({ spacing: { xs: 4, sm: 8, lg: 24, xl: 32 } }));
const result = { volume: 400, sets: 3, incompleteSets: 2, excludedSets: 1 };
it('reviews complete and incomplete work with validated units before saving', async () => {
  const save = jest.fn();
  const view = await render(<WorkoutSummary result={result} syncStatus="review" onDone={() => {}} onSave={save} onEdit={() => {}} />);
  expect(view.getByText('Review your workout')).toBeTruthy();
  expect(view.getByText('Incomplete sets')).toBeTruthy();
  expect(view.getByLabelText('Volume: 400 kg × reps · completed strength sets')).toBeTruthy();
  expect(view.queryByText('Duration')).toBeNull();
  expect(view.queryByText('Personal records')).toBeNull();
  expect(save).not.toHaveBeenCalled();
  await fireEvent.press(view.getByRole('button', { name: 'Save workout' }));
  expect(save).toHaveBeenCalledTimes(1);
});
it('keeps blocked recovery and return-to-edit available', async () => {
  const edit = jest.fn();
  const view = await render(<WorkoutSummary result={result} syncStatus="blocked" onDone={() => {}} onSave={() => {}} onEdit={edit} />);
  expect(view.getByText('blocked')).toBeTruthy();
  expect(view.getByRole('button', { name: 'Retry save' })).toBeTruthy();
  expect(view.queryByRole('button', { name: 'Done' })).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Return to editing' }));
  expect(edit).toHaveBeenCalledTimes(1);
});
it('labels a queued receipt truthfully and offers Done', async () => {
  const view = await render(<WorkoutSummary result={result} syncStatus="queued" onDone={() => {}} onSave={() => {}} onEdit={() => {}} />);
  expect(view.getByText('queued')).toBeTruthy();
  expect(view.queryByText('synced')).toBeNull();
  expect(view.getByText('Workout saved on this device')).toBeTruthy();
  expect(view.getByText(/Waiting to sync/)).toBeTruthy();
  expect(view.getByRole('button', { name: 'Done' })).toBeTruthy();
});
it('does not describe a blocked workout as saved', async () => {
  const view = await render(<WorkoutSummary result={result} syncStatus="blocked" onDone={() => {}} onSave={() => {}} onEdit={() => {}} />);
  expect(view.getByText('Workout needs attention')).toBeTruthy();
  expect(view.queryByText('Workout saved')).toBeNull();
});
