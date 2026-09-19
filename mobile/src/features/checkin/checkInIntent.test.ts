import { createCheckInIntentQueue } from './checkInIntent';
function deferred() { let resolve!: (value: boolean) => void; const promise = new Promise<boolean>((done) => { resolve = done; }); return { promise, resolve }; }
it('retains a failed target and clears it after exactly one successful replay', async () => {
  const queue = createCheckInIntentQueue(() => true);
  const action = jest.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
  const intent = queue.replace('date', '2026-09-14', action);
  expect(await intent.run()).toBe(false); expect(queue.current).toBe(intent);
  const first = intent.run(); expect(intent.run()).toBe(first);
  expect(await first).toBe(true); expect(queue.current).toBeNull();
  expect(await intent.run()).toBe(false); expect(action).toHaveBeenCalledTimes(2);
});
it('invalidates an in-flight target when a newer date replaces it', async () => {
  const queue = createCheckInIntentQueue(() => true); const disk = deferred(); const applied = jest.fn();
  const old = queue.replace('date', '2026-09-14', async (isCurrent) => { await disk.promise; if (!isCurrent()) return false; applied('old'); return true; });
  const pending = old.run(); await Promise.resolve();
  const current = queue.replace('date', '2026-09-14', async () => { applied('current'); return true; });
  expect(await current.run()).toBe(true); disk.resolve(true); expect(await pending).toBe(false);
  expect(applied.mock.calls).toEqual([['current']]); expect(queue.current).toBeNull();
});
it('cancels a failed target and rejects work from an inactive reporting identity', async () => {
  let active = true; const queue = createCheckInIntentQueue(() => active); const work = jest.fn(async () => true);
  const cancelled = queue.replace('date', '2026-09-14', work); queue.clear(); expect(await cancelled.run()).toBe(false);
  const old = queue.replace('exit', '2026-09-14', work); active = false; expect(await old.run()).toBe(false); expect(work).not.toHaveBeenCalled();
});
