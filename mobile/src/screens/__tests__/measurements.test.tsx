import {
  InteractionManager,
  Pressable as MockPressable,
  StyleSheet,
  Text as NativeText,
  View,
} from 'react-native';

import { act, create } from 'react-test-renderer';

import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import type { BodyMeasurement } from '@/types/db';
import MeasurementsScreen from '../../../app/(app)/measurements';

const MockNativeText = NativeText;
const MockView = View;
const MockListView = View as unknown as React.ComponentType<
  React.ComponentProps<typeof View> & {
    onScrollEndDrag?: (event: unknown) => void;
    onMomentumScrollEnd?: (event: unknown) => void;
  }
>;
const mockLineChartRender = jest.fn();
const mockRefetch = jest.fn();
let mockUserId = 'user-1';
jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: mockUserId } }) }));
const mockRows: BodyMeasurement[] = [
  {
    id: 'latest-id',
    user_id: 'user-1',
    date: '2026-08-29',
    chest: 94,
    waist: 82.5,
    hips: 98,
    thighs: 54,
    arms: 33,
  },
  {
    id: 'baseline-id',
    user_id: 'user-1',
    date: '2026-07-01',
    chest: 97,
    waist: 86,
    hips: 100,
    thighs: 55,
    arms: 34,
  },
];
let mockMeasurementQuery: {
  data: BodyMeasurement[] | undefined;
  isLoading: boolean;
  isError: boolean;
  refetch: typeof mockRefetch;
};

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn() }),
}));

jest.mock('lucide-react-native', () => ({
  Plus: () => null,
  Ruler: () => null,
  Scale: () => null,
  TrendingDown: () => null,
  Check: () => null,
  ChevronDown: () => null,
}));

jest.mock('@/components/charts', () => ({
  LineChart: (props: Record<string, unknown>) => {
    mockLineChartRender(props);
    const { LineChart } = jest.requireActual('@/components/charts/LineChart');
    return <MockView testID="measurement-chart"><LineChart {...props} /></MockView>;
  },
}));

jest.mock('@/components/dashboard/MetricCard', () => ({
  MetricCard: ({ label }: { label: string }) => <MockView testID={`metric-${label}`} />,
}));

jest.mock('@/components/measurements/MeasurementHistoryRow', () => ({
  MeasurementHistoryRow: ({ row }: { row: { id: string } }) => (
    <MockView testID={`history-${row.id}`} />
  ),
}));

jest.mock('@/components/measurements/MeasurementSheet', () => ({
  MeasurementSheet: ({ visible }: { visible: boolean }) =>
    visible ? <MockView testID="measurement-sheet" /> : null,
}));

jest.mock('@/components/ui', () => {
  const { AdaptiveGrid } = jest.requireActual('@/components/ui/AdaptiveGrid');
  return {
    AdaptiveGrid,
    OptionRow: jest.requireActual('@/components/ui/OptionRow').OptionRow,
    SegmentedControl: jest.requireActual('@/components/ui/SegmentedControl').SegmentedControl,
    Sheet: ({ visible, children }: { visible: boolean; children: React.ReactNode }) => visible ? <MockView>{children}</MockView> : null,
    AnimatedFlatList: ({
      data,
      keyExtractor,
      ListHeaderComponent,
      ListEmptyComponent,
      renderItem,
      ...props
    }: {
      data: { id: string }[];
      keyExtractor: (item: { id: string }) => string;
      ListHeaderComponent: React.ReactNode;
      ListEmptyComponent?: React.ReactNode;
      renderItem: (info: { item: { id: string }; index: number }) => React.ReactNode;
      onLayout?: (event: unknown) => void;
      onScrollEndDrag?: (event: unknown) => void;
      onMomentumScrollEnd?: (event: unknown) => void;
    }) => (
      <MockListView
        testID="measurement-list"
        onLayout={props.onLayout}
        onScrollEndDrag={props.onScrollEndDrag}
        onMomentumScrollEnd={props.onMomentumScrollEnd}
        accessibilityHint={data.map(keyExtractor).join(',')}
      >
        {ListHeaderComponent}
        {!data.length ? ListEmptyComponent : null}
        {data.map((item, index) => (
          <MockView key={keyExtractor(item)}>{renderItem({ item, index })}</MockView>
        ))}
      </MockListView>
    ),
    Button: ({ label, onPress }: { label: string; onPress: () => void }) => (
      <MockPressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} />
    ),
    Card: ({ children, ...props }: React.ComponentProps<typeof MockView>) => (
      <MockView {...props}>{children}</MockView>
    ),
    EmptyState: ({
      title,
      message,
      actionLabel,
      onAction,
    }: {
      title: string;
      message?: string;
      actionLabel?: string;
      onAction?: () => void;
    }) => (
      <MockView>
        <MockNativeText>{title}</MockNativeText>
        {message ? <MockNativeText>{message}</MockNativeText> : null}
        {actionLabel && onAction ? (
          <MockPressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            onPress={onAction}
          />
        ) : null}
      </MockView>
    ),
    ErrorState: ({ onRetry }: { onRetry?: () => void }) => (
      <MockView>
        {onRetry ? (
          <MockPressable accessibilityRole="button" accessibilityLabel="Retry" onPress={onRetry} />
        ) : null}
      </MockView>
    ),
    PageHeader: ({ title }: { title: string }) => <MockNativeText>{title}</MockNativeText>,
    Screen: ({ children }: { children: React.ReactNode }) => <MockView>{children}</MockView>,
    Skeleton: () => <MockView accessibilityElementsHidden />,
    SkeletonCard: () => null,
    Text: ({ children, ...props }: React.ComponentProps<typeof MockNativeText>) => (
      <MockNativeText {...props}>{children}</MockNativeText>
    ),
    useListMotion: () => ({ itemLayoutAnimation: undefined }),
  };
});

