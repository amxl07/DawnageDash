/* eslint-disable @typescript-eslint/no-require-imports -- Jest mock factories load native primitives lazily. */
import { fireEvent, render } from '@testing-library/react-native';
import { WorkoutSummary } from './WorkoutSummary';
jest.mock('lucide-react-native', () => ({ Check: () => null, Clock3: () => null, CircleAlert: () => null, ClipboardCheck: () => null }));
jest.mock('@/components/ui', () => { const { Text } = require('react-native'); return { Text, RecordStatus: ({ value }: { value: string }) => <Text>{value}</Text> }; });
jest.mock('@/components/ui/Card', () => ({ Card: require('react-native').View }));
jest.mock('@/components/ui/Text', () => ({ Text: require('react-native').Text }));
jest.mock('@/components/ui/MotionReveal', () => ({ MotionReveal: ({ children }: any) => children }));
jest.mock('@/components/ui/RecordStatus', () => ({ RecordStatus: ({ value }: any) => { const { Text } = require('react-native'); return <Text>{value}</Text>; } }));
jest.mock('@/components/ui/Button', () => ({ Button: ({ label, onPress, loading }: any) => { const { Pressable, Text } = require('react-native'); return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={loading} accessibilityState={{ disabled: Boolean(loading), busy: Boolean(loading) }} onPress={onPress}><Text>{label}</Text></Pressable>; } }));
jest.mock('@/theme', () => ({ spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 24, xl: 32 }, useTheme: () => ({ colors: {} }) }));
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

it('keeps saving visible and prevents a duplicate submit', async () => {
  const save = jest.fn();
  const view = await render(<WorkoutSummary result={result} syncStatus="sending" onDone={jest.fn()} onEdit={jest.fn()} onSave={save} />);
  expect(view.getByText('Saving workout…')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Save workout' }));
  expect(save).not.toHaveBeenCalled();
});

it('finishes a synced receipt without saving again', async () => {
  const done = jest.fn(), save = jest.fn();
  const view = await render(<WorkoutSummary result={result} syncStatus="synced" onDone={done} onEdit={jest.fn()} onSave={save} />);
  await fireEvent.press(view.getByRole('button', { name: 'Done' }));
  expect(done).toHaveBeenCalledTimes(1);
  expect(save).not.toHaveBeenCalled();
});

it('keeps duration or bodyweight completion free of a zero volume score', async () => {
  const view = await render(<WorkoutSummary result={{ volume: 0, sets: 5, incompleteSets: 0, excludedSets: 0 }} syncStatus="synced" onDone={jest.fn()} onEdit={jest.fn()} onSave={jest.fn()} />);
  expect(view.getByLabelText('Completed sets: 5')).toBeTruthy();
  expect(view.queryByText('Volume')).toBeNull();
  expect(view.queryByText(/cannot be included in volume/)).toBeNull();
});

it('keeps failed delivery actionable and exposes the error', async () => {
  const save = jest.fn();
  const view = await render(<WorkoutSummary result={result} syncStatus="blocked" error="The record needs correction." onDone={jest.fn()} onEdit={jest.fn()} onSave={save} />);
  expect(view.getByText('The record needs correction.')).toBeTruthy();
  expect(view.getByText(/cannot be included in volume/)).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Retry save' }));
  expect(save).toHaveBeenCalledTimes(1);
});
