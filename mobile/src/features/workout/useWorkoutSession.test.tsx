import { act, renderHook } from '@testing-library/react-native';
import { useQuery } from '@tanstack/react-query';
import { useUserProfile, useWorkoutPlan } from '@/hooks/usePlans';
import { readWorkoutDraft } from '@/hooks/useWorkoutDraft';
import { readWorkoutSessionLocal, useWorkoutSession } from './useWorkoutSession';
import { associateWorkoutOutbox, readOutbox, retryWorkoutRecovery, saveWorkoutLog, subscribeWorkoutDelivery } from '@/lib/outbox';
jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn(), useQueryClient: () => ({ invalidateQueries: jest.fn() }) }));
jest.mock('@/hooks/usePlans', () => ({ useWorkoutPlan: jest.fn(), useUserProfile: jest.fn(), parsePointer: (raw: string | null) => raw ? JSON.parse(raw) : null }));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/lib/outbox', () => ({ readOutbox: jest.fn(), retryWorkoutRecovery: jest.fn(), saveWorkoutLog: jest.fn(), associateWorkoutOutbox: jest.fn(), subscribeWorkoutDelivery: jest.fn(() => () => {}) }));
jest.mock('@/hooks/useWorkoutDraft', () => ({
  useWorkoutDraft: () => ({ saveDraft: jest.fn(async () => true), saveDraftNow: mockSaveDraftNow, associateDraft: mockAssociateDraft, clearDraft: mockClearDraft, draftStatus: 'saved' }),
  readWorkoutDraft: jest.fn(),
}));
const mockSaveDraftNow = jest.fn(async (_data?: unknown) => true);
const mockAssociateDraft = jest.fn(async (..._args: unknown[]) => true);
const mockClearDraft = jest.fn(async () => true);
const mockLocalRefetch = jest.fn(async (): Promise<unknown> => undefined);
const scope = { userId: 'u', date: '2026-09-15', logId: null };
let records: unknown;
let local: unknown;
let recordsFailed = false;
let plan: unknown;
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useUserProfile).mockReturnValue({ data: { active_workout_plan: '{"level":"Beginner"}' }, isSuccess: true, isFetching: false, isError: false, refetch: jest.fn() } as never);
  records = []; local = { draft: null, queued: null }; recordsFailed = false; plan = undefined;
  mockAssociateDraft.mockResolvedValue(true); mockClearDraft.mockResolvedValue(true); mockLocalRefetch.mockResolvedValue(undefined);
  jest.mocked(useQuery).mockImplementation(({ queryKey }: any) => ({ data: queryKey[0] === 'workoutSessionRecords' ? records : local, isError: queryKey[0] === 'workoutSessionRecords' && recordsFailed, refetch: queryKey[0] === 'workoutSessionLocal' ? mockLocalRefetch : jest.fn() }) as any);
  jest.mocked(useWorkoutPlan).mockImplementation(() => ({ data: plan, isPending: plan === undefined, isError: false, refetch: jest.fn() }) as any);
});
const assigned = { days: [{ id: 'day', day_number: 1, focus: 'Push', exercises: [{ id: 'bench', name: 'Bench', sets: 3, reps: '8', warmupSets: 0 }] }] };
it('waits for a late plan instead of permanently initializing a blank session', async () => {
  const view = await renderHook(() => useWorkoutSession(scope));
  expect(view.result.current.entry.kind).toBe('loading');
  plan = assigned; await view.rerender(undefined);
  expect(view.result.current.state.exercises[0].name).toBe('Bench');
});
it('does not seed from the plan while the server or draft is unresolved', async () => {
  plan = assigned; records = undefined; local = undefined;
  const view = await renderHook(() => useWorkoutSession(scope));
  expect(view.result.current.entry.kind).toBe('loading');
  records = []; await view.rerender(undefined);
  expect(view.result.current.entry.kind).toBe('loading');
  local = { draft: { workoutTitle: 'Local wins', exercises: [], selectedPlanId: '1', existingLogId: null, savedAt: 1 }, queued: null };
  await view.rerender(undefined);
  expect(view.result.current.state.title).toBe('Local wins');
});
it('shows failed requests and never accepts another same-date row for an explicit id', async () => {
  records = [{ id: 'other', title: 'Other' }]; plan = assigned;
  const view = await renderHook(() => useWorkoutSession({ ...scope, logId: 'missing' }));
  expect(view.result.current.entry).toEqual({ kind: 'error', reason: 'missing-log' });
  recordsFailed = true; await view.rerender(undefined);
  expect(view.result.current.entry).toEqual({ kind: 'error', reason: 'unavailable' });
});
it('gates previous-account editor state immediately when identity changes', async () => {
  plan = assigned;
  const view = await renderHook<ReturnType<typeof useWorkoutSession>, { userId: string }>(({ userId }) => useWorkoutSession({ ...scope, userId }), { initialProps: { userId: 'u' } });
  await act(() => view.result.current.edit({ type: 'SET_TITLE', payload: 'Private title' }));
  records = undefined; local = undefined;
  await view.rerender({ userId: 'other' });
  expect(view.result.current.state.title).toBe('');
  expect(view.result.current.entry.kind).toBe('loading');
});
it('attaches the saved id but preserves edits made while saving', async () => {
  plan = assigned;
  let resolve!: (result: any) => void;
  jest.mocked(saveWorkoutLog).mockImplementation(() => new Promise((done) => { resolve = done; }));
  const view = await renderHook(() => useWorkoutSession(scope));
  let saving!: Promise<unknown>;
  await act(() => { saving = view.result.current.save(); });
  await act(() => view.result.current.edit({ type: 'SET_TITLE', payload: 'Newer work' }));
  await act(async () => { resolve({ status: 'synced', logId: 'created' }); await saving; });
  expect(view.result.current.state.title).toBe('Newer work');
  expect(view.result.current.state.existingLogId).toBe('created');
  expect(view.result.current.state.isDirty).toBe(true);
});

