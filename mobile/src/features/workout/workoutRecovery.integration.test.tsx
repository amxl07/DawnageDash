import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { readWorkoutDraft, workoutDraftKey } from '@/hooks/useWorkoutDraft';
import { readOutbox, type OutboxItem } from '@/lib/outbox';
import { persistWorkoutLog } from '@/lib/workoutPersistence';
import { useWorkoutSession } from './useWorkoutSession';

jest.mock('@react-native-async-storage/async-storage', () => ({ getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() }));
jest.mock('@/hooks/usePlans', () => ({
  useWorkoutPlan: () => ({ data: { days: [] }, isPending: false, isError: false }),
  useUserProfile: () => ({ data: { active_workout_plan: null }, isSuccess: true, isFetching: false }),
  parsePointer: () => null,
}));
jest.mock('@/lib/workoutPersistence', () => ({ persistWorkoutLog: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: {
  auth: { refreshSession: jest.fn() },
  from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ order: async () => ({ data: [
    { id: 'a', title: 'Server A', content: '[]', date: '2026-09-15' },
    { id: 'b', title: 'Server B', content: '[]', date: '2026-09-15' },
  ], error: null }) }) }) }) }),
} }));

const scope = { userId: 'u', date: '2026-09-15', logId: null };
const blocked = { kind: 'permission' as const, retryable: false, code: 'http-403' };
const retained = (existingLogId: string | null, title: string, queuedAt: number): OutboxItem => ({
  id: `u:${scope.date}${existingLogId ? `:log:${existingLogId}` : ''}`, user_id: 'u', date: scope.date,
  existingLogId, title, content: `${title} exact bytes`, queuedAt, revision: queuedAt + 3, failure: blocked,
});
let memory: Map<string, string>;
let client: QueryClient;
beforeEach(() => {
  jest.clearAllMocks(); jest.mocked(persistWorkoutLog).mockReset();
  memory = new Map();
  jest.mocked(AsyncStorage.getItem).mockImplementation(async (key) => memory.get(key) ?? null);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => { memory.set(key, value); });
  jest.mocked(AsyncStorage.removeItem).mockImplementation(async (key) => { memory.delete(key); });
  client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
});
afterEach(() => client.clear());
function Wrapper({ children }: PropsWithChildren) { return <QueryClientProvider client={client}>{children}</QueryClientProvider>; }

it.each([
  { target: 'a', order: 'A/B/null', entry: 'null' },
  { target: 'a', order: 'A/null/B', entry: 'null' },
  { target: 'b', order: 'A/null/B', entry: 'null' },
  { target: 'a', order: 'A/null/B', entry: 'a' },
  { target: 'a', order: 'A/null/B', entry: 'b' },
  { target: 'b', order: 'A/null/B', entry: 'a' },
])('preserves draft ownership and resumes real storage from $entry after B failure in $order choosing $target', async ({ target, order, entry }) => {
  const a = retained('a', 'A first', 1);
  const middle = retained(null, 'Null version', order === 'A/B/null' ? 3 : 2);
  const b = retained('b', 'B version', order === 'A/B/null' ? 2 : 3);
  memory.set('workout-outbox', JSON.stringify(order === 'A/B/null' ? [a, b, middle] : [a, middle, b]));
  const selected = entry === 'null' ? middle : entry === 'a' ? a : b;
  const currentId = selected.existingLogId;
  const draft = { workoutTitle: 'Newer edits', exercises: [], selectedPlanId: 'custom', existingLogId: currentId, savedAt: Date.now(), sourceKind: 'text' as const, legacyText: 'Private newer notes' };
  const draftKey = workoutDraftKey('u', scope.date, currentId);
  memory.set(draftKey, JSON.stringify(draft));
  const unrelatedId = ['a', 'b', 'c'].find((id) => id !== currentId && id !== target)!;
  const unrelatedKey = workoutDraftKey('u', scope.date, unrelatedId);
  const unrelatedBytes = JSON.stringify({ ...draft, workoutTitle: 'Unrelated destination draft', existingLogId: unrelatedId });
  memory.set(unrelatedKey, unrelatedBytes);
  jest.mocked(persistWorkoutLog).mockImplementation(async (data, id) => {
    if (data.title === 'B version') throw { status: 403 };
    return id!;
  });
  const mount = () => renderHook(() => useWorkoutSession({ ...scope, logId: currentId }, { outboxId: selected.id }), { wrapper: Wrapper });
  let view = await mount();
  await waitFor(() => expect(view.result.current.recovery?.canRetry).toBe(true));
  await act(async () => { expect(await view.result.current.recoverSavedVersions(target)).toBeNull(); });
  expect(memory.get(unrelatedKey)).toBe(unrelatedBytes);
  expect(view.result.current.state.existingLogId).toBe(currentId ?? (target === 'b' ? 'b' : null));
  if (target === 'a') {
    expect(await readWorkoutDraft('u', scope.date, currentId)).toMatchObject({ workoutTitle: 'Newer edits', existingLogId: currentId, legacyText: 'Private newer notes' });
    // Reopen the original route, even when that exact outbox item was acknowledged.
    await view.unmount(); client.clear();
    view = await mount();
    await waitFor(() => expect(view.result.current.recovery?.canRetry).toBe(true));
    expect(view.result.current.recovery?.targets.map((row) => row.id)).toEqual([target]);
    jest.mocked(persistWorkoutLog).mockImplementation(async (_data, id) => id!);
    await act(async () => { await view.result.current.recoverSavedVersions(target); });
  } else {
    // The canonical B survivor is a valid destination. Reopen its route for a
    // newly associated null draft, or the original route of an explicit draft.
    expect(await readOutbox('u')).toEqual([expect.objectContaining({ existingLogId: 'b', title: 'B version', failure: blocked })]);
    await view.unmount(); client.clear();
    view = currentId ? await mount() : await renderHook(() => useWorkoutSession({ ...scope, logId: 'b' }, { outboxId: b.id }), { wrapper: Wrapper });
    await waitFor(() => expect(view.result.current.recovery?.canRetry).toBe(true));
    jest.mocked(persistWorkoutLog).mockImplementation(async (_data, id) => id!);
    await act(async () => { await view.result.current.recoverSavedVersions(target); });
  }
  expect(memory.get(unrelatedKey)).toBe(unrelatedBytes);
  const expectedId = currentId ?? target;
  expect(await readWorkoutDraft('u', scope.date, expectedId)).toMatchObject({ workoutTitle: 'Newer edits', existingLogId: expectedId, legacyText: 'Private newer notes' });
  if (!currentId) expect(memory.has(draftKey)).toBe(false);
  expect(await readOutbox('u')).toEqual([]);
  const expectedCalls = order === 'A/B/null'
    ? [['A first', 'a'], ['B version', 'b'], ['B version', 'b'], ['Null version', target]]
    : target === 'a'
      ? [['A first', 'a'], ['Null version', target], ['B version', 'b'], ['B version', 'b']]
      : [['A first', 'a'], ['Null version', target], ['B version', 'b'], ['B version', 'b']];
  expect(jest.mocked(persistWorkoutLog).mock.calls.map(([data, id]) => [data.title, id])).toEqual(expectedCalls);
  await view.unmount();
});
