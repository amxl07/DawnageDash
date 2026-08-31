import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { CheckInRatingScale } from './CheckInRatingScale';

const mockMotion = {
  enabled: true,
  reduced: false,
  duration: { micro: 120 },
  easing: { standard: [0.16, 1, 0.3, 1] as const },
  pressScale: 0.97,
};
const mockSharedValues: Array<{
  get: jest.Mock<number, []>;
  set: jest.Mock<void, [number]>;
}> = [];
const mockWithTiming = jest.fn((value: number, _config?: object) => value);

jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: jest.fn(),
}));
jest.mock('react-native-reanimated', () => {
  const native = jest.requireActual('react-native') as typeof import('react-native');
  const react = jest.requireActual('react') as typeof import('react');

  return {
    __esModule: true,
    default: {
      View: native.View,
      createAnimatedComponent: (Component: typeof Pressable) => Component,
    },
    Easing: { bezier: jest.fn(() => 'ease-out') },
    useAnimatedStyle: (factory: () => object) => factory(),
    useSharedValue: (initial: number) => {
      const shared = react.useRef<{
        get: jest.Mock<number, []>;
        set: jest.Mock<void, [number]>;
      } | null>(null);
      if (shared.current === null) {
        let current = initial;
        shared.current = {
          get: jest.fn(() => current),
          set: jest.fn((next: number) => {
            current = next;
          }),
        };
        mockSharedValues.push(shared.current);
      }
      return shared.current;
    },
    withTiming: (...args: [number, object?]) => mockWithTiming(...args),
  };
});
jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  radius: { md: 12 },
  spacing: { sm: 8 },
  tabularNums: {},
  type: { body: {} },
  useMotion: () => mockMotion,
  useTheme: () => ({
    colors: {
      borderStrong: '#888',
      foreground: '#111',
      onPrimary: '#fff',
      primary: '#c00',
      primaryFill: '#d00',
      mutedForeground: '#666',
      success: '#080',
      gold: '#a60',
    },
  }),
}));

const mockedUseResponsiveLayout = jest.mocked(useResponsiveLayout);
const pressableType = (Pressable as unknown as { type: unknown }).type;

function findOption(renderer: ReturnType<typeof create>, testID: string) {
  return renderer.root.find(
    (node: { type: unknown; props: { testID?: string } }) =>
      node.type === pressableType && node.props.testID === testID,
  );
}

function findRadioOptions(root: ReturnType<typeof create>['root']) {
  return root.findAll(
    (node: { type: unknown; props: { accessibilityRole?: string } }) =>
      node.type === pressableType && node.props.accessibilityRole === 'radio',
  );
}

function setWide(isWide: boolean) {
  mockedUseResponsiveLayout.mockReturnValue({
    width: isWide ? 900 : 390,
    height: 800,
    fontScale: 1,
    mode: isWide ? 'wide' : 'regular',
    isCompact: false,
    isWide,
    horizontal: 24,
    maxContentWidth: isWide ? 1120 : 720,
  });
}

function StatefulRating({
  initialValue,
  onChange,
  accessibilityMode = 'options',
}: {
  initialValue: number | null;
  onChange: (value: number) => void;
  accessibilityMode?: 'adjustable' | 'options';
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <CheckInRatingScale
      label="Energy out of 10"
      value={value}
      onChange={(next) => {
        onChange(next);
        setValue(next);
      }}
      {...(accessibilityMode === 'options'
        ? {
            accessibilityMode: 'options' as const,
            optionTestIDPrefix: 'checkin-energy-rating',
          }
        : { accessibilityMode: 'adjustable' as const })}
    />
  );
}

