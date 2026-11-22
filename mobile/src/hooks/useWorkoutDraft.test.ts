import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';

import { act, create } from 'react-test-renderer';

import { readWorkoutDraft, useWorkoutDraft, type DraftData } from './useWorkoutDraft';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockStorage = jest.mocked(AsyncStorage);

function renderHook() {
  let current: ReturnType<typeof useWorkoutDraft> | undefined;
  let renderer!: ReturnType<typeof create>;

  function HookProbe() {
    current = useWorkoutDraft('user-1', '2026-08-30');
    return null;
  }

  act(() => {
    renderer = create(React.createElement(HookProbe));
  });

  return {
    result: {
      get current() {
        return current as ReturnType<typeof useWorkoutDraft>;
      },
    },
    unmount: () => act(() => renderer.unmount()),
  };
}

function draft(title: string): Omit<DraftData, 'savedAt'> {
  return {
    workoutTitle: title,
    exercises: [],
    selectedPlanId: '1',
    existingLogId: null,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

describe('useWorkoutDraft durability', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    mockStorage.getItem.mockResolvedValue(null);
    mockStorage.setItem.mockResolvedValue(undefined);
    mockStorage.removeItem.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('round trips source protection and still accepts metadata-free older drafts', async () => {
    const memory = new Map<string, string>();
    mockStorage.getItem.mockImplementation(async (key) => memory.get(key) ?? null);
    mockStorage.setItem.mockImplementation(async (key, value) => { memory.set(key, value); });
    const { result, unmount } = renderHook();
    await act(async () => { await result.current.saveDraftNow({ ...draft('Historical note'), sourceKind: 'text', legacyText: 'Walked for recovery' }); });
    expect(await readWorkoutDraft('user-1', '2026-08-30', null)).toMatchObject({ sourceKind: 'text', legacyText: 'Walked for recovery' });
    memory.set('workout-draft:user-1:2026-08-30', JSON.stringify({ ...draft('Older draft'), savedAt: Date.now() }));
    expect(await readWorkoutDraft('user-1', '2026-08-30', null)).toMatchObject({ workoutTitle: 'Older draft' });
    unmount();
  });

  it('reports an immediate write failure to the caller and status UI', async () => {
    mockStorage.setItem.mockRejectedValueOnce(new Error('disk unavailable'));
    const { result, unmount } = renderHook();

    let saving!: Promise<boolean>;
    await act(async () => {
      saving = result.current.saveDraftNow(draft('Keep this workout'));
      await saving;
    });

    await expect(saving).resolves.toBe(false);
    expect(result.current.draftStatus).toBe('error');
    expect(mockStorage.removeItem).not.toHaveBeenCalled();
    unmount();
  });

  it('reports a failed removal instead of presenting the draft as cleared', async () => {
    mockStorage.removeItem.mockRejectedValueOnce(new Error('disk unavailable'));
    const { result, unmount } = renderHook();

    let clearing!: Promise<boolean>;
    await act(async () => {
      clearing = result.current.clearDraft();
      await clearing;
    });

    await expect(clearing).resolves.toBe(false);
    expect(result.current.draftStatus).toBe('error');
    unmount();
  });

  it('runs clear after an in-flight write so the older write cannot restore the draft', async () => {
    const write = deferred<void>();
    mockStorage.setItem.mockReturnValueOnce(write.promise);
    const { result, unmount } = renderHook();

    let saving!: Promise<boolean>;
    act(() => {
      saving = result.current.saveDraftNow(draft('Older write'));
    });
    await act(async () => Promise.resolve());
    expect(mockStorage.setItem).toHaveBeenCalledTimes(1);

    let clearing!: Promise<boolean>;
    act(() => {
      clearing = result.current.clearDraft();
    });
    expect(mockStorage.removeItem).not.toHaveBeenCalled();

    await act(async () => write.resolve());
    await expect(saving).resolves.toBe(false);
    await expect(clearing).resolves.toBe(true);
    expect(mockStorage.removeItem).toHaveBeenCalledWith(
      'workout-draft:user-1:2026-08-30',
    );
    expect(mockStorage.setItem.mock.invocationCallOrder[0]).toBeLessThan(
      mockStorage.removeItem.mock.invocationCallOrder[0]!,
    );
    unmount();
  });

  it('keeps a newer debounced edit current while an older write finishes, then saves the edit', async () => {
    const olderWrite = deferred<void>();
    mockStorage.setItem.mockReturnValueOnce(olderWrite.promise).mockResolvedValueOnce(undefined);
    const { result, unmount } = renderHook();

    let olderSave!: Promise<boolean>;
    act(() => {
      olderSave = result.current.saveDraftNow(draft('Older write'));
    });
    await act(async () => Promise.resolve());

    let latestSave!: Promise<boolean>;
    act(() => {
      latestSave = result.current.saveDraft(draft('Latest edit'));
    });
    expect(result.current.draftStatus).toBe('saving');

    await act(async () => olderWrite.resolve());
    await expect(olderSave).resolves.toBe(false);
    expect(result.current.draftStatus).toBe('saving');
    expect(mockStorage.setItem).toHaveBeenCalledTimes(1);

    await act(async () => jest.advanceTimersByTimeAsync(500));
    await expect(latestSave).resolves.toBe(true);
    expect(result.current.draftStatus).toBe('saved');
    expect(mockStorage.setItem.mock.calls[1]).toEqual([
      'workout-draft:user-1:2026-08-30',
      expect.stringContaining('"workoutTitle":"Latest edit"'),
    ]);
    unmount();
  });

  it('does not present an older completed write as current when the latest debounce is cancelled on unmount', async () => {
    const olderWrite = deferred<void>();
    mockStorage.setItem.mockReturnValueOnce(olderWrite.promise);
    const { result, unmount } = renderHook();

    let olderSave!: Promise<boolean>;
    act(() => {
      olderSave = result.current.saveDraftNow(draft('Older write'));
    });
    await act(async () => Promise.resolve());

    let latestSave!: Promise<boolean>;
    act(() => {
      latestSave = result.current.saveDraft(draft('Latest edit'));
    });
    unmount();
    await act(async () => olderWrite.resolve());

    await expect(olderSave).resolves.toBe(false);
    await expect(latestSave).resolves.toBe(false);
    await act(async () => jest.advanceTimersByTimeAsync(500));
    expect(mockStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it('cancels a queued debounce before clearing', async () => {
    const { result, unmount } = renderHook();

    let saving!: Promise<boolean>;
    act(() => {
      saving = result.current.saveDraft(draft('Never write this'));
    });
    await act(async () => {
      await result.current.clearDraft();
    });
    await expect(saving).resolves.toBe(false);
    await act(async () => jest.advanceTimersByTimeAsync(500));

    expect(mockStorage.setItem).not.toHaveBeenCalled();
    expect(mockStorage.removeItem).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('associates a source draft only after durable destination write and rejects a destination collision', async () => {
    const memory = new Map<string, string>();
    mockStorage.getItem.mockImplementation(async (key) => memory.get(key) ?? null);
    mockStorage.setItem.mockImplementation(async (key, value) => { memory.set(key, value); });
    mockStorage.removeItem.mockImplementation(async (key) => { memory.delete(key); });
    const { result, unmount } = renderHook();
    await act(async () => { await result.current.saveDraftNow(draft('Source')); });

    await act(async () => { expect(await result.current.associateDraft('a', { ...draft('Source'), existingLogId: 'a' }, () => true)).toBe(true); });
    expect(await readWorkoutDraft('user-1', '2026-08-30', null)).toBeNull();
    expect(await readWorkoutDraft('user-1', '2026-08-30', 'a')).toMatchObject({ workoutTitle: 'Source', existingLogId: 'a' });

    memory.set('workout-draft:user-1:2026-08-30', JSON.stringify({ ...draft('Another source'), savedAt: Date.now() }));
    memory.set('workout-draft:user-1:2026-08-30:log:b', JSON.stringify({ ...draft('Destination'), existingLogId: 'b', savedAt: Date.now() }));
    await act(async () => { expect(await result.current.associateDraft('b', { ...draft('Another source'), existingLogId: 'b' }, () => true)).toBe(false); });
    expect(await readWorkoutDraft('user-1', '2026-08-30', null)).toMatchObject({ workoutTitle: 'Another source' });
    expect(await readWorkoutDraft('user-1', '2026-08-30', 'b')).toMatchObject({ workoutTitle: 'Destination' });
    unmount();
  });

  it('preserves the source when draft association is invalidated after its destination write', async () => {
    const memory = new Map<string, string>();
    mockStorage.getItem.mockImplementation(async (key) => memory.get(key) ?? null);
    mockStorage.setItem.mockImplementation(async (key, value) => { memory.set(key, value); });
    mockStorage.removeItem.mockImplementation(async (key) => { memory.delete(key); });
    const { result, unmount } = renderHook();
    await act(async () => { await result.current.saveDraftNow(draft('Source')); });
    let checks = 0;
    await act(async () => { expect(await result.current.associateDraft('a', { ...draft('Source'), existingLogId: 'a' }, () => ++checks < 2)).toBe(false); });
    expect(await readWorkoutDraft('user-1', '2026-08-30', null)).toMatchObject({ workoutTitle: 'Source' });
    unmount();
  });

  it('finishes an identical association after source cleanup failed once', async () => {
    const memory = new Map<string, string>();
    const sourceKey = 'workout-draft:user-1:2026-08-30';
    const targetKey = sourceKey + ':log:a';
    let failSourceCleanup = true;
    mockStorage.getItem.mockImplementation(async (key) => memory.get(key) ?? null);
    mockStorage.setItem.mockImplementation(async (key, value) => { memory.set(key, value); });
    mockStorage.removeItem.mockImplementation(async (key) => {
      if (key === sourceKey && failSourceCleanup) { failSourceCleanup = false; throw new Error('cleanup failed'); }
      memory.delete(key);
    });
    const { result, unmount } = renderHook();
    await act(async () => { await result.current.saveDraftNow({ ...draft('Source'), sourceKind: 'text', legacyText: 'Protected notes' }); });
    const selected = { ...draft('Source'), existingLogId: 'a', sourceKind: 'text' as const, legacyText: 'Protected notes' };

    await act(async () => { expect(await result.current.associateDraft('a', selected, () => true)).toBe(false); });
    expect(memory.has(sourceKey)).toBe(true);
    expect(memory.has(targetKey)).toBe(true);

    await act(async () => { expect(await result.current.associateDraft('a', selected, () => true)).toBe(true); });
    expect(memory.has(sourceKey)).toBe(false);
    expect(await readWorkoutDraft('user-1', '2026-08-30', 'a')).toMatchObject({ workoutTitle: 'Source', sourceKind: 'text', legacyText: 'Protected notes', existingLogId: 'a' });
    unmount();
  });
});
