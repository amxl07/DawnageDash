import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useOnboarding } from './useOnboarding';

const mockRead = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'setup-user' } }) }));
jest.mock('@/lib/supabase', () => ({ supabase: { from: () => ({
  select: () => ({ eq: () => ({ single: () => mockRead() }) }),
}) } }));

it('exposes a failed setup read and recovers the saved milestone on retry', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  const failure = new Error('Connection unavailable');
  mockRead.mockResolvedValueOnce({ data: null, error: failure });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result, unmount } = await renderHook(useOnboarding, { wrapper });
  await waitFor(() => expect(result.current.isError).toBe(true));
  expect(client.getQueryData(['onboardingStep', 'setup-user'])).toBeUndefined();
  expect(client.getQueryState(['onboardingStep', 'setup-user'])?.error).toBe(failure);
  mockRead.mockResolvedValueOnce({ data: { onboarding_step: 3 }, error: null });
  await act(async () => { await result.current.refetch(); });
  await waitFor(() => expect(result.current.isError).toBe(false));
  expect(result.current.step).toBe(3);
  expect(client.getQueryData(['onboardingStep', 'setup-user'])).toBe(3);
  await unmount();
  client.clear();
});
