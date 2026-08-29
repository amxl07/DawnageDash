import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import type { FormState } from '@/components/checkin/CheckInForm';
import { useCheckInDraft } from './useCheckInDraft';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return { ...actual, useState: jest.fn(actual.useState) };
});

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockStorage = jest.mocked(AsyncStorage);

const EMPTY_FORM: FormState = {
  morningWeight: null,
  sleepHours: null,
  workoutStatus: null,
  workoutPerformance: null,
  nutritionScore: null,
  calorieIntake: null,
  waterLiters: null,
  dailySteps: null,
  protein: null,
  carbs: null,
  fats: null,
  energyLevel: null,
  hungerLevel: null,
  stressLevel: null,
  digestion: null,
  notes: '',
};

function deferred() {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

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

describe('useCheckInDraft save status', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-30T06:00:00.000Z'));
    jest.clearAllMocks();
    mockStorage.getItem.mockResolvedValue(null);
    mockStorage.setItem.mockResolvedValue(undefined);
    mockStorage.removeItem.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('moves from saving to saved after the debounced write', async () => {
    const { result, unmount } = renderHook(() => useCheckInDraft('user-1', '2026-08-30'));

    act(() => result.current.saveDraft(EMPTY_FORM, 1));
    expect(result.current.draftStatus).toBe('saving');

    await act(async () => jest.advanceTimersByTimeAsync(500));

    expect(result.current.draftStatus).toBe('saved');
    expect(mockStorage.setItem).toHaveBeenCalledWith(
      'check-in-draft:user-1:2026-08-30',
      JSON.stringify({ form: EMPTY_FORM, step: 1, savedAt: Date.now() }),
    );
    unmount();
  });

  it('reports a rejected write without changing the caller-owned form', async () => {
    mockStorage.setItem.mockRejectedValueOnce(new Error('disk unavailable'));
    const callerForm = { ...EMPTY_FORM, notes: 'Keep this note' };
    const { result, unmount } = renderHook(() => useCheckInDraft('user-1', '2026-08-30'));

    act(() => result.current.saveDraft(callerForm, 2));
    await act(async () => jest.advanceTimersByTimeAsync(500));

    expect(result.current.draftStatus).toBe('error');
    expect(callerForm).toEqual({ ...EMPTY_FORM, notes: 'Keep this note' });
    unmount();
  });

  it('does not let an older rejected write regress a newer saved status', async () => {
    const firstWrite = deferred();
    const secondWrite = deferred();
    mockStorage.setItem
      .mockReturnValueOnce(firstWrite.promise)
      .mockReturnValueOnce(secondWrite.promise);
    const { result, unmount } = renderHook(() => useCheckInDraft('user-1', '2026-08-30'));

    act(() => result.current.saveDraft({ ...EMPTY_FORM, notes: 'First' }, 1));
    await act(async () => jest.advanceTimersByTimeAsync(500));
    act(() => result.current.saveDraft({ ...EMPTY_FORM, notes: 'Second' }, 2));
    await act(async () => jest.advanceTimersByTimeAsync(500));

    await act(async () => secondWrite.resolve());
    expect(result.current.draftStatus).toBe('saved');

    await act(async () => firstWrite.reject(new Error('late failure')));
    expect(result.current.draftStatus).toBe('saved');
    unmount();
  });

  it('cancels a pending debounce when unmounted', async () => {
    const { result, unmount } = renderHook(() => useCheckInDraft('user-1', '2026-08-30'));

    act(() => result.current.saveDraft(EMPTY_FORM, 1));
    unmount();
    await act(async () => jest.advanceTimersByTimeAsync(500));

    expect(mockStorage.setItem).not.toHaveBeenCalled();
  });

  it('does not update status when an in-flight write resolves after unmount', async () => {
    const write = deferred();
    const setStatus = jest.fn();
    (React.useState as jest.Mock).mockImplementationOnce(() => ['idle', setStatus]);
    mockStorage.setItem.mockReturnValueOnce(write.promise);
    const { result, unmount } = renderHook(() => useCheckInDraft('user-1', '2026-08-30'));

    act(() => result.current.saveDraft(EMPTY_FORM, 1));
    await act(async () => jest.advanceTimersByTimeAsync(500));
    unmount();
    await act(async () => write.resolve());

    expect(setStatus).toHaveBeenCalledWith('saving');
    expect(setStatus).not.toHaveBeenCalledWith('saved');
    expect(setStatus).not.toHaveBeenCalledWith('error');
  });

  it('restores an unexpired draft from the user-and-date key', async () => {
    const persisted = { form: { ...EMPTY_FORM, notes: 'Resume me' }, step: 3, savedAt: Date.now() };
    mockStorage.getItem.mockResolvedValueOnce(JSON.stringify(persisted));
    const { result, unmount } = renderHook(() => useCheckInDraft('user-1', '2026-08-30'));

    await expect(result.current.loadDraft()).resolves.toEqual(persisted);
    expect(mockStorage.getItem).toHaveBeenCalledWith('check-in-draft:user-1:2026-08-30');
    unmount();
  });

  it('removes and ignores a draft older than three days', async () => {
    const expired = {
      form: EMPTY_FORM,
      step: 2,
      savedAt: Date.now() - 3 * 24 * 60 * 60 * 1000 - 1,
    };
    mockStorage.getItem.mockResolvedValueOnce(JSON.stringify(expired));
    const { result, unmount } = renderHook(() => useCheckInDraft('user-1', '2026-08-30'));

    await expect(result.current.loadDraft()).resolves.toBeNull();
    expect(mockStorage.removeItem).toHaveBeenCalledWith('check-in-draft:user-1:2026-08-30');
    unmount();
  });
});
