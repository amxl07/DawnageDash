/* eslint-disable @typescript-eslint/no-require-imports */
import { fireEvent, render } from '@testing-library/react-native';
import HomeScreen from '../../../../app/(app)/(tabs)/index';
import { fixtureDailyCheckIn, fixturePlanDays, fixtureProfile } from '@/testing/redesignFixtures';
import { emptyWeekly } from '@/components/weekly/steps';
import { serializeWorkoutContent } from '@/lib/workout-content';

const mockPush = jest.fn();
const mockData = jest.fn();
const mockLocal = jest.fn();
jest.mock('lucide-react-native', () => Object.fromEntries(['ArrowUpRight', 'ChevronDown', 'ClipboardList', 'ChevronRight', 'RefreshCw', 'UserRound', 'Dumbbell', 'Check', 'Clock3', 'Pencil', 'TriangleAlert'].map((name) => [name, () => null])));
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
    Sheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => visible ? <View>{children}</View> : null,
    SheetScrollView: View,
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
    assessment: ready({ completed: 2, total: 10 }), loggedPlanDays: ready([1]), workouts: ready([]),
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
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/(app)/daily-check-in', params: { date: '2026-09-15' } });
});

it('welcomes a waiting client without inventing Day 1 or empty progress', async () => {
  mockData.mockReturnValue({ ...homeData(), profile: ready({ ...fixtureProfile, package_start_date: null, profile_data: { start_preference: 'wait_for_coach' } }) });
  const view = await render(<HomeScreen />);
  expect(view.getByTestId('program-welcome')).toBeTruthy();
  expect(view.queryByText('This week')).toBeNull();
  expect(view.queryByText(/Day 1 of your program/)).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Start my first check-in' }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/(app)/daily-check-in', params: { date: '2026-09-15' } });
});

it('does not invite a second first check-in while the original is queued', async () => {
  mockData.mockReturnValue({ ...homeData(), profile: ready({ ...fixtureProfile, package_start_date: null }) });
  mockLocal.mockReturnValue({ data: { workoutDraft: null, checkInDraft: null, checkIns: [{ payload: { date: '2026-09-15' } }], workouts: [] }, refetch: jest.fn(), isError: false });
  const view = await render(<HomeScreen />);
  expect(view.queryByTestId('program-welcome')).toBeNull();
  expect(view.getByText('Your first check-in is waiting to sync')).toBeTruthy();
});

