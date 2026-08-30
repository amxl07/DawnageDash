import * as Haptics from 'expo-haptics';
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

const mockNotificationAsync = jest.mocked(Haptics.notificationAsync);

function Provider({ children }: PropsWithChildren) {
  return <RestTimerProvider>{children}</RestTimerProvider>;
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
      return <RestTimerProvider>{show ? <Probe /> : null}</RestTimerProvider>;
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
    expect(timer.result.current.remaining).toBe(1);

    act(() => timer.result.current.reset());
    expect(timer.result.current).toMatchObject({ running: false, remaining: 90, complete: false });
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
