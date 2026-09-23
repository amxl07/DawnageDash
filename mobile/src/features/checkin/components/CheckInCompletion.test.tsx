/* eslint-disable @typescript-eslint/no-require-imports */
import { fireEvent, render } from '@testing-library/react-native';
import { CheckInCompletion } from './CheckInCompletion';
import { EMPTY_FORM } from '../model';

const mockNavigate = jest.fn();
const mockPlan = jest.fn();
const mockLocal = jest.fn();
let mockProfile: object;
jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: mockNavigate }) }));
jest.mock('@/features/home/useHomeDate', () => ({ useHomeDate: () => '2026-09-20' }));
jest.mock('@/features/home/useHomeLocal', () => ({ useHomeLocal: () => mockLocal() }));
jest.mock('@/hooks/usePlans', () => ({ useWorkoutPlan: () => mockPlan(), useUserProfile: () => mockProfile }));
jest.mock('./CheckInReceipt', () => {
  const { Pressable, Text } = require('react-native');
  return { CheckInReceipt: ({ onHome, nextAction }: { onHome: () => void; nextAction?: { label: string; onPress: () => void } }) =>
    <Pressable accessibilityRole="button" accessibilityLabel={nextAction?.label ?? 'Back to Home'} onPress={nextAction?.onPress ?? onHome}><Text>{nextAction?.label ?? 'Back to Home'}</Text></Pressable> };
});

const receipt = { date: '2026-09-20', status: 'synced' as const, form: { ...EMPTY_FORM }, generation: 1 };
beforeEach(() => {
  jest.clearAllMocks();
  mockProfile = { data: { active_workout_plan: '{"level":"beginner","workoutType":"Gym","daysPerWeek":3}' } };
  mockPlan.mockReturnValue({ data: { source: 'user', days: [{ day_number: 1 }] } });
  mockLocal.mockReturnValue({ data: { checkIns: [], workouts: [], workoutDraft: null, checkInDraft: null } });
});

it('opens Plan explicitly after a confirmed current receipt, even if History was used previously', async () => {
  const view = await render(<CheckInCompletion receipt={receipt} onEdit={jest.fn()} onHome={jest.fn()} />);
  await fireEvent.press(view.getByRole('button', { name: 'View your training' }));
  expect(mockNavigate).toHaveBeenCalledWith({ pathname: '/(app)/(tabs)/plans', params: { view: 'plan' } });
});

it.each([
  { data: undefined },
  { data: { checkIns: [{ payload: { date: '2026-09-18' }, failure: { retryable: false } }], workouts: [], workoutDraft: null } },
  { data: { checkIns: [], workouts: [], workoutDraft: null }, isFetching: true },
  { data: { checkIns: [], workouts: [], workoutDraft: { date: '2026-09-18' } } },
  { data: { checkIns: [], workouts: [{ id: 'pending' }], workoutDraft: null } },
  { data: { checkIns: [], workouts: [], workoutDraft: null }, isError: true },
])('returns Home while device work is unknown or needs recovery: %o', async (local) => {
  mockLocal.mockReturnValue(local);
  const onHome = jest.fn();
  const view = await render(<CheckInCompletion receipt={receipt} onEdit={jest.fn()} onHome={onHome} />);
  await fireEvent.press(view.getByRole('button', { name: 'Back to Home' }));
  expect(onHome).toHaveBeenCalledTimes(1);
  expect(mockNavigate).not.toHaveBeenCalled();
});

it.each(['template', 'none'])('does not promote a %s plan as assigned', async (source) => {
  mockPlan.mockReturnValue({ data: { source, days: [{ day_number: 1 }] } });
  const view = await render(<CheckInCompletion receipt={receipt} onEdit={jest.fn()} onHome={jest.fn()} />);
  expect(view.queryByText('View your training')).toBeNull();
});

it.each([{ date: '2026-09-19' }, { status: 'queued' as const }])('keeps past and queued receipts focused on their record: %o', async (patch) => {
  const view = await render(<CheckInCompletion receipt={{ ...receipt, ...patch }} onEdit={jest.fn()} onHome={jest.fn()} />);
  expect(view.getByRole('button', { name: 'Back to Home' })).toBeTruthy();
  expect(mockPlan).not.toHaveBeenCalled();
  expect(mockLocal).not.toHaveBeenCalled();
});
