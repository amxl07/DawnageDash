import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create } from 'react-test-renderer';
import { useBodyMeasurementHistory } from './useDashboardData';
import { useMeasurements } from './useMeasurements';

jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
jest.mock('@/lib/supabase', () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({
  order: async (_key: string, { ascending }: { ascending: boolean }) => ({
    data: ascending ? [{ id: 'old', date: '2026-08-01', waist: 100 }, { id: 'new', date: '2026-09-19', waist: 85 }] : [{ id: 'new', date: '2026-09-19', waist: 85 }, { id: 'old', date: '2026-08-01', waist: 100 }], error: null,
  }),
}) }) }) } }));

it('keeps current measurements first after another consumer refreshes the shared cache', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  let refresh!: () => Promise<unknown>;
  let current!: ReturnType<typeof useMeasurements>;
  function Measurements() { current = useMeasurements(); return null; }
  function OtherConsumer() { refresh = useBodyMeasurementHistory().refetch; return null; }
  let renderer!: ReturnType<typeof create>;
  await act(async () => { renderer = create(<QueryClientProvider client={client}><Measurements /><OtherConsumer /></QueryClientProvider>); });
  await act(async () => { await refresh(); });
  expect(client.getQueryData<{ waist: number }[]>(['bodyMeasurements', 'owner'])?.[0].waist).toBe(85);
  await act(async () => { await current.refetch(); });
  expect(client.getQueryData<{ waist: number }[]>(['bodyMeasurements', 'owner'])?.[0].waist).toBe(85);
  act(() => renderer.unmount());
  client.clear();
});
