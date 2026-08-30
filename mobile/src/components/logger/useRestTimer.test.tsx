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

function Provider({ children }: PropsWithChildren) {
  return <RestTimerProvider userId="user-1">{children}</RestTimerProvider>;
}

function renderTimer() {
  let current: RestTimerState | undefined;

  function Probe() {
    current = useRestTimer();
    return null;
  }

  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <Provider>
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
    await act(async () => Promise.resolve());
    first.unmount();

    jest.setSystemTime(30_400);
    const restored = renderTimer();
    await act(async () => Promise.resolve());

    expect(restored.result.current).toMatchObject({
      duration: 90,
      remaining: 60,
      running: true,
      complete: false,
    });
    restored.unmount();
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