it('recovers the exact owned preserved payload and rejects missing or mismatched identity', async () => {
  jest.mocked(readWorkoutDraft).mockResolvedValue(null);
  const queued = { id: 'exact', user_id: 'u', date: scope.date, title: 'Retained edits', content: '{"version":2,"exercises":[]}', existingLogId: 'log', queuedAt: 1 };
  jest.mocked(readOutbox).mockResolvedValue([queued]);
  expect((await readWorkoutSessionLocal({ ...scope, logId: 'log' }, 'log', 'exact')).queued).toEqual(queued);
  await expect(readWorkoutSessionLocal({ ...scope, userId: 'other', logId: 'log' }, 'log', 'exact')).rejects.toThrow('unavailable');
  await expect(readWorkoutSessionLocal({ ...scope, logId: 'wrong' }, 'wrong', 'exact')).rejects.toThrow('unavailable');
  await expect(readWorkoutSessionLocal({ ...scope, logId: 'log' }, 'log', 'missing')).rejects.toThrow('unavailable');
});
it('reopens only the exact owned account/date route alias of a retained continuation', async () => {
  jest.mocked(readWorkoutDraft).mockResolvedValue(null);
  const continuation = { id: 'b', user_id: 'u', date: scope.date, title: 'B', content: '[]', existingLogId: 'b', queuedAt: 3, retryLogId: 'a', retrySources: [{ id: 'null-source', existingLogId: null }, { id: 'a-source', existingLogId: 'a' }] };
  jest.mocked(readOutbox).mockResolvedValue([continuation]);
  expect((await readWorkoutSessionLocal(scope, null, 'null-source')).queued).toEqual(continuation);
  expect((await readWorkoutSessionLocal({ ...scope, logId: 'a' }, 'a', 'a-source')).queued).toEqual(continuation);
  await expect(readWorkoutSessionLocal({ ...scope, userId: 'other' }, null, 'null-source')).rejects.toThrow('unavailable');
  await expect(readWorkoutSessionLocal({ ...scope, date: '2026-09-14' }, null, 'null-source')).rejects.toThrow('unavailable');
  await expect(readWorkoutSessionLocal({ ...scope, logId: 'b' }, 'b', 'a-source')).rejects.toThrow('unavailable');
  await expect(readWorkoutSessionLocal(scope, null, 'unrelated')).rejects.toThrow('unavailable');
});
it('does not attach a late save response to a different account session', async () => {
  plan = assigned;
  let resolve!: (result: any) => void;
  jest.mocked(saveWorkoutLog).mockImplementation(() => new Promise((done) => { resolve = done; }));
  const view = await renderHook<ReturnType<typeof useWorkoutSession>, { userId: string }>(({ userId }) => useWorkoutSession({ ...scope, userId }), { initialProps: { userId: 'u' } });
  let saving!: Promise<unknown>;
  await act(() => { saving = view.result.current.save(); });
  await view.rerender({ userId: 'other' });
  await act(() => view.result.current.edit({ type: 'SET_TITLE', payload: 'Other account draft' }));
  await act(async () => { resolve({ status: 'synced', logId: 'old-account-log' }); await saving; });
  expect(view.result.current.state.title).toBe('Other account draft');
  expect(view.result.current.state.existingLogId).toBeNull();
});

it('restores an owned explicit draft offline but blocks a confirmed missing row', async () => {
  records = undefined; recordsFailed = true;
  local = { draft: { workoutTitle: 'Offline edits', exercises: [], selectedPlanId: '1', existingLogId: 'owned', savedAt: 1 }, queued: null };
  const view = await renderHook(() => useWorkoutSession({ ...scope, logId: 'owned' }));
  expect(view.result.current.state.title).toBe('Offline edits');
  await view.unmount();
  recordsFailed = false; records = [];
  const missing = await renderHook(() => useWorkoutSession({ ...scope, logId: 'owned' }));
  expect(missing.result.current.entry).toEqual({ kind: 'error', reason: 'missing-log' });
});

