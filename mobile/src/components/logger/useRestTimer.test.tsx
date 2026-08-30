import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PropsWithChildren } from 'react';
import { AppState } from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import {
  remainingAt,
  RestTimerProvider,
  useRestTimer,
  type RestTimerState,
} from './useRestTimer';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockNotificationAsync = jest.mocked(Haptics.notificationAsync);
const mockStorage = jest.mocked(AsyncStorage);
let persisted = new Map<string, string>();

function Provider({ children, userId = 'user-1' }: PropsWithChildren<{ userId?: string }>) {
  return <RestTimerProvider userId={userId}>{children}</RestTimerProvider>;
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

async function flushStorage() {
  await act(async () => {
    for (let index = 0; index < 8; index += 1) await Promise.resolve();
  });
}

function renderTimer(userId = 'user-1') {
  let current: RestTimerState | undefined;

  function Probe() {
    current = useRestTimer();
    return null;
  }

  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <Provider userId={userId}>
        <Probe />
      </Provider>,
    );
  });

  return {
    result: {
      get current() {
        return current as RestTimerState;
      },
    },
    unmount: () => act(() => renderer.unmount()),
  };
}

describe('rest timer absolute-time lifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(0);
    jest.clearAllMocks();
    persisted = new Map();
    mockStorage.getItem.mockImplementation(async (key) => persisted.get(key) ?? null);
    mockStorage.setItem.mockImplementation(async (key, value) => {
      persisted.set(key, value);
    });
    mockStorage.removeItem.mockImplementation(async (key) => {
      persisted.delete(key);
    });
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('derives remaining seconds from absolute time', () => {
    expect(remainingAt(10_000, 8_600)).toBe(1);
    expect(remainingAt(10_000, 10_001)).toBe(0);
  });

  it('throws clearly when consumed outside the provider', () => {
    function OutsideConsumer() {
      useRestTimer();
      return null;
    }

    expect(() => {
      act(() => create(<OutsideConsumer />));
    }).toThrow('useRestTimer must be used inside <RestTimerProvider>');
  });

  it('keeps one timer state across consumer remounts', () => {
    let current: RestTimerState | undefined;

    function Probe() {
      current = useRestTimer();
      return null;
    }

    function Shell({ show }: { show: boolean }) {
      return <RestTimerProvider userId="user-1">{show ? <Probe /> : null}</RestTimerProvider>;
    }

    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<Shell show />);
    });
    act(() => current?.start(90));
    expect(current?.running).toBe(true);

    act(() => renderer.update(<Shell show={false} />));
    act(() => renderer.update(<Shell show />));

    expect(current?.running).toBe(true);
    expect(current?.remaining).toBe(90);
    act(() => renderer.unmount());
  });

  it('restores a running timer from its absolute timestamp after a provider remount', async () => {
    const first = renderTimer();
    act(() => first.result.current.start(90));
    await flushStorage();
    first.unmount();

    jest.setSystemTime(30_400);
    const restored = renderTimer();
    await flushStorage();

    expect(restored.result.current).toMatchObject({
      duration: 90,
      remaining: 60,
      running: true,
      complete: false,
    });
    restored.unmount();
  });

  it('restores a paused timer with its exact remaining milliseconds', async () => {
    const first = renderTimer();
    act(() => first.result.current.start(1));
    jest.setSystemTime(400);
    act(() => first.result.current.toggle());
    await flushStorage();

    expect(JSON.parse(persisted.get('rest-timer:user-1')!)).toMatchObject({
      duration: 1,
      endsAt: null,
      pausedRemainingMs: 600,
    });
    first.unmount();

    jest.setSystemTime(10_000);
    const restored = renderTimer();
    await flushStorage();
    expect(restored.result.current).toMatchObject({ remaining: 1, running: false, complete: false });

    act(() => restored.result.current.toggle());
    await flushStorage();
    expect(JSON.parse(persisted.get('rest-timer:user-1')!)).toMatchObject({
      duration: 1,
      endsAt: 10_600,
      pausedRemainingMs: null,
    });
    restored.unmount();
  });

  it('isolates persisted timers by user', async () => {
    const firstUser = renderTimer('user-1');
    act(() => firstUser.result.current.start(120));
    await flushStorage();
    firstUser.unmount();

    const secondUser = renderTimer('user-2');
    await flushStorage();
    expect(secondUser.result.current).toMatchObject({
      duration: 90,
      remaining: 90,
      running: false,
      complete: false,
    });
    expect(mockStorage.getItem).toHaveBeenLastCalledWith('rest-timer:user-2');
    secondUser.unmount();

    const restoredFirstUser = renderTimer('user-1');
    await flushStorage();
    expect(restoredFirstUser.result.current).toMatchObject({
      duration: 120,
      remaining: 120,
      running: true,
      complete: false,
    });
    restoredFirstUser.unmount();
  });

  it('does not let delayed hydration overwrite a newer timer interaction', async () => {
    const pendingRead = deferred<string | null>();
    mockStorage.getItem.mockReturnValueOnce(pendingRead.promise);
    const timer = renderTimer();

    act(() => timer.result.current.start(120));
    pendingRead.resolve(
      JSON.stringify({ version: 1, duration: 60, endsAt: 60_000, pausedRemainingMs: null }),
    );
    await flushStorage();

    expect(timer.result.current).toMatchObject({
      duration: 120,
      remaining: 120,
      running: true,
      complete: false,
    });
    timer.unmount();
  });

  it.each([
    ['corrupt JSON', '{'],
    [
      'wrong schema version',
      JSON.stringify({ version: 2, duration: 90, endsAt: 90_000, pausedRemainingMs: null }),
    ],
    [
      'inactive persisted state',
      JSON.stringify({ version: 1, duration: 90, endsAt: null, pausedRemainingMs: null }),
    ],
    [
      'invalid duration',
      JSON.stringify({ version: 1, duration: -1, endsAt: 90_000, pausedRemainingMs: null }),
    ],
  ])('ignores and removes %s', async (_label, raw) => {
    persisted.set('rest-timer:user-1', raw);
    const timer = renderTimer();
    await flushStorage();

    expect(timer.result.current).toMatchObject({
      duration: 90,
      remaining: 90,
      running: false,
      complete: false,
    });
    expect(mockStorage.removeItem).toHaveBeenCalledWith('rest-timer:user-1');
    expect(persisted.has('rest-timer:user-1')).toBe(false);
    timer.unmount();
  });

  it.each([
    ['reset', 90],
    ['skip', 0],
  ] as const)('%s removes the persisted timer state', async (control, remaining) => {
    const timer = renderTimer();
    act(() => timer.result.current.start(90));
    await flushStorage();
    expect(persisted.has('rest-timer:user-1')).toBe(true);

    act(() => timer.result.current[control]());
    await flushStorage();

    expect(timer.result.current).toMatchObject({ running: false, complete: false, remaining });
    expect(persisted.has('rest-timer:user-1')).toBe(false);
    timer.unmount();
  });

  it('natural completion removes the persisted timer state', async () => {
    const timer = renderTimer();
    act(() => timer.result.current.start(1));
    await flushStorage();
    expect(persisted.has('rest-timer:user-1')).toBe(true);

    await act(async () => jest.advanceTimersByTimeAsync(1_000));
    await flushStorage();

    expect(timer.result.current).toMatchObject({ remaining: 0, running: false, complete: true });
    expect(persisted.has('rest-timer:user-1')).toBe(false);
    expect(mockNotificationAsync).toHaveBeenCalledTimes(1);
    timer.unmount();
  });

  it('continues safely after storage read, write, and removal rejections', async () => {
    mockStorage.getItem.mockRejectedValueOnce(new Error('read failed'));
    mockStorage.setItem.mockRejectedValueOnce(new Error('write failed'));
    mockStorage.removeItem.mockRejectedValueOnce(new Error('remove failed'));
    const timer = renderTimer();
    await flushStorage();

    expect(timer.result.current).toMatchObject({ remaining: 90, running: false, complete: false });

    act(() => timer.result.current.start(90));
    await flushStorage();
    expect(timer.result.current).toMatchObject({ remaining: 90, running: true, complete: false });

    jest.setSystemTime(400);
    act(() => timer.result.current.toggle());
    await flushStorage();
    expect(timer.result.current).toMatchObject({ remaining: 90, running: false, complete: false });
    expect(persisted.has('rest-timer:user-1')).toBe(true);

    act(() => timer.result.current.reset());
    await flushStorage();
    expect(timer.result.current).toMatchObject({ remaining: 90, running: false, complete: false });
    expect(persisted.has('rest-timer:user-1')).toBe(true);

    act(() => timer.result.current.start(60));
    act(() => timer.result.current.skip());
    await flushStorage();
    expect(timer.result.current).toMatchObject({ remaining: 0, running: false, complete: false });
    expect(persisted.has('rest-timer:user-1')).toBe(false);
    timer.unmount();
  });

  it('recomputes on foreground and fires completion feedback once per run', () => {
    let onAppStateChange: ((state: string) => void) | undefined;
    const remove = jest.fn();
    const addEventListener = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        onAppStateChange = listener as (state: string) => void;
        return { remove };
      });
    const timer = renderTimer();

    act(() => timer.result.current.start(2));
    jest.setSystemTime(2_100);
    act(() => onAppStateChange?.('active'));

    expect(timer.result.current.remaining).toBe(0);
    expect(timer.result.current.complete).toBe(true);
    expect(timer.result.current.running).toBe(false);
    expect(mockNotificationAsync).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(2_000);
      onAppStateChange?.('active');
    });
    expect(mockNotificationAsync).toHaveBeenCalledTimes(1);
    timer.unmount();
    expect(remove).toHaveBeenCalledTimes(addEventListener.mock.calls.length);
  });

  it('shows rounded zero without completing before the absolute end', () => {
    let onAppStateChange: ((state: string) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      onAppStateChange = listener as (state: string) => void;
      return { remove: jest.fn() };
    });
    const timer = renderTimer();
    act(() => timer.result.current.start(1));

    jest.setSystemTime(600);
    act(() => onAppStateChange?.('active'));
    expect(timer.result.current).toMatchObject({ remaining: 0, running: true, complete: false });
    expect(mockNotificationAsync).not.toHaveBeenCalled();

    jest.setSystemTime(1_000);
    act(() => onAppStateChange?.('active'));
    expect(timer.result.current).toMatchObject({ remaining: 0, running: false, complete: true });
    expect(mockNotificationAsync).toHaveBeenCalledTimes(1);
    timer.unmount();
  });

  it('pauses from absolute time, resumes without drift, and resets to the selected duration', () => {
    const timer = renderTimer();
    act(() => timer.result.current.start(90));

    jest.setSystemTime(30_400);
    act(() => timer.result.current.toggle());
    expect(timer.result.current.running).toBe(false);
    expect(timer.result.current.remaining).toBe(60);

    jest.setSystemTime(80_400);
    act(() => timer.result.current.toggle());
    expect(timer.result.current.running).toBe(true);
    act(() => jest.advanceTimersByTime(59_500));
    expect(timer.result.current).toMatchObject({ remaining: 0, running: true, complete: false });

    act(() => timer.result.current.reset());
    expect(timer.result.current).toMatchObject({ running: false, remaining: 90, complete: false });
    timer.unmount();
  });

  it('preserves exact paused milliseconds when resuming', () => {
    let onAppStateChange: ((state: string) => void) | undefined;
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      onAppStateChange = listener as (state: string) => void;
      return { remove: jest.fn() };
    });
    const timer = renderTimer();
    act(() => timer.result.current.start(1));

    jest.setSystemTime(400);
    act(() => timer.result.current.toggle());
    expect(timer.result.current).toMatchObject({ remaining: 1, running: false, complete: false });

    jest.setSystemTime(10_000);
    act(() => timer.result.current.toggle());
    jest.setSystemTime(10_599);
    act(() => onAppStateChange?.('active'));
    expect(timer.result.current.running).toBe(true);

    jest.setSystemTime(10_600);
    act(() => onAppStateChange?.('active'));
    expect(timer.result.current).toMatchObject({ remaining: 0, running: false, complete: true });
    timer.unmount();
  });

  it('ignores a queued AppState callback from a run replaced by start', () => {
    const listeners: ((state: string) => void)[] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_event, listener) => {
      listeners.push(listener as (state: string) => void);
      return { remove: jest.fn() };
    });
    const timer = renderTimer();
    act(() => timer.result.current.start(1));
    const staleRunCallback = listeners.at(-1)!;

    jest.setSystemTime(500);
    act(() => timer.result.current.start(10));
    jest.setSystemTime(1_100);
    act(() => staleRunCallback('active'));

    expect(timer.result.current).toMatchObject({ remaining: 10, running: true, complete: false });
    expect(mockNotificationAsync).not.toHaveBeenCalled();
    timer.unmount();
  });

  it.each([
    ['reset', 10],
    ['skip', 0],
  ] as const)('ignores a queued interval callback after %s', (control, expectedRemaining) => {
    const intervalSpy = jest.spyOn(global, 'setInterval');
    const timer = renderTimer();
    act(() => timer.result.current.start(10));
    const staleRunCallback = intervalSpy.mock.calls.at(-1)?.[0] as () => void;

    act(() => timer.result.current[control]());
    jest.setSystemTime(1_000);
    act(() => staleRunCallback());

    expect(timer.result.current).toMatchObject({
      remaining: expectedRemaining,
      running: false,
      complete: false,
    });
    expect(mockNotificationAsync).not.toHaveBeenCalled();
    timer.unmount();
  });

  it('skips without completion feedback or a leftover interval', () => {
    const timer = renderTimer();
    act(() => timer.result.current.start(60));
    act(() => timer.result.current.skip());
    act(() => jest.advanceTimersByTime(120_000));

    expect(timer.result.current).toMatchObject({ running: false, remaining: 0, complete: false });
    expect(mockNotificationAsync).not.toHaveBeenCalled();
    timer.unmount();
  });
});
