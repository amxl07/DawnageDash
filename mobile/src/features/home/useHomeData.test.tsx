import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { serializeWorkoutContent } from '@/lib/workout-content';
import { useHomeData } from './useHomeData';

const mockRows = [{ id: 'partial', date: '2026-09-15', content: serializeWorkoutContent({
  planDayNumber: 2, exercises: [{ name: 'Squat', sets: [{ setNumber: 1, reps: '', weight: '', rpe: '', completed: false }] }],
}) }];
const mockQuery = { data: [], isError: false, isFetching: false, fetchStatus: 'idle', refetch: jest.fn(), isRefetching: false };
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockGte = jest.fn();
const mockLte = jest.fn();
const mockFrom = jest.fn();
let mockUser = 'user-1';

jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mockUser ? { id: mockUser } : null }) }));
jest.mock('expo-router', () => ({ useFocusEffect: () => undefined }));
jest.mock('@/hooks/useCoach', () => ({ useCoach: () => ({ ...mockQuery, data: { kind: 'unassigned' } }) }));
jest.mock('@/hooks/useDashboardData', () => ({ useDailyCheckIns: () => mockQuery }));
jest.mock('@/hooks/usePlans', () => ({ useUserProfile: () => ({ ...mockQuery, data: null }), useWorkoutPlan: () => ({ ...mockQuery, data: { days: [], source: 'none' } }) }));
jest.mock('@/features/weekly/useWeeklyFeedbackHistory', () => ({ useWeeklyFeedbackHistory: () => mockQuery }));
jest.mock('@/lib/supabase', () => ({ supabase: { from: (...args: unknown[]) => mockFrom(...args) } }));

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = 'user-1';
  const workoutBuilder = { select: mockSelect, eq: mockEq, gte: mockGte, lte: mockLte };
  mockSelect.mockReturnValue(workoutBuilder);
  mockEq.mockReturnValue(workoutBuilder);
  mockGte.mockReturnValue(workoutBuilder);
  mockLte.mockResolvedValue({ data: mockRows, error: null });
  mockFrom.mockImplementation((table: string) => table === 'workout_logs' ? workoutBuilder : {
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }),
  });
});

function queryWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  return { client, wrapper: ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider> };
}

it('fetches identifiable sessions once for the reporting week and preserves partial logged plan days', async () => {
  const { wrapper, client } = queryWrapper();
  const view = await renderHook(() => useHomeData('2026-09-15'), { wrapper });
  await waitFor(() => expect(view.result.current.workouts.state).toBe('ready'));
  expect(mockFrom.mock.calls.filter(([table]) => table === 'workout_logs')).toHaveLength(1);
  expect(mockSelect).toHaveBeenCalledWith('id,date,content');
  expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
  expect(mockGte).toHaveBeenCalledWith('date', '2026-09-14');
  expect(mockLte).toHaveBeenCalledWith('date', '2026-09-15');
  expect(view.result.current.workouts).toMatchObject({ state: 'ready', data: mockRows });
  expect(view.result.current.loggedPlanDays).toMatchObject({ state: 'ready', data: [2] });
  await view.unmount();
  client.clear();
});

it('refetches the bounded window after midnight without reusing the previous account’s data', async () => {
  const { wrapper, client } = queryWrapper();
  const view = await renderHook<ReturnType<typeof useHomeData>, { today: string }>(
    ({ today }) => useHomeData(today), { wrapper, initialProps: { today: '2026-09-20' } },
  );
  await waitFor(() => expect(view.result.current.workouts.state).toBe('ready'));
  mockUser = 'user-2';
  mockLte.mockResolvedValue({ data: [], error: null });
  await view.rerender({ today: '2026-09-21' });
  await waitFor(() => expect(view.result.current.workouts).toMatchObject({ state: 'ready', data: [] }));
  expect(mockEq).toHaveBeenLastCalledWith('user_id', 'user-2');
  expect(mockGte).toHaveBeenLastCalledWith('date', '2026-09-21');
  expect(mockLte).toHaveBeenLastCalledWith('date', '2026-09-21');
  await view.unmount();
  client.clear();
});

it('keeps workout failure unavailable for both recap and next-session selection', async () => {
  mockLte.mockResolvedValue({ data: null, error: new Error('Unavailable') });
  const { wrapper, client } = queryWrapper();
  const view = await renderHook(() => useHomeData('2026-09-15'), { wrapper });
  await waitFor(() => expect(view.result.current.workouts.state).toBe('error'));
  expect(view.result.current.loggedPlanDays.state).toBe('error');
  await view.unmount();
  client.clear();
});

it('counts only currently valid known assessment sections after a required clear', async () => {
  const original = mockFrom.getMockImplementation()!;
  mockFrom.mockImplementation((table: string) => table === 'onboarding_questionnaire' ? {
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: {
      answers: JSON.stringify({q14:'   '}),
      completed_sections: JSON.stringify(['goals','goals','body_measurements','unknown']),
    }, error:null }) }) }),
  } : original(table));
  const {wrapper,client}=queryWrapper();
  const view=await renderHook(()=>useHomeData('2026-09-15'),{wrapper});
  await waitFor(()=>expect(view.result.current.assessment).toMatchObject({state:'ready',data:{completed:1,total:10}}));
  await view.unmount(); client.clear();
});
