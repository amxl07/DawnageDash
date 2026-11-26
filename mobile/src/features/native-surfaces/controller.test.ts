import { NativeSurfaceController } from './controller';
import type { NativeActivity, NativeSurfaceAdapter, WorkoutProgress } from './model';

const links = { checkIn: 'dawnage-dev:///daily-check-in', training: 'dawnage-dev:///plans', workout: 'dawnage-dev:///logger' };
const progress: WorkoutProgress = { exerciseIndex: 0, exerciseCount: 2, completedSets: 1, totalSets: 6 };
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (error: Error) => void; const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; }); return { promise, resolve, reject }; }
function fixture() {
  const events: string[] = [];
  const live = new Map<string, NativeActivity>();
  const payloads: unknown[] = [];
  let sequence = 0;
  const activity = (id: string): NativeActivity => ({ getId: () => id, update: async (payload) => { events.push(`update:${id}`); payloads.push(payload); }, end: async () => { events.push(`end:${id}`); live.delete(id); } });
  const adapter: NativeSurfaceAdapter = {
    initialize: () => { events.push('widgets'); },
    getInstances: () => [...live.values()],
    start: async (payload, url) => { const id = String(++sequence); events.push(`start:${id}:${url}`); payloads.push(payload); const value = activity(id); live.set(id, value); return value; },
  };
  const controller = new NativeSurfaceController(async () => adapter, () => links, () => 1_000);
  return { controller, adapter, live, events, payloads, activity };
}
it('initializes static shortcuts while signed out and ends orphan activities before starting', async () => {
  const f = fixture(); f.live.set('orphan', f.activity('orphan'));
  await f.controller.setAccount(null);
  expect(f.events).toEqual(['widgets', 'end:orphan']);
  await f.controller.setAccount('account-a');
  const lease = f.controller.claimWorkout('account-a', '2026-09-25')!;
  await f.controller.updateWorkout(lease, progress);
  expect(f.events.at(-1)).toBe('start:1:dawnage-dev:///logger');
});
it('coalesces rapid edits and ignores callbacks from replaced sessions', async () => {
  const f = fixture(); await f.controller.setAccount('account-a');
  const lease = f.controller.claimWorkout('account-a', '2026-09-25')!;
  const first = f.controller.updateWorkout(lease, progress);
  const latest = f.controller.updateWorkout(lease, { ...progress, completedSets: 3 });
  await Promise.all([first, latest]);
  expect(f.payloads).toHaveLength(1);
  expect(f.payloads[0]).toMatchObject({ completedSets: 3 });
  await f.controller.endWorkout(lease);
  const next = f.controller.claimWorkout('account-a', '2026-09-25')!;
  await f.controller.updateWorkout(next, progress);
  await f.controller.updateWorkout(lease, { ...progress, completedSets: 99 });
  await f.controller.endWorkout(lease);
  expect(f.live.size).toBe(1);
  expect(f.payloads.at(-1)).toMatchObject({ completedSets: 1 });
});
it('rest updates follow absolute timestamps and do not need the logger mounted', async () => {
  const f = fixture(); await f.controller.setAccount('account-a');
  const lease = f.controller.claimWorkout('account-a', '2026-09-25')!;
  await f.controller.updateWorkout(lease, progress);
  await f.controller.updateRest('account-a', { endsAt: 91_000, pausedRemainingMs: null });
  await f.controller.updateRest('account-a', { endsAt: null, pausedRemainingMs: 600 });
  await f.controller.updateRest('account-a', { endsAt: 11_600, pausedRemainingMs: null });
  expect(f.payloads.slice(-3)).toEqual([
    expect.objectContaining({ restEndsAt: 91_000, pausedRemainingMs: null }),
    expect.objectContaining({ restEndsAt: null, pausedRemainingMs: 600 }),
    expect.objectContaining({ restEndsAt: 11_600, pausedRemainingMs: null }),
  ]);
});
it('serializes a delayed update before ending on sign-out and rejects late account events', async () => {
  const f = fixture(); await f.controller.setAccount('account-a');
  const lease = f.controller.claimWorkout('account-a', '2026-09-25')!;
  await f.controller.updateWorkout(lease, progress);
  const pending = deferred<void>(); f.live.get('1')!.update = () => pending.promise;
  const update = f.controller.updateWorkout(lease, { ...progress, completedSets: 2 });
  await Promise.resolve(); await Promise.resolve();
  const clear = f.controller.setAccount(null);
  pending.resolve(); await Promise.all([update, clear]);
  await f.controller.updateWorkout(lease, progress);
  await f.controller.updateRest('account-a', { endsAt: 100_000, pausedRemainingMs: null });
  expect(f.live.size).toBe(0);
  expect(f.controller.claimWorkout('account-a', '2026-09-25')).toBeNull();
});
it('ends a late native start after sign-out instead of retaining a ghost activity', async () => {
  const f = fixture(); await f.controller.setAccount('account-a');
  const pending = deferred<NativeActivity>(); const started = deferred<void>();
  f.adapter.start = () => { started.resolve(); return pending.promise; };
  const lease = f.controller.claimWorkout('account-a', '2026-09-25')!;
  const start = f.controller.updateWorkout(lease, progress); await started.promise;
  const clear = f.controller.setAccount(null);
  const ghost = f.activity('late'); f.live.set('late', ghost); pending.resolve(ghost);
  await Promise.all([start, clear]); expect(f.live.size).toBe(0);
});
it('contains disabled/unavailable native errors and avoids retry storms', async () => {
  const f = fixture(); let calls = 0;
  f.adapter.start = () => { calls += 1; throw new Error('Activities disabled'); };
  await f.controller.setAccount('account-a');
  const lease = f.controller.claimWorkout('account-a', '2026-09-25')!;
  await f.controller.updateWorkout(lease, progress);
  await f.controller.updateWorkout(lease, { ...progress, completedSets: 2 });
  expect(calls).toBe(1);
  await f.controller.endWorkout(lease);
  const unavailable = new NativeSurfaceController(async () => null, () => links);
  await expect(unavailable.setAccount(null)).resolves.toBeUndefined();
});
it('reconciles foreground orphans while keeping the currently owned activity', async () => {
  const f = fixture(); await f.controller.setAccount('account-a');
  const lease = f.controller.claimWorkout('account-a', '2026-09-25')!;
  await f.controller.updateWorkout(lease, progress);
  f.live.set('orphan', f.activity('orphan'));
  await f.controller.reconcile();
  expect([...f.live.keys()]).toEqual(['1']);
});
it('adopts an existing current workout on return and prevents old screen callbacks from ending it', async () => {
  const f = fixture(); await f.controller.setAccount('account-a');
  const first = f.controller.claimWorkout('account-a', '2026-09-25')!;
  await f.controller.updateWorkout(first, progress);
  const returned = f.controller.claimWorkout('account-a', '2026-09-25')!;
  await f.controller.updateWorkout(returned, progress);
  await f.controller.endWorkout(first);
  expect(f.events.filter((event) => event.startsWith('start:'))).toHaveLength(1);
  expect(f.live.size).toBe(1);
  await f.controller.endWorkout(returned);
  expect(f.live.size).toBe(0);
});

