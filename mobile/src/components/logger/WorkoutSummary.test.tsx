// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { WorkoutSummary, type WorkoutResult } from './WorkoutSummary';

jest.mock('lucide-react-native', () => ({
  Circle: 'Circle',
  CircleAlert: 'CircleAlert',
  CircleCheck: 'CircleCheck',
  CloudOff: 'CloudOff',
  LoaderCircle: 'LoaderCircle',
  Trophy: 'Trophy',
}));
jest.mock('react-native-reanimated', () => {
  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (Component: React.ComponentType) => Component,
    },
    useAnimatedStyle: (factory: () => object) => factory(),
    useSharedValue: (value: number) => ({ value }),
    withSpring: (value: number) => value,
  };
});
jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({ isCompact: false }),
}));
jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 44,
  iconSize: { sm: 16, lg: 24 },
  radius: { card: 16, md: 12, pill: 999 },
  spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 24, xl: 32 },
  tabularNums: {},
  type: { body: {}, bodySm: {}, h1: {}, h2: {}, label: {}, metric: {} },
  useMotion: () => ({ pressScale: 0.98, spring: { press: {} } }),
  useTheme: () => ({
    colors: {
      border: '#ddd',
      borderStrong: '#aaa',
      card: '#fff',
      destructive: '#c00',
      elevated: '#fafafa',
      foreground: '#111',
      gold: '#a60',
      mutedForeground: '#666',
      onPrimary: '#fff',
      primary: '#05f',
      primaryFill: '#05f',
      success: '#080',
    },
    shadow: { card: {}, sheet: {} },
  }),
}));

const result: WorkoutResult = {
  volume: 4_320,
  sets: 6,
  minutes: 42,
  prs: [],
};

describe('WorkoutSummary', () => {
  function renderSummary(
    props: Partial<React.ComponentProps<typeof WorkoutSummary>> = {},
  ) {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <WorkoutSummary
          result={result}
          syncStatus="saved"
          onDone={jest.fn()}
          {...props}
        />,
      );
    });
    return renderer;
  }

  it('states local-only completion without presenting it as synced', () => {
    const renderer = renderSummary({ syncStatus: 'offline' });

    expect(renderer.root.findByProps({ children: 'Saved here · waiting to sync' })).toBeTruthy();
    expect(renderer.root.findAllByProps({ children: 'Saved and synced' })).toHaveLength(0);
  });

  it('announces PR names and completed set count', () => {
    const renderer = renderSummary({ result: { ...result, sets: 8, prs: ['Squat'] } });

    expect(
      renderer.root.find(
        (node: { props: { accessibilityLabel?: string } }) =>
          typeof node.props.accessibilityLabel === 'string' &&
          /8 completed sets.*Squat/.test(node.props.accessibilityLabel),
      ),
    ).toBeTruthy();
  });

  it('lays all three completion metrics out in an adaptive grid', () => {
    const renderer = renderSummary();

    expect(renderer.root.findByProps({ testID: 'workout-summary-metrics' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'Volume' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'Completed sets' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'Duration' })).toBeTruthy();
  });

  it('offers a Done action', () => {
    const onDone = jest.fn();
    const renderer = renderSummary({ onDone });

    act(() => renderer.root.findByProps({ accessibilityLabel: 'Done' }).props.onPress());
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
