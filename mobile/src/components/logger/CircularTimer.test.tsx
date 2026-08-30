import { StyleSheet } from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { CircularTimer } from './CircularTimer';
import { RestTimer } from './RestTimer';
import { RestTimerProvider } from './useRestTimer';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => undefined),
  removeItem: jest.fn(async () => undefined),
}));

const mockMotion = { enabled: true };
const mockSharedValues: {
  initial: number;
  get: jest.Mock<number, []>;
  set: jest.Mock<void, [number]>;
}[] = [];
const mockAnimatedStyles: object[] = [];
const mockWithTiming = jest.fn(
  (value: number, _config?: object, callback?: (finished: boolean) => void) => {
    callback?.(true);
    return value;
  },
);

jest.mock('lucide-react-native', () => ({
  Check: 'Check',
  Maximize2: 'Maximize2',
  Pause: 'Pause',
  Play: 'Play',
  RotateCcw: 'RotateCcw',
  SkipForward: 'SkipForward',
  X: 'X',
}));
jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Circle: 'Circle',
}));
jest.mock('react-native-reanimated', () => {
  const native = jest.requireActual('react-native');
  const react = jest.requireActual('react') as typeof import('react');
  return {
    __esModule: true,
    default: {
      View: native.View,
      createAnimatedComponent: (Component: unknown) => Component,
    },
    Easing: {
      bezier: jest.fn(() => 'ease-out'),
      linear: 'linear',
    },
    useAnimatedProps: (factory: () => object) => factory(),
    useAnimatedStyle: (factory: () => object) => {
      const style = factory();
      mockAnimatedStyles.push(style);
      return style;
    },
    useSharedValue: (initial: number) => {
      const ref = react.useRef<{
        initial: number;
        get: jest.Mock<number, []>;
        set: jest.Mock<void, [number]>;
      } | null>(null);
      if (ref.current === null) {
        let current = initial;
        ref.current = {
          initial,
          get: jest.fn(() => current),
          set: jest.fn((value: number) => {
            current = value;
          }),
        };
        mockSharedValues.push(ref.current);
      }
      return ref.current;
    },
    withTiming: (...args: [number, object?, ((finished: boolean) => void)?]) =>
      mockWithTiming(...args),
  };
});
jest.mock('@/components/ui', () => ({ Card: 'Card', Text: 'Text' }));
jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  iconSize: { lg: 24, md: 20, xl: 32 },
  radius: { sm: 8 },
  spacing: { sm: 8, md: 12, base: 16, lg: 24, xl: 32 },
  useMotion: () => mockMotion,
  useTheme: () => ({
    colors: {
      background: '#fff',
      borderStrong: '#aaa',
      elevated: '#eee',
      foreground: '#111',
      mutedForeground: '#666',
      primary: '#05f',
      success: '#080',
    },
  }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe('CircularTimer completion choreography', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSharedValues.length = 0;
    mockAnimatedStyles.length = 0;
    mockMotion.enabled = true;
  });

  it('fills for 180ms, fades for 120ms, and settles the tick from 0.92 for 160ms', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<CircularTimer progress={0.4} remainingSeconds={0} complete />);
    });

    expect(mockSharedValues.map(({ initial }) => initial)).toEqual([0.4, 1, 0.92, 0]);
    expect(mockWithTiming).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ duration: 180 }),
      expect.any(Function),
    );
    expect(mockWithTiming).toHaveBeenCalledWith(
      0,
      expect.objectContaining({ duration: 120 }),
      expect.any(Function),
    );
    expect(mockWithTiming).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ duration: 160 }),
    );
    expect(renderer.root.findByProps({ accessibilityRole: 'timer' }).props.accessibilityLabel).toBe(
      'Rest complete',
    );
    act(() => renderer.unmount());
  });

  it('restores ring opacity and hidden 0.92 tick when a new timer starts', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<CircularTimer progress={1} remainingSeconds={0} complete />);
    });
    const [fill, contentOpacity, tickScale, tickOpacity] = mockSharedValues;
    jest.clearAllMocks();

    act(() => {
      renderer.update(<CircularTimer progress={0} remainingSeconds={90} complete={false} />);
    });

    expect(fill.set).toHaveBeenCalledWith(0);
    expect(contentOpacity.set).toHaveBeenCalledWith(1);
    expect(tickScale.set).toHaveBeenCalledWith(0.92);
    expect(tickOpacity.set).toHaveBeenCalledWith(0);
    expect(mockWithTiming).not.toHaveBeenCalled();
    expect(renderer.root.findByProps({ accessibilityRole: 'timer' }).props.accessibilityLabel).toBe(
      '1:30 of rest remaining',
    );
    act(() => renderer.unmount());
  });

  it('shows the final tick immediately under Reduced Motion', () => {
    mockMotion.enabled = false;
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<CircularTimer progress={0.7} remainingSeconds={0} complete />);
    });

    expect(mockWithTiming).not.toHaveBeenCalled();
    expect(mockSharedValues.map(({ initial }) => initial)).toEqual([1, 0, 1, 1]);
    expect(mockAnimatedStyles).toEqual([
      { opacity: 0 },
      { opacity: 1, transform: [{ scale: 1 }] },
    ]);
    act(() => renderer.unmount());
  });

  it('switches to a static tick tree on a running-to-complete Reduced Motion transition', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <CircularTimer progress={0.5} remainingSeconds={30} complete={false} />,
      );
    });
    expect(renderer.root.findAllByType('Svg')).toHaveLength(1);
    expect(renderer.root.findAllByProps({ children: '0:30' })).toHaveLength(1);

    mockMotion.enabled = false;
    act(() => {
      renderer.update(<CircularTimer progress={1} remainingSeconds={0} complete />);
    });

    expect(renderer.root.findAllByType('Svg')).toHaveLength(0);
    expect(renderer.root.findAllByProps({ children: '0:00' })).toHaveLength(0);
    expect(renderer.root.findAllByType('Check')).toHaveLength(1);

    act(() => {
      renderer.update(
        <CircularTimer progress={0} remainingSeconds={90} complete={false} />,
      );
    });
    expect(renderer.root.findAllByType('Svg')).toHaveLength(1);
    expect(renderer.root.findAllByProps({ children: '1:30' })).toHaveLength(1);
    expect(renderer.root.findAllByType('Check')).toHaveLength(0);
    act(() => renderer.unmount());
  });

  it('keeps every rest preset at least 44pt tall', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <RestTimerProvider userId="timer-test-user">
          <RestTimer />
        </RestTimerProvider>,
      );
    });

    const presets = [1, 1.5, 2, 3].map((minutes) =>
      renderer.root.findByProps({ accessibilityLabel: `Start ${minutes} minute rest` }),
    );
    expect(presets).toHaveLength(4);
    for (const preset of presets) {
      expect(StyleSheet.flatten(preset.props.style).minHeight).toBeGreaterThanOrEqual(44);
    }
    act(() => renderer.unmount());
  });
});
