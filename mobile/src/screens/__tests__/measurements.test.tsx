import {
  InteractionManager,
  Pressable as MockPressable,
  StyleSheet,
  Text as NativeText,
  View,
} from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
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
const mockRows = [
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
  data: typeof mockRows | undefined;
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
}));

jest.mock('@/components/charts', () => ({
  LineChart: (props: Record<string, unknown>) => {
    mockLineChartRender(props);
    return <MockView testID="measurement-chart" />;
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
}));

jest.mock('@/hooks/useMeasurements', () => ({
  useMeasurements: () => mockMeasurementQuery,
}));

jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: jest.fn(),
}));

jest.mock('@/theme', () => ({
  iconSize: { md: 20 },
  spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 24 },
  useTheme: () => ({
    colors: {
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

  it('stacks primary metrics and baseline comparisons for compact or large text', () => {
    const renderer = renderScreen();
    const [grid] = renderer.root.findAll(
      (node: { type?: unknown; props: { testID?: string; style?: unknown } }) =>
        node.type === 'View' &&
        node.props.testID === 'measurement-primary-metrics' &&
        node.props.style !== undefined,
    );
    if (!grid) throw new Error('Measurement metric grid was not rendered');

    expect(StyleSheet.flatten(grid.props.style)).toMatchObject({ flexDirection: 'column' });
    expect(StyleSheet.flatten(renderer.root.findByProps({ testID: 'measurement-comparison-waist' }).props.style))
      .toMatchObject({ flexDirection: 'column' });
  });

  it('keeps every chart-series filter at least 44 points high', () => {
    const renderer = renderScreen();
    const labels = ['Chest series', 'Waist series', 'Hips series', 'Thighs series', 'Arms series'];
    const filters = labels.map((label) => {
      const [filter] = renderer.root.findAll(
        (node: { props: { accessibilityLabel?: string; style?: unknown } }) =>
          node.props.accessibilityLabel === label &&
          (StyleSheet.flatten(node.props.style) as Record<string, unknown> | undefined)?.minHeight !==
            undefined,
      );
      if (!filter) throw new Error(`No styled filter found for ${label}`);
      return filter;
    });

    expect(filters).toHaveLength(5);
    for (const filter of filters) {
      expect(StyleSheet.flatten(filter.props.style)).toMatchObject({ minHeight: 44 });
    }
  });

  it('presents latest value, change, and recorded date before mounting the chart', () => {
    const renderer = renderScreen();

    expect(renderer.root.findByProps({ children: 'Latest entry · recorded 29 Aug 2026' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'Waist: 82.5 cm · down 3.5 cm from baseline' })).toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: 'measurement-chart' })).toHaveLength(0);
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
    ).toHaveLength(3);
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