it('lets a waiting client practise and close the guide without starting a check-in', async () => {
  mockData.mockReturnValue({ ...homeData(), profile: ready({ ...fixtureProfile, package_start_date: null, profile_data: { start_preference: 'wait_for_coach' } }) });
  const view = await render(<HomeScreen />);
  await fireEvent.press(view.getByRole('button', { name: 'How check-ins work' }));
  await fireEvent.press(view.getByTestId('practice-energy-8'));
  expect(view.getByTestId('practice-energy-8').props.accessibilityState.selected).toBe(true);
  expect(view.getByText('Practice — nothing is saved')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Got it' }));
  expect(view.queryByTestId('practice-energy-8')).toBeNull();
  expect(mockPush).not.toHaveBeenCalled();
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
  expect(view.getByRole('button', { name: "Retry: Couldn't load today's summary" })).toBeTruthy();
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
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/(app)/daily-check-in', params: { date: '2026-09-14' } });
});

it('keeps stale absence out of the primary action but accepts known presence', async () => {
  mockData.mockReturnValue({ ...homeData(), checkIns: { ...ready([]), stale: true } });
  const view = await render(<HomeScreen />);
  expect(view.queryByTestId('home-today-action')).toBeNull();
  mockData.mockReturnValue({ ...homeData(), checkIns: { ...ready([{ ...fixtureDailyCheckIn, date: '2026-09-15' }]), stale: true } });
  await view.rerender(<HomeScreen />);
  expect(view.getByTestId('home-today-action')).toBeTruthy();
  expect(view.queryByText('Daily check-in')).toBeNull();
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

it('keeps the optional weekly invitation inside details when no report exists', async () => {
  const view = await render(<HomeScreen />);
  expect(view.queryByRole('button', { name: 'Start weekly check-in' })).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Progress & coaching' }));
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
  expect(view.getByRole('button', { name: 'Remove sent check-in draft' })).toBeTruthy();
  expect(view.queryByRole('button', { name: 'Resume weekly check-in' })).toBeNull();
});

it('preserves a divergent same-week draft behind a review action', async () => {
  mockData.mockReturnValue({ ...homeData(), weeklyFeedback: ready([{ ...emptyWeekly(), overall_feeling: 'Previously sent', id: 'sent', user_id: 'user-1', week_start_date: '2026-09-14', created_at: '2026-09-15T12:00:00Z' }]) });
  mockLocal.mockReturnValue({ data: { weeklyDraft: { form: { ...emptyWeekly(), overall_feeling: 'Newer answer' }, step: 4 }, checkIns: [], workouts: [] }, refetch: jest.fn(), isError: false });
  const view = await render(<HomeScreen />);
  expect(view.getByRole('button', { name: 'Review saved weekly draft' })).toBeTruthy();
  expect(view.queryByRole('button', { name: 'Resume weekly check-in' })).toBeNull();
});


it.each([false, true])('keeps weekly draft recovery before a first check-in (pending: %s)', async (pending) => {
  mockData.mockReturnValue({ ...homeData(), profile: ready({ ...fixtureProfile, package_start_date: null }) });
  const refetch = jest.fn();
  const localData = { weeklyDraft: { form: { overall_feeling: 'Keep my draft' }, step: 2 }, checkIns: pending ? [{ payload: { date: '2026-09-15' } }] : [], workouts: [] };
  mockLocal.mockReturnValue({ data: localData, refetch, isError: false });
  const view = await render(<HomeScreen />);
  await fireEvent.press(view.getByRole('button', { name: 'Resume weekly check-in' }));
  expect(mockPush).toHaveBeenCalledWith('/(app)/weekly-feedback');
  mockLocal.mockReturnValue({ data: { ...localData, weeklyDraft: null, weeklyDraftError: true }, refetch, isError: false });
  await view.rerender(<HomeScreen />);
  await fireEvent.press(view.getByRole('button', { name: 'Retry: Saved weekly draft couldn’t load' }));
  expect(refetch).toHaveBeenCalled();
});

it('does not offer a new first check-in while empty history is being refreshed', async () => {
  mockData.mockReturnValue({ ...homeData(), profile: ready({ ...fixtureProfile, package_start_date: null }), checkIns: { ...ready([]), refreshing: true } });
  const view = await render(<HomeScreen />);
  expect(view.queryByTestId('program-welcome')).toBeNull();
  expect(view.queryByTestId('home-today-action')).toBeNull();
});


it('keeps progress and assessment secondary while preserving a weekly draft on the main page', async () => {
  mockData.mockReturnValue({ ...homeData(), checkIns: ready([{ ...fixtureDailyCheckIn, date: '2026-09-14' }]) });
  mockLocal.mockReturnValue({ data: { weeklyDraft: { form: { overall_feeling: 'Keep this' }, step: 1 }, checkIns: [], workouts: [] }, refetch: jest.fn(), isError: false });
  const view = await render(<HomeScreen />);
  expect(view.queryByRole('button', { name: 'Continue your coaching assessment' })).toBeNull();
  expect(view.queryByText('Your recent record')).toBeNull();
  expect(view.getByRole('button', { name: 'Resume weekly check-in' })).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Progress & coaching' }));
  expect(view.getByRole('button', { name: 'Continue your coaching assessment' })).toBeTruthy();
  expect(view.getByText('Your recent record')).toBeTruthy();
});

it('gives an available session one main action after the daily check-in is saved', async () => {
  mockData.mockReturnValue({ ...homeData(), checkIns: ready([{ ...fixtureDailyCheckIn, date: '2026-09-15' }]) });
  const view = await render(<HomeScreen />);
  expect(view.queryByRole('button', { name: /View next session:/ })).toBeNull();
  await fireEvent.press(view.getByTestId('home-today-action'));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/(app)/logger', params: { day: '2' } });
  expect(view.getByText(fixturePlanDays[1].focus!)).toBeTruthy();
});

it('opens progress from a dated weight summary without expanding details', async () => {
  mockData.mockReturnValue({ ...homeData(), checkIns: ready([
    { ...fixtureDailyCheckIn, date: '2026-09-10', morning_weight: 73 },
    { ...fixtureDailyCheckIn, date: '2026-09-14', morning_weight: '72.4' },
    { ...fixtureDailyCheckIn, date: '2026-09-15', morning_weight: null },
  ]) });
  const view = await render(<HomeScreen />);
  expect(view.getByText('72.4 kg')).toBeTruthy();
  expect(view.getByText(/Check-in ·.*Sep 14, 2026/)).toBeTruthy();
  expect(view.getByText('1 weigh-in this week.')).toBeTruthy();
  expect(view.queryByText(/kg across/)).toBeNull();
  expect(view.queryByText('Your recent record')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'View progress' }));
  expect(mockPush).toHaveBeenCalledWith('/(app)/measurements');
});

it('keeps confirmed empty progress available without manufacturing a weight', async () => {
  const view = await render(<HomeScreen />);
  expect(view.getByText('No morning weight recorded yet.')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'View progress' }));
  expect(mockPush).toHaveBeenCalledWith('/(app)/measurements');
});