describe('CheckInRatingScale', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSharedValues.length = 0;
    mockMotion.enabled = true;
    mockMotion.reduced = false;
    mockMotion.duration.micro = 120;
    setWide(false);
  });

  it('exposes and returns every exact integer with one haptic only for a changed value', () => {
    const onChange = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <CheckInRatingScale
          label="Energy out of 10"
          value={4}
          onChange={onChange}
          accessibilityMode="options"
          optionTestIDPrefix="checkin-energy-rating"
        />,
      );
    });

    const options = findRadioOptions(renderer.root);
    expect(options).toHaveLength(10);
    expect(options.map((option: { props: { accessibilityLabel: string } }) => option.props.accessibilityLabel))
      .toEqual(Array.from({ length: 10 }, (_, index) => `Energy out of 10, ${index + 1}`));
    expect(findOption(renderer, 'checkin-energy-rating-10').props)
      .toMatchObject({
        accessibilityLabel: 'Energy out of 10, 10',
        accessibilityState: { selected: false, checked: false },
      });
    expect(
      StyleSheet.flatten(
        findOption(renderer, 'checkin-energy-rating-10').props.style,
      ),
    ).toEqual(expect.objectContaining({ flex: 1, minWidth: 44, minHeight: 44 }));

    act(() => findOption(renderer, 'checkin-energy-rating-7').props.onPress());
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(7);
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);

    act(() => findOption(renderer, 'checkin-energy-rating-4').props.onPress());
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('uses two rows of five on phones and shows contiguous decorative progress', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <CheckInRatingScale
          label="Energy out of 10"
          value={4}
          onChange={jest.fn()}
          accessibilityMode="options"
          optionTestIDPrefix="checkin-energy-rating"
        />,
      );
    });

    const row1 = renderer.root.findByProps({ testID: 'checkin-energy-rating-row-1' });
    const row2 = renderer.root.findByProps({ testID: 'checkin-energy-rating-row-2' });
    expect(findRadioOptions(row1)).toHaveLength(5);
    expect(findRadioOptions(row2)).toHaveLength(5);
    expect(renderer.root.findByProps({ testID: 'checkin-energy-rating-3-progress' }).props)
      .toMatchObject({ accessible: false, pointerEvents: 'none' });
    expect(renderer.root.findByProps({ testID: 'checkin-energy-rating-3-progress' }).props.style.opacity)
      .toBe(1);
    expect(renderer.root.findByProps({ testID: 'checkin-energy-rating-5-progress' }).props.style.opacity)
      .toBe(0);
  });

  it('keeps adjustable ownership on the group and changes by exact adjacent integers', () => {
    const onChange = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <CheckInRatingScale label="Hunger out of 10" value={5} onChange={onChange} />,
      );
    });

    const group = renderer.root.findByProps({ accessibilityRole: 'adjustable' });
    expect(group.props).toMatchObject({
      accessible: true,
      accessibilityLabel: 'Hunger out of 10',
      accessibilityValue: { min: 1, max: 10, now: 5 },
    });
    expect(
      renderer.root.findAll(
        (node: { type: unknown; props: { importantForAccessibility?: string } }) =>
          node.type === pressableType && node.props.importantForAccessibility === 'no',
      ),
    ).toHaveLength(10);

    act(() => group.props.onAccessibilityAction({ nativeEvent: { actionName: 'increment' } }));
    act(() => group.props.onAccessibilityAction({ nativeEvent: { actionName: 'decrement' } }));
    expect(onChange.mock.calls).toEqual([[6], [4]]);
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(2);
  });

  it('uses one row of ten only in wide layouts', () => {
    setWide(true);
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <CheckInRatingScale
          label="Energy out of 10"
          value={4}
          onChange={jest.fn()}
          accessibilityMode="options"
          optionTestIDPrefix="checkin-energy-rating"
        />,
      );
    });

    expect(
      findRadioOptions(renderer.root.findByProps({ testID: 'checkin-energy-rating-row-1' })),
    ).toHaveLength(10);
    expect(renderer.root.findAllByProps({ testID: 'checkin-energy-rating-row-2' })).toHaveLength(0);
  });

  it('settles changed selection with the micro ease-out timing', () => {
    const onChange = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<StatefulRating initialValue={4} onChange={onChange} />);
    });
    mockWithTiming.mockClear();

    act(() => findOption(renderer, 'checkin-energy-rating-7').props.onPress());

    expect(mockWithTiming).toHaveBeenCalledWith(1, { duration: 120, easing: 'ease-out' });
    expect(mockSharedValues[6].set.mock.calls.map(([value]) => value)).toEqual([0.97, 1]);
  });

  it('removes scale travel in reduced motion without removing selection or haptics', () => {
    mockMotion.enabled = false;
    mockMotion.reduced = true;
    mockMotion.duration.micro = 0;
    const onChange = jest.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<StatefulRating initialValue={4} onChange={onChange} />);
    });
    mockWithTiming.mockClear();

    act(() => findOption(renderer, 'checkin-energy-rating-7').props.onPress());

    expect(onChange).toHaveBeenCalledWith(7);
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(mockWithTiming).toHaveBeenCalledWith(1, { duration: 0, easing: 'ease-out' });
    expect(mockSharedValues[6].set.mock.calls.map(([value]) => value)).toEqual([1, 1]);
    expect(StyleSheet.flatten(
      findOption(renderer, 'checkin-energy-rating-7').props.style,
    )).toEqual(expect.objectContaining({ transform: [{ scale: 1 }] }));
  });
});