it('resolves an absent plan pointer despite the disabled plan query remaining pending', async () => {
  jest.mocked(useUserProfile).mockReturnValue({ data: { active_workout_plan: null }, isSuccess: true, isFetching: false, isError: false } as never);
  const view = await renderHook(() => useWorkoutSession(scope));
  expect(view.result.current.entry).toEqual({ kind: 'ready', source: 'blank' });
});
it('waits for the profile and exposes an upstream profile failure', async () => {
  jest.mocked(useUserProfile).mockReturnValue({ data: undefined, isSuccess: false, isFetching: true, isError: false } as never);
  const view = await renderHook(() => useWorkoutSession(scope));
  expect(view.result.current.entry.kind).toBe('loading');
  jest.mocked(useUserProfile).mockReturnValue({ data: undefined, isSuccess: false, isFetching: false, isError: true } as never);
  await view.rerender(undefined);
  expect(view.result.current.entry).toEqual({ kind: 'error', reason: 'unavailable' });
});
it('keeps historical text protected through draft restoration and offline restart', async () => {
  const text = 'Walked outside for recovery';
  records = [{ id: 'legacy', title: 'Original', content: text, date: scope.date }];
  const view = await renderHook(() => useWorkoutSession({ ...scope, logId: 'legacy' }));
  await act(() => view.result.current.edit({ type: 'SET_TITLE', payload: 'Changed title' }));
  await act(() => view.result.current.flushDraft());
  const persisted = mockSaveDraftNow.mock.calls.at(-1)![0];
  await view.unmount();
  local = { draft: { ...(persisted as object), savedAt: 1 }, queued: null };
  records = undefined; recordsFailed = true;
  const restored = await renderHook(() => useWorkoutSession({ ...scope, logId: 'legacy' }));
  expect(restored.result.current.legacyText).toBe(text);
  await act(async () => { expect(await restored.result.current.save()).toBe('invalid'); });
  expect(saveWorkoutLog).not.toHaveBeenCalled();
});
it('protects older metadata-free drafts when the matching server row is plain text', async () => {
  records = [{ id: 'legacy', title: 'Original', content: 'Original historical note', date: scope.date }];
  local = { draft: { workoutTitle: 'Changed title', exercises: [], selectedPlanId: 'custom', existingLogId: 'legacy', savedAt: 1 }, queued: null };
  const view = await renderHook(() => useWorkoutSession({ ...scope, logId: 'legacy' }));
  expect(view.result.current.legacyText).toBe('Original historical note');
  await act(async () => { expect(await view.result.current.save()).toBe('invalid'); });
  expect(saveWorkoutLog).not.toHaveBeenCalled();
});
it('requires a choice for exact ambiguous recovery and carries preserved payload into the selected target', async () => {
  records = [{ id: 'a', title: 'A', content: '[]' }, { id: 'b', title: 'B', content: '[]' }];
  const queued = { id: 'source', user_id: 'u', date: scope.date, title: 'Recovered', content: '{"version":2,"planDayNumber":1,"exercises":[]}', existingLogId: null, queuedAt: 1, revision: 4 };
  local = { draft: null, queued };
  jest.mocked(readWorkoutDraft).mockResolvedValue(null);
  jest.mocked(associateWorkoutOutbox).mockResolvedValue({ ...queued, id: 'canonical', existingLogId: 'b', revision: 5 });
  const view = await renderHook(() => useWorkoutSession(scope, { outboxId: 'source' }));
  expect(view.result.current.entry).toEqual({ kind: 'choose-log', ids: ['a', 'b'] });
  let target: unknown;
  await act(async () => { target = await view.result.current.selectLog('b'); });
  expect(target).toEqual({ logId: 'b', outboxId: 'canonical' });
  expect(associateWorkoutOutbox).toHaveBeenCalledWith(expect.objectContaining({ outboxId: 'source', revision: 4, logId: 'b', title: 'Recovered' }));
});

it('durably associates a draft-only recovery before reopening the selected owned row', async () => {
  records = [{ id: 'a', title: 'A', content: '[]' }, { id: 'b', title: 'B', content: '[]' }];
  const retained = { workoutTitle: 'Protected draft', exercises: [], selectedPlanId: '2', existingLogId: null, savedAt: 4, sourceKind: 'text' as const, legacyText: 'Original notes' };
  local = { draft: retained, queued: null };
  jest.mocked(readWorkoutDraft).mockResolvedValue(null);
  const view = await renderHook(() => useWorkoutSession(scope));
  expect(view.result.current.entry).toEqual({ kind: 'choose-log', ids: ['a', 'b'] });

  let target: unknown;
  await act(async () => { target = await view.result.current.selectLog('b'); });
  expect(target).toEqual({ logId: 'b' });
  expect(mockAssociateDraft).toHaveBeenCalledWith('b', expect.objectContaining({ workoutTitle: 'Protected draft', selectedPlanId: '2', sourceKind: 'text', legacyText: 'Original notes', existingLogId: 'b' }), expect.any(Function));
  expect(associateWorkoutOutbox).not.toHaveBeenCalled();

  await view.unmount();
  local = { draft: { ...retained, existingLogId: 'b' }, queued: null };
  const reopened = await renderHook(() => useWorkoutSession({ ...scope, logId: 'b' }));
  expect(reopened.result.current.state.title).toBe('Protected draft');
  expect(reopened.result.current.legacyText).toBe('Original notes');
});

it('associates the latest live draft-only snapshot and refuses destination storage conflicts', async () => {
  const retained = { workoutTitle: 'Offline draft', exercises: [], selectedPlanId: '1', existingLogId: null, savedAt: 4, sourceKind: 'structured' as const };
  records = undefined; recordsFailed = true; local = { draft: retained, queued: null };
  jest.mocked(readWorkoutDraft).mockResolvedValue(null);
  const view = await renderHook(() => useWorkoutSession(scope));
  await act(() => view.result.current.edit({ type: 'SET_TITLE', payload: 'Latest live title' }));
  recordsFailed = false; records = [{ id: 'a', title: 'A', content: '[]' }, { id: 'b', title: 'B', content: '[]' }];
  await view.rerender(undefined);
  expect(view.result.current.entry.kind).toBe('choose-log');
  await act(async () => { expect(await view.result.current.selectLog('b')).toEqual({ logId: 'b' }); });
  expect(mockAssociateDraft).toHaveBeenCalledWith('b', expect.objectContaining({ workoutTitle: 'Latest live title', existingLogId: 'b', sourceKind: 'structured' }), expect.any(Function));

  mockAssociateDraft.mockClear();
  jest.mocked(readWorkoutDraft).mockResolvedValue({ ...retained, workoutTitle: 'Destination', existingLogId: 'a' });
  mockAssociateDraft.mockResolvedValueOnce(false);
  await act(async () => { expect(await view.result.current.selectLog('a')).toBeNull(); });
  expect(mockAssociateDraft).toHaveBeenCalled();
  expect(view.result.current.error).toMatch(/couldn.t associate/i);
});