it('labels cached progress while retaining its original source date', async () => {
  mockData.mockReturnValue({ ...homeData(), checkIns: { ...ready([
    { ...fixtureDailyCheckIn, date: '2026-09-14', morning_weight: 72.4 },
  ]), stale: true } });
  const view = await render(<HomeScreen />);
  expect(view.getByText('72.4 kg')).toBeTruthy();
  expect(view.getByText(/Check-in ·.*Sep 14, 2026/)).toBeTruthy();
  expect(view.getByText('Saved data · may be out of date.')).toBeTruthy();
  expect(view.queryByText(/kg since/)).toBeNull();
});

it.each([
  [{ state: 'loading' }, 'Loading progress…'],
  [{ state: 'error', retry: jest.fn() }, 'Progress is unavailable. Pull down to retry.'],
  [{ ...ready([]), stale: true }, 'Saved check-ins have no morning weight. Refresh to check for updates.'],
  [{ ...ready([]), refreshing: true }, 'Checking for newer check-ins…'],
])('does not treat unavailable or refreshing progress as confirmed absence (%j)', async (checkIns, message) => {
  mockData.mockReturnValue({ ...homeData(), checkIns });
  const view = await render(<HomeScreen />);
  expect(view.getByText(message)).toBeTruthy();
  expect(view.queryByText('No morning weight recorded yet.')).toBeNull();
  expect(view.queryByText(/0 of .*saved/)).toBeNull();
  expect(view.getByRole('button', { name: 'View progress' })).toBeTruthy();
});

it('places one dated recap below the weekly strip without duplicating its consistency or weight', async () => {
  mockData.mockReturnValue({ ...homeData(), checkIns: ready([
    { ...fixtureDailyCheckIn, date: '2026-09-14', morning_weight: 73 },
    { ...fixtureDailyCheckIn, date: '2026-09-15', morning_weight: 72.4 },
    { ...fixtureDailyCheckIn, date: '2026-09-16', morning_weight: 71 },
  ]) });
  const view = await render(<HomeScreen />);
  expect(view.getAllByText('2 of 2 days saved')).toHaveLength(1);
  expect(view.getByText('14 Sep–15 Sep 2026')).toBeTruthy();
  expect(view.getAllByText('72.4 kg')).toHaveLength(1);
  expect(view.getByText('−0.6 kg across 2 dates this week')).toBeTruthy();
  expect(view.queryByTestId('home-progress-summary')).toBeNull();
});

it.each([
  [{ ...ready([]), stale: true }, 'Saved check-ins may be out of date'],
  [{ ...ready([]), refreshing: true }, 'Checking saved days…'],
])('does not report zero check-in consistency from uncertain history (%j)', async (checkIns, label) => {
  mockData.mockReturnValue({ ...homeData(), checkIns });
  const view = await render(<HomeScreen />);
  expect(view.getAllByText(label).length).toBeGreaterThan(0);
  expect(view.queryByText(/0 of .*saved/)).toBeNull();
});

it('does not report zero check-in consistency when device records are unavailable', async () => {
  mockLocal.mockReturnValue({ data: undefined, refetch: jest.fn(), isError: true });
  const view = await render(<HomeScreen />);
  expect(view.getByText('Waiting for device records')).toBeTruthy();
  expect(view.queryByText(/0 of .*saved/)).toBeNull();
});
