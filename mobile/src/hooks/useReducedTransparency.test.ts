import * as React from 'react';
import { AccessibilityInfo } from 'react-native';

import { useReducedTransparency } from './useReducedTransparency';

jest.mock('react', () => {
  const actual = jest.requireActual('react');

  return {
    ...actual,
    useState: jest.fn(actual.useState),
  };
});

jest.mock('react-native', () => {
  return {
    AccessibilityInfo: {
      isReduceTransparencyEnabled: jest.fn(),
      addEventListener: jest.fn(),
    },
  };
});

const mockAccessibilityInfo = jest.mocked(AccessibilityInfo);
const mockRemove = jest.fn();
let reduceTransparencyListener: ((enabled: boolean) => void) | undefined;
// The installed renderer has no declaration file in this project.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const TestRenderer = require('react-test-renderer') as {
  act: (callback: () => void | Promise<void>) => void | Promise<void>;
  create: (element: React.ReactElement) => { unmount: () => void };
};

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

function renderHook<T>(hook: () => T) {
  let current: T | undefined;
  let renderer!: ReturnType<typeof TestRenderer.create>;

  function HookProbe() {
    current = hook();
    return null;
  }

  TestRenderer.act(() => {
    renderer = TestRenderer.create(React.createElement(HookProbe));
  });

  return {
    result: {
      get current() {
        return current as T;
      },
    },
    unmount: () => {
      TestRenderer.act(() => renderer.unmount());
    },
  };
}

describe('useReducedTransparency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    reduceTransparencyListener = undefined;
    (mockAccessibilityInfo.isReduceTransparencyEnabled as jest.Mock).mockResolvedValue(false);
    (mockAccessibilityInfo.addEventListener as jest.Mock).mockImplementation(
      (eventName: string, listener: (enabled: boolean) => void) => {
        if (eventName === 'reduceTransparencyChanged') {
          reduceTransparencyListener = listener;
        }

        return { remove: mockRemove };
      },
    );
  });

  it('tracks the system reduce-transparency preference', async () => {
    (mockAccessibilityInfo.isReduceTransparencyEnabled as jest.Mock).mockResolvedValue(true);

    const { result } = renderHook(() => useReducedTransparency());

    await TestRenderer.act(async () => undefined);
    expect(result.current).toBe(true);
    TestRenderer.act(() => reduceTransparencyListener?.(false));
    expect(result.current).toBe(false);
  });

  it('removes its reduce-transparency subscription when unmounted', () => {
    const { unmount } = renderHook(() => useReducedTransparency());

    unmount();

    expect(mockRemove).toHaveBeenCalledTimes(1);
  });

  it('preserves an event received before the initial preference resolves', async () => {
    const initialPreference = createDeferred<boolean>();
    (mockAccessibilityInfo.isReduceTransparencyEnabled as jest.Mock).mockReturnValue(
      initialPreference.promise,
    );
    const { result } = renderHook(() => useReducedTransparency());

    TestRenderer.act(() => reduceTransparencyListener?.(true));
    expect(result.current).toBe(true);

    await TestRenderer.act(async () => initialPreference.resolve(false));

    expect(result.current).toBe(true);
  });

  it('does not update state when unmounted before the initial preference resolves', async () => {
    const initialPreference = createDeferred<boolean>();
    const setReduced = jest.fn();
    (mockAccessibilityInfo.isReduceTransparencyEnabled as jest.Mock).mockReturnValue(
      initialPreference.promise,
    );
    (React.useState as jest.Mock).mockImplementationOnce(() => [false, setReduced]);
    const { unmount } = renderHook(() => useReducedTransparency());

    unmount();
    await TestRenderer.act(async () => initialPreference.resolve(true));

    expect(setReduced).not.toHaveBeenCalled();
  });
});
