/* eslint-disable @typescript-eslint/no-require-imports */
import { fireEvent, render } from '@testing-library/react-native';
import HomeScreen from '../../../../app/(app)/(tabs)/index';
import { fixtureDailyCheckIn, fixturePlanDays, fixtureProfile } from '@/testing/redesignFixtures';
import { emptyWeekly } from '@/components/weekly/steps';
import { serializeWorkoutContent } from '@/lib/workout-content';

const mockPush = jest.fn();
const mockData = jest.fn();
const mockLocal = jest.fn();
jest.mock('lucide-react-native', () => Object.fromEntries(['ArrowUpRight', 'ClipboardList', 'ChevronRight', 'RefreshCw', 'UserRound', 'Dumbbell', 'Check', 'Clock3', 'Pencil', 'TriangleAlert'].map((name) => [name, () => null])));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('@/features/home/useHomeData', () => ({ useHomeData: () => mockData() }));
jest.mock('@/features/home/useHomeLocal', () => ({ useHomeLocal: () => mockLocal() }));
jest.mock('@/features/home/useHomeDate', () => ({ useHomeDate: () => '2026-09-15' }));
jest.mock('@/hooks/usePlanProvenance', () => ({ usePlanProvenance: () => ({ hasChanged: false }) }));
jest.mock('@/components/ui', () => {
  const { View, Text, Pressable } = require('react-native');
  return {
    Screen: ({ children }: { children: React.ReactNode }) => <View>{children}</View>,
    Card: ({ children, ...props }: React.ComponentProps<typeof View>) => <View {...props}>{children}</View>,
    Text,
    Button: ({ label, onPress, ...props }: { label: string; onPress: () => void }) => <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} {...props}><Text>{label}</Text></Pressable>,
    SkeletonCard: () => <Text>Loading</Text>,
  };
});
jest.mock('@/theme', () => ({
  ...jest.requireActual('@/theme/tokens'),
  useMotion: () => ({ ...jest.requireActual('@/theme/tokens').motion, enabled: false, reduced: true }),
  useTheme: () => ({ colors: jest.requireActual('@/theme/colors').dark }),
}));

const ready = <T,>(data: T) => ({ state: 'ready', data, stale: false, retry: jest.fn() });
function homeData() {
  return {
    profile: ready(fixtureProfile), checkIns: ready([]), weeklyFeedback: ready([]),
    plan: ready({ days: fixturePlanDays, source: 'user' }), coach: ready({ kind: 'unassigned' }),
    assessment: ready({ completed: 2, total: 10 }), loggedPlanDays: ready([1]),
    refresh: jest.fn(), refreshing: false,
  };
}
beforeEach(() => {
  jest.clearAllMocks();
  mockData.mockReturnValue(homeData());
  mockLocal.mockReturnValue({ data: { workoutDraft: null, checkInDraft: null, checkIns: [], workouts: [] }, refetch: jest.fn(), isError: false });
});