it('stays on draft-only recovery when association loses its generation guard', async () => {
  records = [{ id: 'a', title: 'A', content: '[]' }, { id: 'b', title: 'B', content: '[]' }];
  local = { draft: { workoutTitle: 'Keep me', exercises: [], selectedPlanId: 'custom', existingLogId: null, savedAt: 4, sourceKind: 'structured' }, queued: null };
  jest.mocked(readWorkoutDraft).mockResolvedValue(null);
  mockAssociateDraft.mockImplementationOnce(async (_id, _draft, current) => { (current as () => boolean)(); return false; });
  const view = await renderHook(() => useWorkoutSession(scope));
  await act(async () => { expect(await view.result.current.selectLog('a')).toBeNull(); });
  expect(view.result.current.entry.kind).toBe('choose-log');
  expect(view.result.current.error).toMatch(/couldn.t associate/i);
});

it('lets durable association adjudicate an identical destination left by partial cleanup', async () => {
  const retained = { workoutTitle: 'Keep me', exercises: [], selectedPlanId: 'custom', existingLogId: null, savedAt: 4, sourceKind: 'text' as const, legacyText: 'Protected notes' };
  records = [{ id: 'a', title: 'A', content: '[]' }, { id: 'b', title: 'B', content: '[]' }];
  local = { draft: retained, queued: null };
  jest.mocked(readWorkoutDraft).mockResolvedValue({ ...retained, existingLogId: 'a', savedAt: 5 });
  mockAssociateDraft.mockResolvedValue(true);
  const view = await renderHook(() => useWorkoutSession(scope));

  await act(async () => { expect(await view.result.current.selectLog('a')).toEqual({ logId: 'a' }); });

  expect(mockAssociateDraft).toHaveBeenCalledWith('a', expect.objectContaining({ workoutTitle: 'Keep me', sourceKind: 'text', legacyText: 'Protected notes', existingLogId: 'a' }), expect.any(Function));
});
it('adopts a matching permanent background failure and ignores an older revision after a newer save', async () => {
  plan = assigned;
  let listener: Parameters<typeof subscribeWorkoutDelivery>[0] = () => {};
  jest.mocked(subscribeWorkoutDelivery).mockImplementation((callback) => { listener = callback; return () => {}; });
  let revision = 0;
  jest.mocked(saveWorkoutLog).mockImplementation(async (_input, onQueued) => {
    onQueued?.({ id: 'target', revision: ++revision, existingLogId: null });
    return { status: 'offline', logId: null };
  });
  const view = await renderHook(() => useWorkoutSession(scope));
  await act(() => view.result.current.save());
  await act(() => listener({ kind: 'state', userId: 'u', date: scope.date, receipt: { id: 'target', revision: 1, existingLogId: null }, status: 'blocked', failure: { kind: 'permission', retryable: false, code: 'http-403' } }));
  expect(view.result.current.deliveryState).toBe('blocked');
  await act(() => view.result.current.save());
  expect(view.result.current.deliveryState).toBe('queued');
  await act(() => listener({ kind: 'state', userId: 'u', date: scope.date, receipt: { id: 'target', revision: 1, existingLogId: null }, status: 'blocked' }));
  expect(view.result.current.deliveryState).toBe('queued');
});

it('blocks an unverifiable metadata-free explicit draft offline but still saves its local edits', async () => {
  records = undefined; recordsFailed = true;
  local = { draft: { workoutTitle: 'Old draft', exercises: [], selectedPlanId: 'custom', existingLogId: 'legacy', savedAt: 1 }, queued: null };
  const view = await renderHook(() => useWorkoutSession({ ...scope, logId: 'legacy' }));
  await act(() => view.result.current.edit({ type: 'SET_TITLE', payload: 'Local edits' }));
  await act(() => view.result.current.flushDraft());
  expect(mockSaveDraftNow).toHaveBeenLastCalledWith(expect.objectContaining({ sourceKind: 'unknown', workoutTitle: 'Local edits' }));
  await act(async () => { expect(await view.result.current.save()).toBe('invalid'); });
  expect(saveWorkoutLog).not.toHaveBeenCalled();
});
it('continues to save a valid empty structured log', async () => {
  records = [{ id: 'structured', title: 'Empty structured', content: '{"version":2,"exercises":[]}' }];
  jest.mocked(saveWorkoutLog).mockResolvedValue({ status: 'synced', logId: 'structured' });
  const view = await renderHook(() => useWorkoutSession({ ...scope, logId: 'structured' }));
  await act(async () => { expect(await view.result.current.save()).toBe('synced'); });
  expect(saveWorkoutLog).toHaveBeenCalledWith(expect.objectContaining({ existingLogId: 'structured' }), expect.any(Function));
});
it('keeps the recovery source when the selected row has another local draft', async () => {
  records = [{ id: 'a', title: 'A', content: '[]' }, { id: 'b', title: 'B', content: '[]' }];
  local = { draft: null, queued: { id: 'source', user_id: 'u', date: scope.date, title: 'Recovered', content: '[]', existingLogId: null, queuedAt: 1, revision: 4 } };
  jest.mocked(readWorkoutDraft).mockResolvedValue({ workoutTitle: 'Destination draft', exercises: [], selectedPlanId: 'custom', existingLogId: 'b', savedAt: 2 });
  const view = await renderHook(() => useWorkoutSession(scope, { outboxId: 'source' }));
  await act(async () => { expect(await view.result.current.selectLog('b')).toBeNull(); });
  expect(view.result.current.error).toContain('already has a local draft');
  expect(associateWorkoutOutbox).not.toHaveBeenCalled();
});

