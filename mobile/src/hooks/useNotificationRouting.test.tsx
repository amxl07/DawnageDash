import { act, renderHook, waitFor } from '@testing-library/react-native';

import { registerCheckInExitGuard } from '@/features/checkin/checkInExitGuard';
import { useNotificationRouting } from './useNotificationRouting';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockLastResponse = jest.fn();
let responseListener: ((response: any) => void) | undefined;
let mockToday = '2026-09-16';

const mockRouter = { push: mockPush, replace: mockReplace };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
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
    pathname: '/(app)/daily-check-in',
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
  expect(mockReplace).toHaveBeenCalledWith({
    pathname: '/(app)/daily-check-in',
    params: { date: '2026-09-16' },
  });

  expect(mockPush).not.toHaveBeenCalled();
  unregister();
  await view.unmount();
});

it('keeps weekly reminder routing unchanged', async () => {
  const view = await renderHook(() => useNotificationRouting(true));
  await act(async () => { responseListener?.(response('/weekly-feedback')); });
  expect(mockPush).toHaveBeenCalledWith('/(app)/weekly-feedback');
  await view.unmount();
});


it('replaces a loading editor even before its persistence guard registers', async () => {
  const view = await renderHook(() => useNotificationRouting(true, '/daily-check-in'));
  await act(async () => { responseListener?.(response('/check-in')); });
  expect(mockReplace).toHaveBeenCalledWith({ pathname: '/(app)/daily-check-in', params: { date: '2026-09-16' } });
  expect(mockPush).not.toHaveBeenCalled();
  await view.unmount();
});

it('handles a pending cold-start response with the latest route after navigation', async () => {
  let resolveResponse!: (value: ReturnType<typeof response>) => void;
  mockLastResponse.mockReturnValue(new Promise((resolve) => { resolveResponse = resolve; }));
  const view = await renderHook<void, { pathname: string }>(({ pathname }) => useNotificationRouting(true, pathname), { initialProps: { pathname: '/' } });
  const originalListener = responseListener;
  await view.rerender({ pathname: '/daily-check-in' });
  await act(async () => { resolveResponse(response('/check-in')); });
  await waitFor(() => expect(mockReplace).toHaveBeenCalledWith({ pathname: '/(app)/daily-check-in', params: { date: '2026-09-16' } }));
  expect(mockLastResponse).toHaveBeenCalledTimes(1);
  expect(responseListener).toBe(originalListener);
  expect(mockPush).not.toHaveBeenCalled();
  await view.unmount();
});