it('confirms an already missing instance after end rejects and permits a fresh run', async () => {
  const f = fixture(); await f.controller.setAccount('account-a');
  const first = f.controller.claimWorkout('account-a', '2026-09-25')!;
  await f.controller.updateWorkout(first, progress);
  const removed = f.live.get('1')!;
  let attempts = 0;
  removed.end = async () => { attempts++; throw new Error('LiveActivityNotFound'); };
  f.live.delete('1');
  await f.controller.endWorkout(first);
  const next = f.controller.claimWorkout('account-a', '2026-09-25')!;
  await f.controller.updateWorkout(next, progress);
  expect([...f.live.keys()]).toEqual(['2']);
  expect(attempts).toBe(1);
});

it('recovers when deferred cleanup rejects after the system removes an activity', async () => {
  const f = fixture(); await f.controller.setAccount('account-a');
  const first = f.controller.claimWorkout('account-a', '2026-09-25')!;
  await f.controller.updateWorkout(first, progress);
  const end = deferred<void>(); const started = deferred<void>();
  f.live.get('1')!.end = () => { started.resolve(); return end.promise; };
  const finish = f.controller.endWorkout(first); await started.promise;
  const next = f.controller.claimWorkout('account-a', '2026-09-25')!;
  const publish = f.controller.updateWorkout(next, progress);
  expect([...f.live.keys()]).toEqual(['1']);
  f.live.delete('1'); end.reject(new Error('LiveActivityNotFound'));
  await Promise.all([finish, publish]);
  expect([...f.live.keys()]).toEqual(['2']);
});