it('keeps the daily action available when weekly history fails', async () => {
  mockData.mockReturnValue({ ...homeData(), weeklyFeedback: { state: 'error', retry: jest.fn() } });
  const view = await render(<HomeScreen />);
  await fireEvent.press(view.getByTestId('home-today-action'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/(app)/(tabs)/check-in', params: { date: '2026-09-15' } });
});

it('resumes an overnight workout with its original record identity', async () => {
  mockLocal.mockReturnValue({ data: { workoutDraft: { date: '2026-09-14', logId: 'owned-log' }, checkInDraft: null, checkIns: [], workouts: [] }, refetch: jest.fn(), isError: false });
  const view = await render(<HomeScreen />);
  await fireEvent.press(view.getByRole('button', { name: 'Resume workout' }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/(app)/logger', params: { date: '2026-09-14', logId: 'owned-log' } });
});

it('does not invite a new check-in while its records are unavailable', async () => {
  mockData.mockReturnValue({ ...homeData(), checkIns: { state: 'error', retry: jest.fn() } });
  const view = await render(<HomeScreen />);
  expect(view.queryByTestId('home-today-action')).toBeNull();
  expect(view.getByRole('button', { name: 'Retry: Your day is still here' })).toBeTruthy();
});

it('opens the actual next assigned session, not a scheduled-day guess', async () => {
  const view = await render(<HomeScreen />);
  await fireEvent.press(view.getByRole('button', { name: /View next session:.*day 2/ }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/(app)/logger', params: { day: '2' } });
});

it('labels a rejected queued record and opens its original date for correction', async () => {
  mockLocal.mockReturnValue({ data: { workoutDraft: null, checkInDraft: null, checkIns: [{ payload: { date: '2026-09-14' }, failure: { retryable: false } }], workouts: [] }, refetch: jest.fn(), isError: false });
  const view = await render(<HomeScreen />);
  expect(view.getByText('A saved record needs attention')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Review check-in' }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/(app)/(tabs)/check-in', params: { date: '2026-09-14' } });
});

it('keeps stale absence out of the primary action but accepts known presence', async () => {
  mockData.mockReturnValue({ ...homeData(), checkIns: { ...ready([]), stale: true } });
  const view = await render(<HomeScreen />);
  expect(view.queryByTestId('home-today-action')).toBeNull();
  mockData.mockReturnValue({ ...homeData(), checkIns: { ...ready([{ ...fixtureDailyCheckIn, date: '2026-09-15' }]), stale: true } });
  await view.rerender(<HomeScreen />);
  expect(view.getByTestId('home-today-action')).toBeTruthy();
  expect(view.queryByText('Your daily check-in')).toBeNull();
});

it('opens the blocked workout itself and does not advertise its day as new', async () => {
  mockLocal.mockReturnValue({ data: { workoutDraft: null, checkInDraft: null, checkIns: [], workouts: [
    { id: 'queued', date: '2026-09-15', queuedAt: 1, content: serializeWorkoutContent({ exercises: [], planDayNumber: 1 }) },
    { id: 'blocked', date: '2026-09-14', existingLogId: 'owned-log', queuedAt: 2, content: serializeWorkoutContent({ exercises: [], planDayNumber: 2 }), failure: { retryable: false } },
  ] }, refetch: jest.fn(), isError: false });
  const view = await render(<HomeScreen />);
  await fireEvent.press(view.getByTestId('home-today-action'));
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/(app)/logger', params: { date: '2026-09-14', logId: 'owned-log', outboxId: 'blocked' } });
  await fireEvent.press(view.getByRole('button', { name: 'Review workout' }));
  expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/(app)/logger', params: { date: '2026-09-14', logId: 'owned-log', outboxId: 'blocked' } });
  expect(view.queryByRole('button', { name: /View next session:.*day 2/ })).toBeNull();
});

it('makes unavailable coach and training progress explicit', async () => {
  mockData.mockReturnValue({ ...homeData(), coach: ready({ kind: 'unavailable' }), loggedPlanDays: { state: 'error', retry: jest.fn() } });
  const view = await render(<HomeScreen />);
  expect(view.getByText('Coach details are unavailable')).toBeTruthy();
  expect(view.getByRole('button', { name: "Retry: Training history couldn't load" })).toBeTruthy();
  expect(view.queryByText('A little context for your coach. A clear record for you.')).toBeNull();
});

it('offers this week’s reflection when account history confirms none was submitted', async () => {
  const view = await render(<HomeScreen />);
  await fireEvent.press(view.getByRole('button', { name: 'Start weekly check-in' }));
  expect(mockPush).toHaveBeenCalledWith('/(app)/weekly-feedback');
});

it('resumes a saved weekly draft even when weekly history is unavailable', async () => {
  mockData.mockReturnValue({ ...homeData(), weeklyFeedback: { state: 'error', retry: jest.fn() } });
  mockLocal.mockReturnValue({ data: { weeklyDraft: { form: { overall_feeling: 'A good week' }, step: 2 }, workoutDraft: null, checkInDraft: null, checkIns: [], workouts: [] }, refetch: jest.fn(), isError: false });
  const view = await render(<HomeScreen />);
  await fireEvent.press(view.getByRole('button', { name: 'Resume weekly check-in' }));
  expect(mockPush).toHaveBeenCalledWith('/(app)/weekly-feedback');
});

it('does not invent weekly completion or invite a duplicate from stale absence', async () => {
  mockData.mockReturnValue({ ...homeData(), weeklyFeedback: { ...ready([]), stale: true } });
  const view = await render(<HomeScreen />);
  expect(view.queryByRole('button', { name: 'Start weekly check-in' })).toBeNull();
  expect(view.queryByText('Weekly check-in complete')).toBeNull();
  mockData.mockReturnValue({ ...homeData(), weeklyFeedback: ready([{ user_id: 'user-1', created_at: '2026-09-15T10:00:00Z', week_start_date: '2026-09-14' }]) });
  await view.rerender(<HomeScreen />);
  expect(view.queryByRole('button', { name: 'Start weekly check-in' })).toBeNull();
});

it('drops weekly resume when the account-scoped local query resets', async () => {
  mockLocal.mockReturnValue({ data: { weeklyDraft: { form: {}, step: 1 }, checkIns: [], workouts: [] }, refetch: jest.fn(), isError: false });
  const view = await render(<HomeScreen />);
  expect(view.getByRole('button', { name: 'Resume weekly check-in' })).toBeTruthy();
  mockLocal.mockReturnValue({ data: undefined, refetch: jest.fn(), isError: false });
  await view.rerender(<HomeScreen />);
  expect(view.queryByRole('button', { name: 'Resume weekly check-in' })).toBeNull();
  expect(view.queryByRole('button', { name: 'Start weekly check-in' })).toBeNull();
});

it('offers cleanup rather than Resume for a draft already confirmed in weekly history', async () => {
  const form = { ...emptyWeekly(), overall_feeling: 'Already sent' };
  mockData.mockReturnValue({ ...homeData(), weeklyFeedback: ready([{ ...form, id: 'sent', user_id: 'user-1', week_start_date: '2026-09-14', created_at: '2026-09-15T12:00:00Z' }]) });
  mockLocal.mockReturnValue({ data: { weeklyDraft: { form, step: 4 }, checkIns: [], workouts: [] }, refetch: jest.fn(), isError: false });
  const view = await render(<HomeScreen />);
  expect(view.getByRole('button', { name: 'Finish weekly cleanup' })).toBeTruthy();
  expect(view.queryByRole('button', { name: 'Resume weekly check-in' })).toBeNull();
});

it('preserves a divergent same-week draft behind a review action', async () => {
  mockData.mockReturnValue({ ...homeData(), weeklyFeedback: ready([{ ...emptyWeekly(), overall_feeling: 'Previously sent', id: 'sent', user_id: 'user-1', week_start_date: '2026-09-14', created_at: '2026-09-15T12:00:00Z' }]) });
  mockLocal.mockReturnValue({ data: { weeklyDraft: { form: { ...emptyWeekly(), overall_feeling: 'Newer answer' }, step: 4 }, checkIns: [], workouts: [] }, refetch: jest.fn(), isError: false });
  const view = await render(<HomeScreen />);
  expect(view.getByRole('button', { name: 'Review saved weekly draft' })).toBeTruthy();
  expect(view.queryByRole('button', { name: 'Resume weekly check-in' })).toBeNull();
});