it('does not replace a durable blocked event with a delayed queued save receipt', async () => {
  plan = assigned;
  let listener: Parameters<typeof subscribeWorkoutDelivery>[0] = () => {};
  let complete!: (result: { status: 'offline'; logId: null }) => void;
  jest.mocked(subscribeWorkoutDelivery).mockImplementation((callback) => { listener = callback; return () => {}; });
  jest.mocked(saveWorkoutLog).mockImplementation(async (_input, onQueued) => {
    onQueued?.({ id: 'target', revision: 7, existingLogId: null });
    return new Promise((resolve) => { complete = resolve; });
  });
  const view = await renderHook(() => useWorkoutSession(scope));
  let saving!: Promise<unknown>;
  await act(() => { saving = view.result.current.save(); });
  await act(() => listener({ kind: 'state', userId: 'u', date: scope.date, receipt: { id: 'target', revision: 7, existingLogId: null }, status: 'blocked' }));
  await act(async () => { complete({ status: 'offline', logId: null }); await saving; });
  expect(view.result.current.deliveryState).toBe('blocked');
});

it('surfaces reconnect ambiguity without losing offline edits and saves them to the chosen target', async () => {
  const queued = { id: 'source', user_id: 'u', date: scope.date, title: 'Recovered', content: '{"version":2,"exercises":[{"name":"Bench","tracking":"weight-reps","sets":[{"setNumber":1,"weight":"40","reps":"8","rpe":"","completed":false}]}]}', existingLogId: null, queuedAt: 1, revision: 4 };
  records = undefined; recordsFailed = true; local = { draft: null, queued };
  jest.mocked(readWorkoutDraft).mockResolvedValue(null);
  const view = await renderHook(() => useWorkoutSession(scope, { outboxId: 'source' }));
  await act(() => {
    view.result.current.edit({ type: 'SET_TITLE', payload: 'Offline latest' });
    view.result.current.edit({ type: 'UPDATE_SET', payload: { exerciseIndex: 0, setIndex: 0, field: 'weight', value: '55' } });
  });
  recordsFailed = false; records = [{ id: 'a', title: 'A', content: '[]' }, { id: 'b', title: 'B', content: '[]' }];
  await view.rerender(undefined);
  expect(view.result.current.entry).toEqual({ kind: 'choose-log', ids: ['a', 'b'] });
  expect(view.result.current.state.title).toBe('Offline latest');
  await act(async () => { expect(await view.result.current.save()).toBe('invalid'); });
  expect(saveWorkoutLog).not.toHaveBeenCalled();
  let associated = { ...queued, id: 'canonical', existingLogId: 'b', revision: 5 };
  jest.mocked(associateWorkoutOutbox).mockImplementation(async (input) => {
    associated = { ...associated, title: input.title, content: input.content };
    return associated;
  });
  await act(async () => { expect(await view.result.current.selectLog('b')).toEqual({ logId: 'b', outboxId: 'canonical' }); });
  expect(associated.title).toBe('Offline latest');
  expect(JSON.parse(associated.content).exercises[0].sets[0].weight).toBe('55');
  await view.unmount();
  local = { draft: null, queued: associated };
  jest.mocked(saveWorkoutLog).mockResolvedValue({ status: 'synced', logId: 'b' });
  const reopened = await renderHook(() => useWorkoutSession({ ...scope, logId: 'b' }, { outboxId: 'canonical' }));
  await act(async () => { expect(await reopened.result.current.save()).toBe('synced'); });
  expect(saveWorkoutLog).toHaveBeenCalledWith(expect.objectContaining({ existingLogId: 'b', title: 'Offline latest' }), expect.any(Function));
  expect(JSON.parse(jest.mocked(saveWorkoutLog).mock.calls.at(-1)![0].content).exercises[0].sets[0].weight).toBe('55');
});
it('ignores a preceding revision failure while a new save waits to acquire its durable receipt', async () => {
  plan = assigned;
  let listener: Parameters<typeof subscribeWorkoutDelivery>[0] = () => {};
  let accept!: () => void; let complete!: (result: { status: 'synced'; logId: string }) => void;
  jest.mocked(subscribeWorkoutDelivery).mockImplementation((callback) => { listener = callback; return () => {}; });
  jest.mocked(saveWorkoutLog).mockImplementationOnce(async (_input, onQueued) => {
    onQueued?.({ id: 'target', revision: 1, existingLogId: null });
    return { status: 'offline', logId: null };
  }).mockImplementationOnce((_input, onQueued) => {
    accept = () => onQueued?.({ id: 'target', revision: 2, existingLogId: null });
    return new Promise((resolve) => { complete = resolve; });
  });
  const view = await renderHook(() => useWorkoutSession(scope));
  await act(() => view.result.current.save());
  let saving!: Promise<unknown>;
  await act(() => { saving = view.result.current.save(); });
  await act(() => listener({ kind: 'state', userId: 'u', date: scope.date, receipt: { id: 'target', revision: 1, existingLogId: null }, status: 'blocked' }));
  const whileWaiting = { status: view.result.current.deliveryState, error: view.result.current.error };
  await act(async () => { accept(); complete({ status: 'synced', logId: 'created' }); await saving; });
  expect(whileWaiting).toEqual({ status: 'sending', error: null });
  expect(view.result.current.deliveryState).toBe('synced');
  expect(view.result.current.error).toBeNull();
  expect(view.result.current.state.existingLogId).toBe('created');
});


const mixedVersions = () => [
  { id: 'source', user_id: 'u', date: scope.date, title: 'Earlier', content: '{"version":2,"exercises":[]}', existingLogId: null, queuedAt: 1, revision: 5, failure: { kind: 'permission' as const, retryable: false, code: 'http-403' } },
  { id: 'canonical', user_id: 'u', date: scope.date, title: 'Later', content: '{"version":2,"exercises":[]}', existingLogId: 'a', queuedAt: 2, revision: 8 },
];

