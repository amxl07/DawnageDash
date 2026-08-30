import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { useWorkoutDraft, type DraftData } from './useWorkoutDraft';

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
});