jest.mock('@/hooks/useDashboardData', () => ({
  useDashboardData: () => ({ checkIns: [] }),
  useDailyCheckIns: () => ({ data: [] }),
}));

jest.mock('@/hooks/useMeasurements', () => ({
  useMeasurements: () => mockMeasurementQuery,
}));

jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: jest.fn(),
}));

jest.mock('@/theme', () => ({
  ...jest.requireActual('@/theme/tokens'),
  useMotion: () => ({ enabled: false, duration: { feedback: 0 }, easing: { standard: [0.16, 1, 0.3, 1] } }),
  iconSize: { md: 20 },
  spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 24 },
  useTheme: () => ({
    colors: {
      ...jest.requireActual('@/theme/colors').dark,
      borderStrong: '#aaa',
      chart1: '#111',
      chart2: '#222',
      chart3: '#333',
      chart4: '#444',
      onPrimary: '#fff',
      primary: '#00f',
    },
  }),
}));

const mockedUseResponsiveLayout = jest.mocked(useResponsiveLayout);

function renderScreen() {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(<MeasurementsScreen />);
  });
  return renderer;
}

describe('MeasurementsScreen', () => {
  let interactionCallbacks: (() => void)[];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUserId = 'user-1';
    mockMeasurementQuery = {
      data: mockRows,
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    };
    interactionCallbacks = [];
    mockedUseResponsiveLayout.mockReturnValue({
      width: 320,
      height: 640,
      fontScale: 1.3,
      mode: 'compact',
      isCompact: true,
      isWide: false,
      horizontal: 16,
      maxContentWidth: undefined,
    });
    jest.spyOn(InteractionManager, 'runAfterInteractions').mockImplementation(((callback: () => void) => {
      interactionCallbacks.push(callback);
      return { cancel: jest.fn(), done: jest.fn(), then: jest.fn() };
    }) as typeof InteractionManager.runAfterInteractions);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps weight progress discoverable in an explicit summary', () => {
    const renderer = renderScreen();
    expect(renderer.root.findAllByProps({ label: 'Weight change' })).toHaveLength(0);
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Weight summary' }).props.onPress());
    expect(renderer.root.findByProps({ label: 'Weight change' })).toBeTruthy();
    expect(renderer.root.findByProps({ label: 'Avg weekly change' })).toBeTruthy();
    expect(renderer.root.findAllByProps({ label: 'Weight lost' })).toHaveLength(0);
  });

  it('closes the previous account’s measurement editor when account identity changes', () => {
    const renderer = renderScreen();
    act(() => renderer.root.findByProps({ testID: 'measurement-add' }).props.onPress());
    expect(renderer.root.findByProps({ testID: 'measurement-sheet' })).toBeTruthy();
    mockUserId = 'user-2';
    act(() => renderer.update(<MeasurementsScreen />));
    expect(renderer.root.findAllByProps({ testID: 'measurement-sheet' })).toHaveLength(0);
  });

  it('defaults to a single metric with its latest actual source date and range change', () => {
    const renderer = renderScreen();
    expect(renderer.root.findByProps({ testID: 'measurement-headline-value' }).props.children).toBe('82.5 cm');
    expect(renderer.root.findByProps({ testID: 'measurement-headline-date' }).props.children).toBe('Recorded 29 Aug 2026');
    expect(renderer.root.findByProps({ testID: 'measurement-headline-change' }).props.children).toBe('Down 3.5 cm from 1 Jul 2026');
    expect(renderer.root.findByProps({ accessibilityLabel: 'Metric: Waist' })).toBeTruthy();
    expect(renderer.root.findByProps({ accessibilityLabel: 'Compare measurements' })).toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: 'measurement-chart' })).toHaveLength(0);
  });

  it('uses a compact single-date baseline with accessible values and restores the chart for comparison', () => {
    mockMeasurementQuery = { ...mockMeasurementQuery, data: [mockRows[0], { ...mockRows[0], id: 'duplicate' }] };
    const renderer = renderScreen();
    act(() => renderer.root.findByProps({ testID: 'measurement-list' }).props.onLayout({ nativeEvent: { layout: { height: 700 } } }));
    act(() => renderer.root.findByProps({ testID: 'measurement-progress-section' }).props.onLayout({ nativeEvent: { layout: { y: 20, height: 330 } } }));
    act(() => interactionCallbacks[0]?.());
    expect(renderer.root.findAllByProps({ testID: 'measurement-chart' })).toHaveLength(0);
    expect(renderer.root.findByProps({ testID: 'measurement-headline-value' }).props.children).toBe('82.5 cm');
    expect(renderer.root.findByProps({ testID: 'measurement-headline-date' }).props.children).toBe('Recorded 29 Aug 2026');
    expect(renderer.root.findAllByProps({ accessibilityLabel: 'Previous date' })).toHaveLength(0);
    act(() => renderer.root.findByProps({ accessibilityLabel: 'All values' }).props.onPress());
    expect(renderer.root.findByProps({ accessibilityRole: 'list' }).props.children).toBeTruthy();
    const values = renderer.root.findByProps({ accessibilityRole: 'list' });
    expect(values.findByType(MockNativeText).props.children.join('')).toBe('29 Aug 2026 · Waist: 82.5 cm');
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Compare measurements' }).props.onPress());
    act(() => renderer.root.findByProps({ accessibilityRole: 'radio', accessibilityLabel: 'Chest' }).props.onPress());
    expect(renderer.root.findByProps({ testID: 'measurement-chart' })).toBeTruthy();
  });

  it('preserves a hundredth-centimetre change instead of rounding it to zero', () => {
    mockMeasurementQuery = { ...mockMeasurementQuery, data: [{ ...mockRows[0], waist: 85.99 }, mockRows[1]] };
    const renderer = renderScreen();
    expect(renderer.root.findByProps({ testID: 'measurement-headline-change' }).props.children).toBe('Down 0.01 cm from 1 Jul 2026');
  });

  it('switches the primary metric, adds one comparison, and removes it when it becomes the primary metric', () => {
    const renderer = renderScreen();
    const showChart = () => {
      act(() => renderer.root.findByProps({ testID: 'measurement-list' }).props.onLayout({ nativeEvent: { layout: { height: 700 } } }));
      act(() => renderer.root.findByProps({ testID: 'measurement-progress-section' }).props.onLayout({ nativeEvent: { layout: { y: 20, height: 330 } } }));
      act(() => interactionCallbacks[0]?.());
    };
    showChart();
    expect(mockLineChartRender.mock.calls.at(-1)?.[0].series.map((item: { name: string }) => item.name)).toEqual(['Waist']);
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Compare measurements' }).props.onPress());
    act(() => renderer.root.findByProps({ accessibilityRole: 'radio', accessibilityLabel: 'Chest' }).props.onPress());
    expect(mockLineChartRender.mock.calls.at(-1)?.[0].series.map((item: { name: string }) => item.name)).toEqual(['Waist', 'Chest']);
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Metric: Waist' }).props.onPress());
    act(() => renderer.root.findByProps({ accessibilityRole: 'radio', accessibilityLabel: 'Chest' }).props.onPress());
    expect(renderer.root.findByProps({ testID: 'measurement-headline-value' }).props.children).toBe('94 cm');
    expect(mockLineChartRender.mock.calls.at(-1)?.[0].series.map((item: { name: string }) => item.name)).toEqual(['Chest']);
  });

  it('filters the chart and the dated comparison together, including an empty range', () => {
    jest.useFakeTimers({ now: new Date(2026, 8, 24, 12) });
    try {
      const renderer = renderScreen();
      act(() => renderer.root.findByProps({ accessibilityRole: 'radio', accessibilityLabel: '1M' }).props.onPress());
      expect(renderer.root.findByProps({ testID: 'measurement-headline-value' }).props.children).toBe('82.5 cm');
      expect(renderer.root.findByProps({ testID: 'measurement-headline-change' }).props.children).toBe('First recorded value in this range');
      mockMeasurementQuery = { ...mockMeasurementQuery, data: [mockRows[1]] };
      act(() => renderer.update(<MeasurementsScreen />));
      expect(renderer.root.findByProps({ testID: 'measurement-headline-value' }).props.children).toBe('No recorded value');
      expect(renderer.root.findByProps({ children: 'No waist measurements in this range.' })).toBeTruthy();
    } finally { jest.useRealTimers(); }
  });

  it('keeps metric choices and timeframe controls reachable at large text', () => {
    const renderer = renderScreen();
    const group = renderer.root.findByProps({ accessibilityRole: 'radiogroup', accessibilityLabel: 'Timeframe' });
    expect(StyleSheet.flatten(group.props.style)).toMatchObject({ flexWrap: 'wrap' });
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Metric: Waist' }).props.onPress());
    const [choice] = renderer.root.findAll((node) => node.props.accessibilityRole === 'radio' && node.props.accessibilityLabel === 'Chest');
    const style = choice.props.style;
    expect(StyleSheet.flatten(typeof style === 'function' ? style({ pressed: false }) : style).minHeight).toBeGreaterThanOrEqual(44);
  });

  it('returns comparison choices to their own trigger after dismissal', () => {
    const renderer = renderScreen();
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Compare measurements' }).props.onPress());
    const choice = renderer.root.findByProps({ title: 'Compare measurements' });
    const returnFocusRef = choice.props.returnFocusRef;
    act(() => choice.props.onClose());
    const sheet = renderer.root.findAll((node) => node.props.returnFocusRef !== undefined)[0];
    expect(sheet.props.returnFocusRef === returnFocusRef).toBe(true);
  });

  it('explores earlier observations in the headline and keeps the comparison endpoints explicit', () => {
    const renderer = renderScreen();
    act(() => renderer.root.findByProps({ testID: 'measurement-list' }).props.onLayout({ nativeEvent: { layout: { height: 700 } } }));
    act(() => renderer.root.findByProps({ testID: 'measurement-progress-section' }).props.onLayout({ nativeEvent: { layout: { y: 20, height: 330 } } }));
    act(() => interactionCallbacks[0]?.());
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Previous date' }).props.onPress());
    expect(renderer.root.findByProps({ testID: 'measurement-headline-value' }).props.children).toBe('86 cm');
    expect(renderer.root.findByProps({ testID: 'measurement-headline-date' }).props.children).toBe('Recorded 1 Jul 2026');
    expect(renderer.root.findByProps({ testID: 'measurement-headline-change' }).props.children).toBe('First recorded value in this range');
  });

  it('starts a sparse comparison at the primary source date and reports missing values when exploring other dates', () => {
    mockMeasurementQuery = { ...mockMeasurementQuery, data: [{ ...mockRows[0], waist: null }, mockRows[1]] };
    const renderer = renderScreen();
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Compare measurements' }).props.onPress());
    act(() => renderer.root.findByProps({ accessibilityRole: 'radio', accessibilityLabel: 'Chest' }).props.onPress());
    act(() => renderer.root.findByProps({ testID: 'measurement-list' }).props.onLayout({ nativeEvent: { layout: { height: 700 } } }));
    act(() => renderer.root.findByProps({ testID: 'measurement-progress-section' }).props.onLayout({ nativeEvent: { layout: { y: 20, height: 330 } } }));
    act(() => interactionCallbacks[0]?.());
    expect(renderer.root.findByProps({ testID: 'measurement-headline-date' }).props.children).toBe('Recorded 1 Jul 2026');
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Next date' }).props.onPress());
    expect(renderer.root.findByProps({ testID: 'measurement-headline-value' }).props.children).toBe('Not reported');
    expect(renderer.root.findByProps({ children: 'No waist measurement on this date.' })).toBeTruthy();
  });

  it('passes dated missing observations to the chart instead of drawing zero', () => {
    mockMeasurementQuery = {
      data: [
        { ...mockRows[0], waist: null },
        { ...mockRows[1], id: 'middle-id', date: '2026-07-22', waist: 'invalid' },
        { ...mockRows[1] },
      ],
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    };
    const renderer = renderScreen();
    const list = renderer.root.findByProps({ testID: 'measurement-list' });
    const section = renderer.root.findByProps({ testID: 'measurement-progress-section' });
    act(() => list.props.onLayout({ nativeEvent: { layout: { height: 700 } } }));
    act(() => section.props.onLayout({ nativeEvent: { layout: { y: 20, height: 330 } } }));
    act(() => interactionCallbacks[0]?.());

    const props = mockLineChartRender.mock.calls[0]?.[0] as { series: { name: string; data: unknown[] }[] };
    expect(props.series.find((series) => series.name === 'Waist')?.data).toEqual([
      { date: '2026-07-01', value: 86 },
      { date: '2026-07-22', value: null },
      { date: '2026-08-29', value: null },
    ]);
    expect(
      renderer.root.findByProps({ testID: 'measurement-headline-date', children: 'Recorded 1 Jul 2026' }),
    ).toBeTruthy();
  });

  it('mounts the chart only after its section is visible and interactions finish', () => {
    const renderer = renderScreen();
    const list = renderer.root.findByProps({ testID: 'measurement-list' });
    const section = renderer.root.findByProps({ testID: 'measurement-progress-section' });

    act(() => list.props.onLayout({ nativeEvent: { layout: { height: 400 } } }));
    act(() => section.props.onLayout({ nativeEvent: { layout: { y: 520, height: 330 } } }));
    expect(interactionCallbacks).toHaveLength(0);

    act(() =>
      list.props.onScrollEndDrag({
        nativeEvent: { contentOffset: { y: 200 }, layoutMeasurement: { height: 400 } },
      }),
    );
    expect(interactionCallbacks).toHaveLength(1);
    expect(renderer.root.findAllByProps({ testID: 'measurement-chart' })).toHaveLength(0);

    act(() => interactionCallbacks[0]?.());
    expect(renderer.root.findByProps({ testID: 'measurement-chart' })).toBeTruthy();
    expect(mockLineChartRender).toHaveBeenCalledTimes(1);
  });

  it('uses stable measurement IDs as virtualized row keys', () => {
    const renderer = renderScreen();

    expect(renderer.root.findByProps({ testID: 'measurement-list' }).props.accessibilityHint).toBe(
      'latest-id,baseline-id',
    );
  });

  it('renders a shape-matched initial loading state', () => {
    mockMeasurementQuery = {
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: mockRefetch,
    };

    const renderer = renderScreen();

    const loading = renderer.root.findByProps({ testID: 'progress-skeleton' });
    expect(loading.props.accessibilityLabel).toBe('Loading measurement progress');
    expect(loading.props.accessibilityState).toEqual({ busy: true });
    expect(
      renderer.root.findAll(
        (node: { type?: unknown; props: { testID?: string } }) =>
          node.type === 'View' && node.props.testID === 'measurement-metric-skeleton',
      ),
    ).toHaveLength(1);
    const [chartSkeleton] = renderer.root.findAll(
      (node: { type?: unknown; props: { testID?: string } }) =>
        node.type === 'View' && node.props.testID === 'measurement-chart-skeleton',
    );
    if (!chartSkeleton) throw new Error('Measurement chart skeleton was not rendered');
    expect(
      StyleSheet.flatten(chartSkeleton.props.style),
    ).toMatchObject({ minHeight: 260 });
    expect(
      renderer.root.findAll(
        (node: { type?: unknown; props: { testID?: string } }) =>
          node.type === 'View' && node.props.testID === 'measurement-history-skeleton',
      ),
    ).toHaveLength(2);
  });

  it('offers a query retry when no measurement content is available', () => {
    mockMeasurementQuery = {
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    };
    const renderer = renderScreen();

    expect(renderer.root.findByProps({ children: 'Measurements' })).toBeTruthy();
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Retry' }).props.onPress());

    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('explains the baseline and opens the entry sheet from the empty action', () => {
    mockMeasurementQuery = {
      data: [],
      isLoading: false,
      isError: false,
      refetch: mockRefetch,
    };
    const renderer = renderScreen();

    expect(
      renderer.root.findByProps({
        children: 'Your first entry becomes the baseline every future week is compared against.',
      }),
    ).toBeTruthy();
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Add your first' }).props.onPress());
    expect(renderer.root.findByProps({ testID: 'measurement-sheet' })).toBeTruthy();
  });

  it('keeps cached measurement content visible when a refresh fails', () => {
    mockMeasurementQuery = {
      data: mockRows,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    };
    const renderer = renderScreen();

    expect(renderer.root.findByProps({ testID: 'history-latest-id' })).toBeTruthy();
    expect(renderer.root.findByProps({ accessibilityLabel: 'Retry' })).toBeTruthy();
  });

  it('keeps the baseline action available when an empty cached result fails to refresh', () => {
    mockMeasurementQuery = {
      data: [],
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    };
    const renderer = renderScreen();

    expect(renderer.root.findByProps({ accessibilityLabel: 'Add your first' })).toBeTruthy();
    expect(renderer.root.findByProps({ accessibilityLabel: 'Retry' })).toBeTruthy();
  });
});
