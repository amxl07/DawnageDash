import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCheckInMutation } from './useCheckInMutation';
import { EMPTY_FORM, toPayload } from '@/features/checkin/model';

let mockUserId = 'first-account';
const mockSave = jest.fn(async (_userId: string, _payload: unknown) => ({ status: 'synced', updated: false }));
const mockFlush = jest.fn(async (_userId: string) => 0);
let connectivityListener: ((state: { isConnected: boolean }) => void) | undefined;
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: mockUserId } }) }));
jest.mock('@/features/checkin/checkInOutbox', () => ({
  saveCheckIn: (userId: string, payload: unknown) => mockSave(userId, payload),
  flushCheckInOutbox: (userId: string) => mockFlush(userId),
}));
jest.mock('@react-native-community/netinfo', () => ({ addEventListener: (listener: (state: { isConnected: boolean }) => void) => { connectivityListener = listener; return () => {}; } }));

beforeEach(() => {
  jest.clearAllMocks();
  mockUserId = 'first-account';
  connectivityListener = undefined;
  mockFlush.mockResolvedValue(0);
});

it('carries the originating account in the mutation even when the observer switches accounts', async () => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  mockUserId = 'first-account';
  const { result, rerender, unmount } = await renderHook(() => useCheckInMutation(), { wrapper });
  const originatingSubmit = result.current.mutateAsync;
  mockUserId = 'second-account';
  await rerender(undefined);
  const payload = toPayload(EMPTY_FORM, '2026-09-14');
  await act(async () => { await originatingSubmit(payload); });
  expect(mockSave).toHaveBeenCalledWith('first-account', payload);
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  await unmount();
  client.clear();
});

it.each([
  ['zero confirmed rows', () => mockFlush.mockResolvedValueOnce(0)],
  ['a rejected flush', () => mockFlush.mockRejectedValueOnce(new Error('storage unavailable'))],
] as const)('refreshes Home local records after %s without claiming remote delivery', async (_case, arrange) => {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } });
  const invalidate = jest.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  arrange();
  const view = await renderHook(() => useCheckInMutation(), { wrapper });

  await act(async () => { connectivityListener?.({ isConnected: true }); await Promise.resolve(); });
  await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['homeLocalRecords', 'first-account'] }));
  expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['dailyCheckIns', 'first-account'] });
  expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['userProfile', 'first-account'] });

  await view.unmount();
  client.clear();
});