it.each([0, 1])('offers exact recovery for an explicit-first retained group from either entry (%i)', async (entry) => {
  const versions = [
    { id: 'canonical', user_id: 'u', date: scope.date, title: 'Earlier A', content: '{"version":2,"exercises":[]}', existingLogId: 'a', queuedAt: 1, revision: 3, failure: { kind: 'permission' as const, retryable: false, code: 'http-403' } },
    { id: 'source', user_id: 'u', date: scope.date, title: 'Later unscoped', content: '{"version":2,"exercises":[]}', existingLogId: null, queuedAt: 2, revision: 6 },
  ];
  records = [{ id: 'a', title: 'A', content: '[]' }];
  local = { draft: null, queued: versions[entry], related: versions };
  jest.mocked(retryWorkoutRecovery).mockResolvedValue({ status: 'queued', logId: 'a', outboxId: 'source', receipt: { id: 'source', existingLogId: null, revision: 7 } });
  const selected = versions[entry];
  const view = await renderHook(() => useWorkoutSession({ ...scope, logId: selected.existingLogId }, { outboxId: selected.id }));
  expect(view.result.current.recovery?.targets.map((row) => row.id)).toEqual(['a']);

  await act(async () => { await view.result.current.recoverSavedVersions('a'); });
  expect(retryWorkoutRecovery).toHaveBeenCalledWith(expect.objectContaining({ predecessor: { id: 'canonical', revision: 3 }, viewed: { id: selected.id, revision: selected.revision }, targetLogId: 'a' }));
});

it('keeps a newer null draft away from a failed intervening log until its chosen target recovers', async () => {
  const explicitA = { id: 'explicit-a', user_id: 'u', date: scope.date, title: 'Explicit A', content: '[]', existingLogId: 'a', queuedAt: 1, revision: 3 };
  const explicitB = { id: 'explicit-b', user_id: 'u', date: scope.date, title: 'Explicit B', content: '[]', existingLogId: 'b', queuedAt: 2, revision: 4 };
  const selectedNull = { id: 'later-null', user_id: 'u', date: scope.date, title: 'Selected content', content: '[]', existingLogId: null, retryLogId: 'a', queuedAt: 3, revision: 7 };
  const newerDraft = { workoutTitle: 'Newer edits', exercises: [], selectedPlanId: 'custom', existingLogId: null, savedAt: 10, sourceKind: 'text' as const, legacyText: 'Keep these notes' };
  const existingB = { workoutTitle: 'B local draft', exercises: [], selectedPlanId: '2', existingLogId: 'b', savedAt: 8, sourceKind: 'structured' as const };
  const stored = new Map<string | null, typeof newerDraft | typeof existingB>([[null, newerDraft], ['b', existingB]]);
  records = [{ id: 'a', title: 'A', content: '[]' }, { id: 'b', title: 'B', content: '[]' }];
  local = { draft: newerDraft, queued: selectedNull, related: [explicitA, explicitB, selectedNull] };
  jest.mocked(readWorkoutDraft).mockImplementation(async (_userId, _date, logId) => stored.get(logId ?? null) ?? null);
  mockSaveDraftNow.mockImplementation(async (draft) => {
    const next = draft as typeof newerDraft;
    stored.set(next.existingLogId, next);
    if (next.existingLogId) stored.delete(null);
    return true;
  });
  jest.mocked(retryWorkoutRecovery)
    .mockImplementationOnce(async () => {
      const failedB = { ...explicitB, revision: 8, failure: { kind: 'network' as const, retryable: true, code: 'network' } };
      local = { draft: newerDraft, queued: failedB, related: [failedB, selectedNull] };
      return { status: 'queued', logId: null, outboxId: failedB.id, receipt: { id: failedB.id, revision: 8, existingLogId: 'b' } };
    })
    .mockResolvedValueOnce({ status: 'synced', logId: 'a', outboxId: null, receipt: { id: selectedNull.id, revision: 9, existingLogId: null } });
  const view = await renderHook(() => useWorkoutSession(scope, { outboxId: selectedNull.id }));

  await act(async () => { expect(await view.result.current.recoverSavedVersions('a')).toBeNull(); });
  expect(stored.get('b')).toEqual(existingB);
  expect(stored.get(null)).toMatchObject({ workoutTitle: 'Newer edits', existingLogId: null, legacyText: 'Keep these notes' });
  expect(view.result.current.state.existingLogId).toBeNull();

  await view.rerender(undefined);
  await act(async () => { expect(await view.result.current.recoverSavedVersions('a')).toBeNull(); });
  expect(stored.get('b')).toEqual(existingB);
  expect(stored.has(null)).toBe(false);
  expect(stored.get('a')).toMatchObject({ workoutTitle: 'Newer edits', existingLogId: 'a', legacyText: 'Keep these notes' });
  expect(jest.mocked(retryWorkoutRecovery).mock.calls.map(([input]) => input.targetLogId)).toEqual(['a', 'a']);
});

it('refreshes same-route local recovery after the predecessor leaves a blocked canonical survivor', async () => {
  const versions = mixedVersions();
  records = [{ id: 'a', title: 'A', content: '[]' }];
  local = { draft: null, queued: versions[1], related: versions };
  const survivor = { ...versions[1], failure: { kind: 'permission' as const, retryable: false, code: 'http-403' } };
  mockLocalRefetch.mockImplementationOnce(async () => { local = { draft: null, queued: survivor, related: [survivor] }; return { data: local }; });
  jest.mocked(retryWorkoutRecovery).mockResolvedValue({ status: 'blocked', logId: 'a', outboxId: 'canonical', receipt: { id: 'canonical', existingLogId: 'a', revision: 8 } });
  const view = await renderHook(() => useWorkoutSession({ ...scope, logId: 'a' }, { outboxId: 'canonical' }));

  await act(async () => { expect(await view.result.current.recoverSavedVersions('a')).toEqual({ logId: 'a', outboxId: 'canonical' }); });
  await view.rerender(undefined);
  expect(mockLocalRefetch).toHaveBeenCalled();
  expect(view.result.current.recovery).toBeNull();
  expect(view.result.current.deliveryState).toBe('blocked');
});

