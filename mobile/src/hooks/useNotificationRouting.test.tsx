import { act, renderHook, waitFor } from '@testing-library/react-native';

import { registerCheckInExitGuard } from '@/features/checkin/checkInExitGuard';
import { useNotificationRouting } from './useNotificationRouting';

const mockPush = jest.fn();
const mockLastResponse = jest.fn();
let responseListener: ((response: any) => void) | undefined;
let mockToday = '2026-09-16';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getLastNotificationResponseAsync: (...args: unknown[]) => mockLastResponse(...args),
  addNotificationResponseReceivedListener: (listener: (response: any) => void) => {
    responseListener = listener;
    return { remove: jest.fn() };
  },
}));
jest.mock('@/lib/reminders', () => ({ reconcile: jest.fn(async () => undefined) }));
jest.mock('@/lib/dates', () => ({ localDateString: () => mockToday }));

const response = (url: string) => ({ notification: { request: { content: { data: { url } } } } });

beforeEach(() => {
  jest.clearAllMocks();
  responseListener = undefined;
  mockToday = '2026-09-16';
  mockLastResponse.mockResolvedValue(null);
});

it('opens a cold-start daily reminder for the local date handled', async () => {
  mockLastResponse.mockResolvedValue(response('/check-in'));
  const view = await renderHook(() => useNotificationRouting(true));

  await waitFor(() => expect(mockPush).toHaveBeenCalledWith({
    pathname: '/(app)/(tabs)/check-in',
    params: { date: '2026-09-16' },
  }));
  await view.unmount();
});

it('retains the live daily reminder date through a delayed editor exit', async () => {
  let replay: (() => void) | undefined;
  const unregister = registerCheckInExitGuard(async (next) => { replay = next; return false; });
  const view = await renderHook(() => useNotificationRouting(true));

  await act(async () => { responseListener?.(response('/check-in')); });
  expect(mockPush).not.toHaveBeenCalled();
  mockToday = '2026-09-17';
  await act(async () => { replay?.(); });
  expect(mockPush).toHaveBeenCalledWith({
    pathname: '/(app)/(tabs)/check-in',
    params: { date: '2026-09-16' },
  });

  unregister();
  await view.unmount();
});

it('keeps weekly reminder routing unchanged', async () => {
  const view = await renderHook(() => useNotificationRouting(true));
  await act(async () => { responseListener?.(response('/weekly-feedback')); });
  expect(mockPush).toHaveBeenCalledWith('/(app)/weekly-feedback');
  await view.unmount();
});
