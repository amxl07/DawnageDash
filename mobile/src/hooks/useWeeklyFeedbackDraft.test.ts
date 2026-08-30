import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { emptyWeekly } from '@/components/weekly/steps';
import { useWeeklyFeedbackDraft } from './useWeeklyFeedbackDraft';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockStorage = jest.mocked(AsyncStorage);

function renderHook<T>(hook: () => T) {
  let current: T | undefined;
  let renderer!: ReturnType<typeof create>;

  function HookProbe() {
    current = hook();
    return null;
  }

  act(() => {
    renderer = create(React.createElement(HookProbe));
  });

  return {
    result: {
      get current() {
        return current as T;
      },
    },
    unmount: () => act(() => renderer.unmount()),
  };
}

function renderUserHook(initialUserId: string | undefined) {
  let userId = initialUserId;
  let current: ReturnType<typeof useWeeklyFeedbackDraft> | undefined;
  let renderer!: ReturnType<typeof create>;

  function HookProbe() {
    current = useWeeklyFeedbackDraft(userId);
    return null;
  }

  act(() => {
    renderer = create(React.createElement(HookProbe));
  });

  return {
    result: {
      get current() {
        return current as ReturnType<typeof useWeeklyFeedbackDraft>;
      },
    },
    rerender: (nextUserId: string | undefined) => {
      userId = nextUserId;
      act(() => renderer.update(React.createElement(HookProbe)));
    },
    unmount: () => act(() => renderer.unmount()),
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

describe('useWeeklyFeedbackDraft', () => {
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

  it('moves from saving to saved after one 500ms durable write', async () => {
    const form = { ...emptyWeekly(), weekly_wins: 'Three training sessions' };
    const { result, unmount } = renderHook(() => useWeeklyFeedbackDraft('user-1'));

    let saved!: Promise<boolean>;
    act(() => {
      saved = result.current.saveDraft(form, 2);
    });
    expect(result.current.draftStatus).toBe('saving');
    expect(mockStorage.setItem).not.toHaveBeenCalled();

    await act(async () => jest.advanceTimersByTimeAsync(499));
    expect(mockStorage.setItem).not.toHaveBeenCalled();

    await act(async () => jest.advanceTimersByTimeAsync(1));
    await expect(saved).resolves.toBe(true);
    expect(result.current.draftStatus).toBe('saved');
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      'weekly-feedback-draft:user-1',
      JSON.stringify({ form, step: 2 }),
    );
    unmount();
  });

  it('restores known form values and bounds an out-of-range step', async () => {
    mockStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({ form: { weekly_wins: 'Resume this', unknown: 'ignore' }, step: 99 }),
    );
    const { result, unmount } = renderHook(() => useWeeklyFeedbackDraft('user-1'));

    await expect(result.current.loadDraft()).resolves.toEqual({
      form: { ...emptyWeekly(), weekly_wins: 'Resume this' },
      step: 4,
    });
    unmount();
  });

  it('falls back safely and removes corrupted persisted JSON', async () => {
    mockStorage.getItem.mockResolvedValueOnce('{not json');
    const { result, unmount } = renderHook(() => useWeeklyFeedbackDraft('user-1'));

    await expect(result.current.loadDraft()).resolves.toBeNull();
    expect(mockStorage.removeItem).toHaveBeenCalledWith('weekly-feedback-draft:user-1');
    unmount();
  });

  it('does not delete a possibly valid draft when storage cannot be read', async () => {
    mockStorage.getItem.mockRejectedValueOnce(new Error('storage temporarily unavailable'));
    const { result, unmount } = renderHook(() => useWeeklyFeedbackDraft('user-1'));

    await expect(result.current.loadDraft()).resolves.toBeNull();
    expect(mockStorage.removeItem).not.toHaveBeenCalled();
    unmount();
  });

  it('reports an error without clearing the caller-owned in-memory form', async () => {
    mockStorage.setItem.mockRejectedValueOnce(new Error('disk unavailable'));
    const form = { ...emptyWeekly(), overall_feeling: 'Keep this answer' };
    const { result, unmount } = renderHook(() => useWeeklyFeedbackDraft('user-1'));

    let saved!: Promise<boolean>;
    act(() => {
      saved = result.current.saveDraft(form, 1);
    });
    await act(async () => jest.advanceTimersByTimeAsync(500));

    await expect(saved).resolves.toBe(false);
    expect(result.current.draftStatus).toBe('error');
    expect(form.overall_feeling).toBe('Keep this answer');
    expect(mockStorage.removeItem).not.toHaveBeenCalled();
    unmount();
  });

  it('supports an immediate durable save for save-and-exit', async () => {
    const form = { ...emptyWeekly(), feedback: 'Saved before leaving' };
    const { result, unmount } = renderHook(() => useWeeklyFeedbackDraft('user-1'));

    let saved!: Promise<boolean>;
    await act(async () => {
      saved = result.current.saveDraft(form, 4, { immediate: true });
      await saved;
    });

    expect(saved).resolves.toBe(true);
    expect(mockStorage.setItem).toHaveBeenCalledTimes(1);
    expect(result.current.draftStatus).toBe('saved');
    unmount();
  });

  it('clamps a negative restored step to the first step', async () => {
    mockStorage.getItem.mockResolvedValueOnce(JSON.stringify({ form: {}, step: -5 }));
    const { result, unmount } = renderHook(() => useWeeklyFeedbackDraft('user-1'));

    await expect(result.current.loadDraft()).resolves.toEqual({ form: emptyWeekly(), step: 0 });
    unmount();
  });

  it('cancels a pending write when the draft is cleared', async () => {
    const { result, unmount } = renderHook(() => useWeeklyFeedbackDraft('user-1'));

    let pending!: Promise<boolean>;
    act(() => {
      pending = result.current.saveDraft(emptyWeekly(), 0);
    });
    await act(async () => {
      await result.current.clearDraft();
    });
    await expect(pending).resolves.toBe(false);
    await act(async () => jest.advanceTimersByTimeAsync(500));

    expect(mockStorage.setItem).not.toHaveBeenCalled();
    expect(mockStorage.removeItem).toHaveBeenCalledWith('weekly-feedback-draft:user-1');
    expect(result.current.draftStatus).toBe('idle');
    unmount();
  });

  it('cancels the 500ms write when the user identity changes', async () => {
    const { result, rerender, unmount } = renderUserHook('user-1');

    let pending!: Promise<boolean>;
    act(() => {
      pending = result.current.saveDraft(
        { ...emptyWeekly(), weekly_wins: 'Belongs to user one' },
        1,
      );
    });
    rerender('user-2');

    await expect(pending).resolves.toBe(false);
    await act(async () => jest.advanceTimersByTimeAsync(500));
    expect(mockStorage.setItem).not.toHaveBeenCalled();
    expect(result.current.draftStatus).toBe('idle');
    unmount();
  });

  it('cancels the 500ms write when unmounted', async () => {
    const { result, unmount } = renderHook(() => useWeeklyFeedbackDraft('user-1'));

    let pending!: Promise<boolean>;
    act(() => {
      pending = result.current.saveDraft(emptyWeekly(), 0);
    });
    unmount();

    await expect(pending).resolves.toBe(false);
    await act(async () => jest.advanceTimersByTimeAsync(500));
    expect(mockStorage.setItem).not.toHaveBeenCalled();
  });

  it('ignores an old user load that completes after the identity changes', async () => {
    const oldLoad = deferred<string | null>();
    mockStorage.getItem.mockReturnValueOnce(oldLoad.promise);
    const { result, rerender, unmount } = renderUserHook('user-1');

    const loading = result.current.loadDraft();
    rerender('user-2');
    await act(async () => oldLoad.resolve(JSON.stringify({ form: { feedback: 'Old' }, step: 4 })));

    await expect(loading).resolves.toBeNull();
    expect(result.current.draftStatus).toBe('idle');
    unmount();
  });

  it('does not let a stale save completion change the next user status or key', async () => {
    const oldWrite = deferred<void>();
    mockStorage.setItem.mockReturnValueOnce(oldWrite.promise).mockResolvedValueOnce(undefined);
    const { result, rerender, unmount } = renderUserHook('user-1');

    let first!: Promise<boolean>;
    await act(async () => {
      first = result.current.saveDraft(
        { ...emptyWeekly(), feedback: 'User one answer' },
        4,
        { immediate: true },
      );
    });
    rerender('user-2');

    await act(async () => oldWrite.resolve());
    await expect(first).resolves.toBe(false);
    expect(result.current.draftStatus).toBe('idle');

    let second!: Promise<boolean>;
    await act(async () => {
      second = result.current.saveDraft(
        { ...emptyWeekly(), feedback: 'User two answer' },
        4,
        { immediate: true },
      );
      await second;
    });
    expect(result.current.draftStatus).toBe('saved');
    expect(mockStorage.setItem.mock.calls.map(([key]) => key)).toEqual([
      'weekly-feedback-draft:user-1',
      'weekly-feedback-draft:user-2',
    ]);
    unmount();
  });

  it('serializes an in-flight debounced save before a newer immediate save', async () => {
    const firstWrite = deferred<void>();
    const secondWrite = deferred<void>();
    mockStorage.setItem
      .mockReturnValueOnce(firstWrite.promise)
      .mockReturnValueOnce(secondWrite.promise);
    const { result, unmount } = renderHook(() => useWeeklyFeedbackDraft('user-1'));

    let first!: Promise<boolean>;
    act(() => {
      first = result.current.saveDraft(
        { ...emptyWeekly(), feedback: 'Older answer' },
        3,
      );
    });
    await act(async () => jest.advanceTimersByTimeAsync(500));
    expect(mockStorage.setItem).toHaveBeenCalledTimes(1);

    let second!: Promise<boolean>;
    act(() => {
      second = result.current.saveDraft(
        { ...emptyWeekly(), feedback: 'Newest answer' },
        4,
        { immediate: true },
      );
    });
    expect(mockStorage.setItem).toHaveBeenCalledTimes(1);

    // Resolve the newer backing promise first. Serialization means it has not
    // been handed to AsyncStorage yet and therefore cannot overtake write one.
    await act(async () => secondWrite.resolve());
    expect(mockStorage.setItem).toHaveBeenCalledTimes(1);

    await act(async () => firstWrite.resolve());
    await expect(first).resolves.toBe(false);
    expect(mockStorage.setItem).toHaveBeenCalledTimes(2);

    await expect(second).resolves.toBe(true);
    expect(mockStorage.setItem.mock.calls[1]).toEqual([
      'weekly-feedback-draft:user-1',
      JSON.stringify({ form: { ...emptyWeekly(), feedback: 'Newest answer' }, step: 4 }),
    ]);
    unmount();
  });

  it('runs clear after an in-flight save so the old write cannot resurrect the draft', async () => {
    const write = deferred<void>();
    mockStorage.setItem.mockReturnValueOnce(write.promise);
    const { result, unmount } = renderHook(() => useWeeklyFeedbackDraft('user-1'));

    let saving!: Promise<boolean>;
    act(() => {
      saving = result.current.saveDraft(emptyWeekly(), 2, { immediate: true });
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
    expect(mockStorage.removeItem).toHaveBeenCalledWith('weekly-feedback-draft:user-1');
    expect(mockStorage.setItem.mock.invocationCallOrder[0]).toBeLessThan(
      mockStorage.removeItem.mock.invocationCallOrder[0]!,
    );
    unmount();
  });

  it('returns false when an in-flight clear belongs to a previous user', async () => {
    const removal = deferred<void>();
    mockStorage.removeItem.mockReturnValueOnce(removal.promise);
    const { result, rerender, unmount } = renderUserHook('user-1');

    const clearing = result.current.clearDraft();
    rerender('user-2');
    await act(async () => removal.resolve());

    await expect(clearing).resolves.toBe(false);
    expect(result.current.draftStatus).toBe('idle');
    unmount();
  });

  it('returns false when an in-flight save completes after unmount', async () => {
    const write = deferred<void>();
    mockStorage.setItem.mockReturnValueOnce(write.promise);
    const { result, unmount } = renderHook(() => useWeeklyFeedbackDraft('user-1'));

    let saving!: Promise<boolean>;
    act(() => {
      saving = result.current.saveDraft(emptyWeekly(), 1, { immediate: true });
    });
    await act(async () => Promise.resolve());
    unmount();
    await act(async () => write.resolve());

    await expect(saving).resolves.toBe(false);
  });

  it('does not let a stale save callback cancel the current user pending save', async () => {
    const { result, rerender, unmount } = renderUserHook('user-1');
    const staleSave = result.current.saveDraft;
    rerender('user-2');

    let currentSave!: Promise<boolean>;
    act(() => {
      currentSave = result.current.saveDraft(
        { ...emptyWeekly(), feedback: 'Current user answer' },
        4,
      );
    });

    await expect(
      staleSave({ ...emptyWeekly(), feedback: 'Old user action' }, 3, { immediate: true }),
    ).resolves.toBe(false);
    await act(async () => jest.advanceTimersByTimeAsync(500));

    await expect(currentSave).resolves.toBe(true);
    expect(mockStorage.setItem).toHaveBeenCalledTimes(1);
    expect(mockStorage.setItem.mock.calls[0]?.[0]).toBe('weekly-feedback-draft:user-2');
    unmount();
  });

  it('does not let a stale clear callback cancel the current user pending save', async () => {
    const { result, rerender, unmount } = renderUserHook('user-1');
    const staleClear = result.current.clearDraft;
    rerender('user-2');

    let currentSave!: Promise<boolean>;
    act(() => {
      currentSave = result.current.saveDraft(
        { ...emptyWeekly(), feedback: 'Current user answer' },
        4,
      );
    });

    await expect(staleClear()).resolves.toBe(false);
    await act(async () => jest.advanceTimersByTimeAsync(500));

    await expect(currentSave).resolves.toBe(true);
    expect(mockStorage.removeItem).toHaveBeenCalledWith('weekly-feedback-draft:user-1');
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      'weekly-feedback-draft:user-2',
      expect.any(String),
    );
    unmount();
  });
});
