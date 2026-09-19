import { act, renderHook } from '@testing-library/react-native';
import { useSetupController } from './useSetupController';

const mockRead = jest.fn();
const mockWrite = jest.fn();
const mockCache = jest.fn();
const mockMilestone = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'setup-user' } }) }));
jest.mock('@/hooks/usePlans', () => ({ useUserProfile: () => ({ data: { profile_data: { primary_goal: 'performance', timezone: 'Asia/Kolkata' } }, isLoading: false, isError: false, refetch: jest.fn() }) }));
jest.mock('@/hooks/useOnboarding', () => ({ useOnboarding: () => mockMilestone() }));
jest.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ setQueryData: mockCache }) }));
jest.mock('@/lib/timezones', () => ({ detectTimezone: () => 'UTC' }));
jest.mock('@/lib/supabase', () => ({ supabase: { from: () => ({
  select: () => ({ eq: () => ({ single: mockRead }) }),
  update: (payload: unknown) => ({ eq: () => ({ select: () => ({ single: () => mockWrite(payload) }) }) }),
}) } }));

beforeEach(() => {
  jest.clearAllMocks();
  mockMilestone.mockReturnValue({ step: 2, isLoading: false, isError: false, refetch: jest.fn() });
  mockRead.mockResolvedValue({ data: { onboarding_step: 2, profile_data: { primary_goal: 'performance', custom: 7 } }, error: null });
  mockWrite.mockImplementation(async (payload) => ({ data: { id: 'setup-user', ...payload }, error: null }));
});

it('hydrates values and keeps Back local without lowering saved progress', async () => {
  const { result } = await renderHook(useSetupController);
  expect(result.current.stage).toBe(2);
  expect(result.current.values.primaryGoal).toBe('performance');
  await act(() => result.current.back());
  expect(result.current.stage).toBe(1);
  expect(mockWrite).not.toHaveBeenCalled();
  await act(async () => { await result.current.continue(); });
  expect(mockWrite).toHaveBeenCalledWith(expect.objectContaining({ onboarding_step: 2 }));
});

it('finishes with one acknowledged merged users-row write', async () => {
  const { result } = await renderHook(useSetupController);
  await act(async () => { await result.current.continue(); });
  expect(mockWrite).toHaveBeenCalledTimes(1);
  expect(mockWrite).toHaveBeenCalledWith({ onboarding_step: 3, profile_data: { custom: 7, primary_goal: 'performance', timezone: 'Asia/Kolkata' } });
  expect(mockCache).toHaveBeenCalledWith(['onboardingStep', 'setup-user'], 3);
  expect(mockCache).toHaveBeenCalledWith(['userProfile', 'setup-user'], {
    id: 'setup-user', onboarding_step: 3,
    profile_data: { custom: 7, primary_goal: 'performance', timezone: 'Asia/Kolkata' },
  });
});

it('keeps choices on a failed save and suppresses duplicate activation', async () => {
  mockWrite.mockResolvedValue({ data: null, error: new Error('unavailable') });
  const { result } = await renderHook(useSetupController);
  await act(async () => { await Promise.all([result.current.continue(), result.current.continue()]); });
  expect(mockWrite).toHaveBeenCalledTimes(1);
  expect(result.current.stage).toBe(2);
  expect(result.current.values.timezone).toBe('Asia/Kolkata');
  expect(result.current.error).toBeTruthy();
  expect(mockCache).not.toHaveBeenCalled();
});

it('never replaces a profile when its latest read fails', async () => {
  mockRead.mockResolvedValue({ data: null, error: new Error('unavailable') });
  const { result } = await renderHook(useSetupController);
  await act(async () => { await result.current.continue(); });
  expect(mockWrite).not.toHaveBeenCalled();
  expect(result.current.error).toBeTruthy();
});
