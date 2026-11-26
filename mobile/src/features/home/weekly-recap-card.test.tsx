/* eslint-disable @typescript-eslint/no-require-imports */
import { fireEvent, render } from '@testing-library/react-native';
import { fixtureDailyCheckIn } from '@/testing/redesignFixtures';
import { serializeWorkoutContent } from '@/lib/workout-content';
import type { HomeSection, HomeWorkoutRecord } from './types';
import { WeeklyRecap } from './weekly-recap-card';

jest.mock('@/components/ui', () => ({ Text: require('react-native').Text }));
jest.mock('@/theme', () => ({
  ...jest.requireActual('@/theme/tokens'),
  useTheme: () => ({ colors: jest.requireActual('@/theme/colors').dark }),
}));

const ready = <T,>(data: T): HomeSection<T> => ({ state: 'ready', data, stale: false, retry: jest.fn() });
const history = ready([
  { ...fixtureDailyCheckIn, date: '2026-09-14', morning_weight: 73 },
  { ...fixtureDailyCheckIn, date: '2026-09-15', morning_weight: 72.4 },
]);
const complete: HomeWorkoutRecord = { id: 'workout-1', date: '2026-09-15', content: serializeWorkoutContent({ planDayNumber: 1,
  exercises: [{ name: 'Squat', sets: [{ setNumber: 1, reps: '8', weight: '40', rpe: '7', completed: true }] }],
}) };

it('shows the exact reporting window, observed change, completion counts and the existing progress entry', async () => {
  const onOpen = jest.fn();
  const view = await render(<WeeklyRecap history={history} workouts={ready([complete])} today="2026-09-15" onOpen={onOpen} />);
  expect(view.getByText('14 Sep–15 Sep 2026')).toBeTruthy();
  expect(view.getByText('1 recorded · 1 completed')).toBeTruthy();
  expect(view.getByText('72.4 kg')).toBeTruthy();
  expect(view.getByText('−0.6 kg across 2 dates this week')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'View progress' }));
  expect(onOpen).toHaveBeenCalledTimes(1);
});

it('retains the latest dated weight before this week without claiming an in-week change', async () => {
  const view = await render(<WeeklyRecap history={ready([
    { ...fixtureDailyCheckIn, date: '2026-09-10', morning_weight: 73 },
    { ...fixtureDailyCheckIn, date: '2026-09-15', morning_weight: null },
  ])} workouts={ready([])} today="2026-09-15" onOpen={jest.fn()} />);
  expect(view.getByText('73.0 kg')).toBeTruthy();
  expect(view.getByText(/Check-in ·.*Sep 10, 2026/)).toBeTruthy();
  expect(view.getByText('Before this week · No weight observations in this window.')).toBeTruthy();
  expect(view.queryByText(/kg across/)).toBeNull();
});

it('keeps legacy completion unknown instead of calling a saved row a completed workout', async () => {
  const view = await render(<WeeklyRecap history={ready([])} workouts={ready([{ id: 'legacy', date: '2026-09-15', content: 'Training notes' }])} today="2026-09-15" onOpen={jest.fn()} />);
  expect(view.getByText('1 recorded · 1 completion unknown')).toBeTruthy();
  expect(view.queryByText('1 completed workout')).toBeNull();
});

it.each([
  [{ state: 'loading' }, 'Loading workouts…'],
  [{ state: 'error', retry: jest.fn() }, 'Workout history is unavailable. Pull down to retry.'],
  [{ ...ready([]), stale: true }, 'Saved workout history may be out of date.'],
  [{ ...ready([]), refreshing: true }, 'Checking for newer workouts…'],
] as const)('does not present an uncertain workout source as zero activity (%j)', async (workouts, label) => {
  const view = await render(<WeeklyRecap history={ready([])} workouts={workouts} today="2026-09-15" onOpen={jest.fn()} />);
  expect(view.getByText(label)).toBeTruthy();
  expect(view.queryByText('No synced workouts this week.')).toBeNull();
  expect(view.queryByText('No completed sessions recorded')).toBeNull();
});

it('shows confirmed empty records without inventing a measurement or hiding progress', async () => {
  const view = await render(<WeeklyRecap history={ready([])} workouts={ready([])} today="2026-09-15" onOpen={jest.fn()} />);
  expect(view.getByText('No morning weight recorded yet.')).toBeTruthy();
  expect(view.getByText('No synced workouts this week.')).toBeTruthy();
  expect(view.getByRole('button', { name: 'View progress' })).toBeTruthy();
});
