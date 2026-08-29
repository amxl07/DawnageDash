import { createElement, type ReactElement } from 'react';
import { AccessibilityInfo } from 'react-native';

import { useReducedTransparency } from './useReducedTransparency';

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
  create: (element: ReactElement) => { unmount: () => void };
};

function renderHook<T>(hook: () => T) {
  let current: T | undefined;
  let renderer!: ReturnType<typeof TestRenderer.create>;

  function HookProbe() {
    current = hook();
    return null;
  }

  TestRenderer.act(() => {
    renderer = TestRenderer.create(createElement(HookProbe));
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
});