it('retains unresolved ownership without retry loops or duplicate starts, then recovers after absence is verified', async () => {
  const f = fixture(); await f.controller.setAccount('account-a');
  const first = f.controller.claimWorkout('account-a', '2026-09-25')!;
  await f.controller.updateWorkout(first, progress);
  let attempts = 0;
  f.live.get('1')!.end = async () => { attempts++; throw new Error('temporary end failure'); };
  await f.controller.endWorkout(first);
  const next = f.controller.claimWorkout('account-a', '2026-09-25')!;
  await f.controller.updateWorkout(next, progress);
  expect([...f.live.keys()]).toEqual(['1']);
  expect(attempts).toBe(2);
  f.live.delete('1');
  await f.controller.updateWorkout(next, { ...progress, completedSets: 2 });
  expect([...f.live.keys()]).toEqual(['2']);
  expect(attempts).toBe(2);
});

it('does not assume absence when verification itself fails', async () => {
  const f = fixture(); await f.controller.setAccount('account-a');
  const first = f.controller.claimWorkout('account-a', '2026-09-25')!;
  await f.controller.updateWorkout(first, progress);
  f.live.get('1')!.end = async () => { throw new Error('unknown end outcome'); };
  f.live.delete('1');
  f.adapter.getInstances = () => { throw new Error('native lookup unavailable'); };
  await f.controller.endWorkout(first);
  const next = f.controller.claimWorkout('account-a', '2026-09-25')!;
  await f.controller.updateWorkout(next, progress);
  expect(f.events.filter((event) => event.startsWith('start:'))).toHaveLength(1);
  f.adapter.getInstances = () => [...f.live.values()];
  await f.controller.updateWorkout(next, progress);
  expect([...f.live.keys()]).toEqual(['2']);
});

it('retains a late invalidated start until failed cleanup is confirmed absent', async () => {
  const f = fixture(); await f.controller.setAccount('account-a');
  const pending = deferred<NativeActivity>(); const started = deferred<void>();
  const normalStart = f.adapter.start;
  f.adapter.start = () => { started.resolve(); return pending.promise; };
  const first = f.controller.claimWorkout('account-a', '2026-09-25')!;
  const start = f.controller.updateWorkout(first, progress); await started.promise;
  const finish = f.controller.endWorkout(first);
  const ghost = f.activity('late'); let attempts = 0;
  ghost.end = async () => { attempts++; throw new Error('temporary end failure'); };
  f.live.set('late', ghost); pending.resolve(ghost);
  await Promise.all([start, finish]);
  f.adapter.start = normalStart;
  const next = f.controller.claimWorkout('account-a', '2026-09-25')!;
  await f.controller.updateWorkout(next, progress);
  expect([...f.live.keys()]).toEqual(['late']);
  expect(attempts).toBe(3);
  f.live.delete('late');
  await f.controller.updateWorkout(next, progress);
  expect([...f.live.keys()]).toEqual(['1']);
});

it('keeps a user-dismissed activity dismissed through repeated foreground events and progress edits', async () => {
  const f = fixture(); await f.controller.setAccount('account-a');
  const first = f.controller.claimWorkout('account-a', '2026-09-25')!;
  await f.controller.updateWorkout(first, progress); f.live.delete('1');
  await f.controller.reconcile(); await f.controller.reconcile();
  await f.controller.updateWorkout(first, { ...progress, completedSets: 2 });
  expect(f.live.size).toBe(0);
  expect(f.events.filter((event) => event.startsWith('start:'))).toHaveLength(1);
  await f.controller.endWorkout(first);
  const next = f.controller.claimWorkout('account-a', '2026-09-25')!;
  await f.controller.updateWorkout(next, progress);
  expect([...f.live.keys()]).toEqual(['2']);
});