it('refreshes the same route after canonical cleanup fails but leaves the survivor durable', async () => {
  const versions = mixedVersions();
  records = [{ id: 'a', title: 'A', content: '[]' }];
  local = { draft: null, queued: versions[1], related: versions };
  const survivor = { ...versions[1], revision: 10 };
  jest.mocked(retryWorkoutRecovery).mockRejectedValueOnce(new Error('cleanup failed'));
  jest.mocked(readOutbox).mockResolvedValueOnce([survivor]);
  mockLocalRefetch.mockImplementationOnce(async () => { local = { draft: null, queued: survivor, related: [survivor] }; return { data: local }; });
  const view = await renderHook(() => useWorkoutSession({ ...scope, logId: 'a' }, { outboxId: 'canonical' }));

  await act(async () => { expect(await view.result.current.recoverSavedVersions('a')).toEqual({ logId: 'a', outboxId: 'canonical' }); });
  await view.rerender(undefined);
  expect(mockLocalRefetch).toHaveBeenCalled();
  expect(view.result.current.recovery).toBeNull();
});
it.each([0, 1])('offers deliberate recovery for either Logs entry (%i) with sole owned row A', async (entry) => {
  const versions = mixedVersions(); const selected = versions[entry];
  records = [{ id: 'a', title: 'Workout A', content: '[]' }];
  local = { draft: null, queued: selected, related: versions };
  jest.mocked(retryWorkoutRecovery).mockResolvedValue({ status: 'synced', logId: 'a', outboxId: null, receipt: { id: 'canonical', existingLogId: 'a', revision: 10 } });
  const view = await renderHook(() => useWorkoutSession({ ...scope, logId: selected.existingLogId }, { outboxId: selected.id }));
  expect(view.result.current.recovery?.versions.map((item) => item.title)).toEqual(['Earlier', 'Later']);
  let target: unknown;
  await act(async () => { target = await view.result.current.recoverSavedVersions('a'); });
  expect(target).toEqual({ logId: 'a', outboxId: undefined });
  expect(retryWorkoutRecovery).toHaveBeenCalledWith(expect.objectContaining({ predecessor: { id: 'source', revision: 5 }, viewed: { id: selected.id, revision: selected.revision }, targetLogId: 'a' }));
  expect(associateWorkoutOutbox).not.toHaveBeenCalled();
});
it('keeps new live edits through recovery and an older receipt, then saves them to A', async () => {
  const versions = mixedVersions();
  records = [{ id: 'a', title: 'Workout A', content: '[]' }];
  local = { draft: null, queued: versions[1] };
  let listener: Parameters<typeof subscribeWorkoutDelivery>[0] = () => {};
  jest.mocked(subscribeWorkoutDelivery).mockImplementation((callback) => { listener = callback; return () => {}; });
  const view = await renderHook(() => useWorkoutSession({ ...scope, logId: 'a' }, { outboxId: 'canonical' }));
  await act(() => view.result.current.edit({ type: 'SET_TITLE', payload: 'Live edited version' }));
  local = { draft: null, queued: versions[1], related: versions }; await view.rerender(undefined);
  let finish!: (result: any) => void;
  jest.mocked(retryWorkoutRecovery).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  let recovery!: Promise<unknown>;
  await act(() => { recovery = view.result.current.recoverSavedVersions('a'); });
  expect(mockSaveDraftNow).toHaveBeenCalledWith(expect.objectContaining({ workoutTitle: 'Live edited version' }));
  await act(() => {
    listener({ kind: 'state', userId: 'u', date: scope.date, receipt: { id: 'canonical', revision: 8, existingLogId: 'a' }, status: 'blocked' });
    view.result.current.edit({ type: 'SET_TITLE', payload: 'Even newer live edit' });
  });
  await act(async () => { finish({ status: 'synced', logId: 'a', outboxId: null, receipt: { id: 'canonical', existingLogId: 'a', revision: 10 } }); expect(await recovery).toBeNull(); });
  expect(view.result.current.recovery).toBeNull();
  expect(view.result.current.state.title).toBe('Even newer live edit');
  expect(view.result.current.state.isDirty).toBe(true);
  jest.mocked(saveWorkoutLog).mockResolvedValue({ status: 'synced', logId: 'a' });
  await act(() => view.result.current.save());
  expect(saveWorkoutLog).toHaveBeenCalledWith(expect.objectContaining({ existingLogId: 'a', title: 'Even newer live edit' }), expect.any(Function));
});
it('stops retained recovery when the live draft cannot be saved locally', async () => {
  const versions = mixedVersions(); records = [{ id: 'a', title: 'A', content: '[]' }];
  local = { draft: null, queued: versions[1] };
  const view = await renderHook(() => useWorkoutSession({ ...scope, logId: 'a' }, { outboxId: 'canonical' }));
  await act(() => view.result.current.edit({ type: 'SET_TITLE', payload: 'Keep this edit' }));
  local = { draft: null, queued: versions[1], related: versions }; await view.rerender(undefined);
  mockSaveDraftNow.mockResolvedValueOnce(false);
  await act(async () => { expect(await view.result.current.recoverSavedVersions('a')).toBeNull(); });
  expect(retryWorkoutRecovery).not.toHaveBeenCalled();
  expect(view.result.current.state.title).toBe('Keep this edit');
  expect(view.result.current.state.isDirty).toBe(true);
  expect(view.result.current.error).toMatch(/Keep this screen open/);
  expect(view.result.current.deliveryState).toBe('idle');
});
it('keeps both local drafts when null-source recovery would collide with A draft', async () => {
  const versions = mixedVersions(); records = [{ id: 'a', title: 'A', content: '[]' }];
  const retained = { workoutTitle: 'Source draft', exercises: [], existingLogId: null, selectedPlanId: 'custom', savedAt: 3 };
  local = { draft: retained, queued: versions[0], related: versions };
  jest.mocked(readWorkoutDraft).mockResolvedValueOnce({ ...retained, workoutTitle: 'A draft', existingLogId: 'a' });
  const view = await renderHook(() => useWorkoutSession(scope, { outboxId: 'source' }));
  await act(async () => { expect(await view.result.current.recoverSavedVersions('a')).toBeNull(); });
  expect(retryWorkoutRecovery).not.toHaveBeenCalled(); expect(mockSaveDraftNow).not.toHaveBeenCalled();
  expect(view.result.current.error).toMatch(/also has a local draft/);
});
it('preserves a null-source draft and its protection after retained versions resolve to A', async () => {
  const versions = mixedVersions(); records = [{ id: 'a', title: 'A', content: '[]' }];
  local = { draft: { workoutTitle: 'New source draft', exercises: [], existingLogId: null, selectedPlanId: 'custom', savedAt: 3, sourceKind: 'structured' }, queued: versions[0], related: versions };
  jest.mocked(readWorkoutDraft).mockResolvedValue(null);
  jest.mocked(retryWorkoutRecovery).mockResolvedValue({ status: 'synced', logId: 'a', outboxId: null, receipt: { id: 'canonical', existingLogId: 'a', revision: 10 } });
  const view = await renderHook(() => useWorkoutSession(scope, { outboxId: 'source' }));
  await act(async () => { expect(await view.result.current.recoverSavedVersions('a')).toBeNull(); });
  expect(view.result.current.recovery).toBeNull(); expect(view.result.current.entry.kind).toBe('ready');
  expect(view.result.current.state.title).toBe('New source draft'); expect(view.result.current.state.isDirty).toBe(true);
  expect(view.result.current.deliveryState).toBe('idle');
  expect(mockSaveDraftNow).toHaveBeenLastCalledWith(expect.objectContaining({ workoutTitle: 'New source draft', existingLogId: 'a', sourceKind: 'structured' }));
});
it('ignores a retained recovery completion after an account switch', async () => {
  const versions = mixedVersions(); records = [{ id: 'a', title: 'A', content: '[]' }];
  local = { draft: null, queued: versions[1], related: versions };
  let finish!: (result: any) => void;
  jest.mocked(retryWorkoutRecovery).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  const view = await renderHook<ReturnType<typeof useWorkoutSession>, { userId: string }>(({ userId }) => useWorkoutSession({ ...scope, userId, logId: 'a' }, { outboxId: 'canonical' }), { initialProps: { userId: 'u' } });
  let pending!: Promise<unknown>; await act(() => { pending = view.result.current.recoverSavedVersions('a'); });
  local = undefined; records = undefined; await view.rerender({ userId: 'other' });
  await act(async () => { finish({ status: 'synced', logId: 'a', outboxId: null, receipt: { id: 'canonical', existingLogId: 'a', revision: 10 } }); expect(await pending).toBeNull(); });
  expect(view.result.current.state.title).toBe(''); expect(mockSaveDraftNow).not.toHaveBeenCalled();
});
it('reopens the exact later retained record after canonical delivery cleanup fails', async () => {
  const versions = mixedVersions(); records = [{ id: 'a', title: 'A', content: '[]' }];
  local = { draft: null, queued: versions[0], related: versions };
  jest.mocked(retryWorkoutRecovery).mockRejectedValueOnce(new Error('cleanup failed'));
  jest.mocked(readOutbox).mockResolvedValueOnce([{ ...versions[1], revision: 10 }]);
  const view = await renderHook(() => useWorkoutSession(scope, { outboxId: 'source' }));
  await act(async () => { expect(await view.result.current.recoverSavedVersions('a')).toEqual({ logId: 'a', outboxId: 'canonical' }); });
  expect(view.result.current.deliveryState).toBe('queued');
});
it('can deliberately retry the refreshed blocked predecessor revision again', async () => {
  const versions = mixedVersions(); records = [{ id: 'a', title: 'A', content: '[]' }];
  local = { draft: null, queued: versions[0], related: versions };
  jest.mocked(retryWorkoutRecovery).mockResolvedValueOnce({ status: 'blocked', logId: null, outboxId: 'source', receipt: { id: 'source', existingLogId: null, revision: 6 } }).mockResolvedValueOnce({ status: 'synced', logId: 'a', outboxId: null, receipt: { id: 'canonical', existingLogId: 'a', revision: 10 } });
  const view = await renderHook(() => useWorkoutSession(scope, { outboxId: 'source' }));
  await act(async () => { expect(await view.result.current.recoverSavedVersions('a')).toBeNull(); });
  expect(view.result.current.deliveryState).toBe('blocked');
  const refreshed = [{ ...versions[0], revision: 6 }, versions[1]];
  local = { draft: null, queued: refreshed[0], related: refreshed }; await view.rerender(undefined);
  await act(async () => { expect(await view.result.current.recoverSavedVersions('a')).toEqual({ logId: 'a', outboxId: undefined }); });
  expect(retryWorkoutRecovery).toHaveBeenLastCalledWith(expect.objectContaining({ predecessor: { id: 'source', revision: 6 }, viewed: { id: 'source', revision: 6 } }));
});
