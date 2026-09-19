import { PostgrestClient } from '@supabase/postgrest-js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, create } from 'react-test-renderer';
import { usePhotoMutation, type PhotoPayload } from './useProgressPhotos';

const owner = '11111111-1111-4111-8111-111111111111';
const existingId = '22222222-2222-4222-8222-222222222222';
let mockDatabase = new PostgrestClient('https://fixture.supabase.co/rest/v1');
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: '11111111-1111-4111-8111-111111111111' } }) }));
jest.mock('@/lib/env', () => ({ supabaseUrl: 'https://fixture.supabase.co' }));
jest.mock('@/lib/supabase', () => ({ supabase: { from: (table: string) => mockDatabase.from(table) } }));

const payload: PhotoPayload = {
  date: '2026-09-19', front_url: `${owner}/2026-09-19/front_123.jpg`,
  back_url: null, side_left_url: null, side_right_url: null,
};

type CapturedWrite = { method: string; url: URL; headers: Headers; body: unknown };
async function runMutation(existing: boolean, acknowledgement: unknown) {
  const writes: CapturedWrite[] = [];
  mockDatabase = new PostgrestClient('https://fixture.supabase.co/rest/v1', {
    fetch: async (input, init) => {
      const method = init?.method ?? 'GET';
      if (method === 'GET') {
        return new Response(JSON.stringify(existing ? [{ id: existingId }] : []), { status: 200 });
      }
      writes.push({ method, url: new URL(String(input)), headers: new Headers(init?.headers), body: JSON.parse(String(init?.body)) });
      return new Response(JSON.stringify(acknowledgement), { status: 200 });
    },
  });
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: Infinity } } });
  let mutation!: ReturnType<typeof usePhotoMutation>;
  function Harness() { mutation = usePhotoMutation(); return null; }
  let renderer!: ReturnType<typeof create>;
  await act(async () => { renderer = create(<QueryClientProvider client={client}><Harness /></QueryClientProvider>); });
  let failure: unknown;
  await act(async () => { try { await mutation.mutateAsync(payload); } catch (error) { failure = error; } });
  act(() => renderer.unmount());
  client.clear();
  return { failure, writes };
}

it.each([
  ['zero rows', []],
  ['wrong row', { id: 'another-row', user_id: owner }],
  ['wrong owner', { id: existingId, user_id: 'another-owner' }],
  ['missing identity', { user_id: owner }],
])('rejects an update with %s acknowledgement from installed PostgREST', async (_label, acknowledgement) => {
  const { failure } = await runMutation(true, acknowledgement);
  expect(failure).toBeDefined();
});

it.each([
  ['zero rows', []],
  ['wrong owner', { id: existingId, user_id: 'another-owner' }],
  ['missing identity', { user_id: owner }],
])('rejects an insert with %s acknowledgement from installed PostgREST', async (_label, acknowledgement) => {
  const { failure } = await runMutation(false, acknowledgement);
  expect(failure).toBeDefined();
});

it.each([true, false])('accepts an owned photo row and requests its representation (update: %s)', async (existing) => {
  const { failure, writes } = await runMutation(existing, { id: existingId, user_id: owner });
  expect(failure).toBeUndefined();
  expect(writes).toHaveLength(1);
  expect(writes[0].method).toBe(existing ? 'PATCH' : 'POST');
  expect(writes[0].headers.get('prefer')).toContain('return=representation');
  expect(writes[0].url.searchParams.get('select')).toBe('id,user_id');
  if (existing) {
    expect(writes[0].url.searchParams.get('id')).toBe(`eq.${existingId}`);
    expect(writes[0].url.searchParams.get('user_id')).toBe(`eq.${owner}`);
  }
  expect(writes[0].body).toEqual({ ...payload, user_id: owner });
});
