import { StyleSheet, Text as NativeText, View } from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import DashboardScreen from '../../../../app/(app)/(tabs)/index';

const MockView = View;
const MockNativeText = NativeText;
const mockUseDashboardData = jest.fn();
const mockUseCoach = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: { full_name: 'Ada Lovelace' } }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('lucide-react-native', () => ({
  ChevronDown: () => null,
  Flame: () => null,
  Trophy: () => null,
  Weight: () => null,
  Zap: () => null,
}));
jest.mock('expo-image', () => ({ Image: 'ExpoImage' }));

jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: ({ children }: { children: React.ReactNode }) => <>{children}</> },
  Easing: { bezier: () => undefined },
  FadeIn: { duration: () => undefined },
  useAnimatedStyle: () => ({}),
  useSharedValue: (value: number) => ({ value }),
  withTiming: (value: number) => value,
}));

jest.mock('@/components/brand', () => ({ DawnGlow: () => null, Logo: () => null }));
jest.mock('@/components/charts', () => ({ BarChart: () => null, DonutChart: () => null, LineChart: () => null }));
jest.mock('@/components/dashboard/CheckInHistorySheet', () => ({ CheckInHistorySheet: () => null }));
jest.mock('@/components/dashboard/ConsistencyGrid', () => ({ ConsistencyGrid: () => null }));
jest.mock('@/components/dashboard/MetricCard', () => ({
  MetricCard: ({ label }: { label: string }) => <MockView testID={`metric-${label}`} />,
}));
jest.mock('@/components/dashboard/StreakHero', () => ({ StreakHero: () => null }));
jest.mock('@/components/dashboard/TodayActionCard', () => ({
  TodayActionCard: () => <MockView testID="today-action" />,
}));
jest.mock('@/components/dashboard/WeekStrip', () => ({ WeekStrip: () => null }));

jest.mock('@/components/ui', () => {
  const { AdaptiveGrid } = jest.requireActual('@/components/ui/AdaptiveGrid');
  return {
    AdaptiveGrid,
    Card: ({ children, ...props }: React.ComponentProps<typeof MockView>) => <MockView {...props}>{children}</MockView>,
    EmptyState: () => null,
    ErrorState: () => null,
    ProgressBar: () => null,
    Screen: ({ children }: { children: React.ReactNode }) => <MockView>{children}</MockView>,
    SkeletonCard: () => null,
    Stagger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Text: ({ children, ...props }: React.ComponentProps<typeof NativeText>) => (
      <MockNativeText {...props}>{children}</MockNativeText>
    ),
  };
});

jest.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
jest.mock('@/hooks/useDashboardData', () => ({
  useDashboardData: () => mockUseDashboardData(),
}));
jest.mock('@/hooks/useCoach', () => ({
  useCoach: () => mockUseCoach(),
  coachInitials: (name: string | null | undefined) =>
    name
      ? name
          .trim()
          .split(/\s+/)
          .map((part) => part[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : '—',
}));

function dashboardData(overrides: Record<string, unknown> = {}) {
  return {
    checkIns: [{ workout_status: 'done', daily_steps: 9000, nutrition_score: 8, sleep_hours: 7 }],
    metrics: { currentWeight: 75.2, totalWorkouts: 8, avgNutritionScore: '8.1', avgEnergyLevel: 7 },
    processed: [{ dateString: '2026-08-30', status: 'done', dayNumber: 1 }],
    weightTrend: -0.4,
    weightChartData: [],
    performanceChartData: [],
    nutritionBreakdown: { protein: 0, carbs: 0, fats: 0 },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    isRefetching: false,
    ...overrides,
  };
}
jest.mock('@/hooks/usePlans', () => ({ useWorkoutPlan: () => ({ data: { days: [] } }) }));
jest.mock('@/hooks/usePlanProvenance', () => ({ usePlanProvenance: () => ({ hasChanged: false }) }));
jest.mock('@/hooks/useResponsiveLayout', () => ({
  useResponsiveLayout: () => ({ isCompact: true }),
}));
jest.mock('@/lib/today-action', () => ({ resolveTodayAction: () => ({ route: '/(app)/(tabs)/check-in' }) }));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/lib/streak', () => ({ buildWeekStrip: () => [], calculateStreak: () => 1 }));
jest.mock('@/lib/dates', () => ({ localDateString: () => '2026-08-30' }));
jest.mock('@/types/db', () => ({ num: (value: number | null) => value ?? 0 }));
jest.mock('@/theme', () => ({
  iconSize: { md: 20 },
  radius: { card: 20, pill: 999 },
  spacing: { xs: 4, sm: 8, md: 16, base: 20, lg: 24 },
  useMotion: () => ({
    duration: { feedback: 160, enter: 200 },
    easing: { standard: [0.16, 1, 0.3, 1] },
    enabled: false,
  }),
  useTheme: () => ({
    colors: {
      background: '#fff',
      border: '#ddd',
      borderStrong: '#bbb',
      card: '#fff',
      elevated: '#eee',
      mutedForeground: '#666',
      primary: '#00f',
      success: '#080',
      gold: '#fc0',
    },
  }),
}));

function render(ui: React.ReactElement) {
  let renderer: ReturnType<typeof create>;
  act(() => {
    renderer = create(ui);
  });
  return renderer!;
}

describe('DashboardScreen', () => {
  beforeEach(() => {
    mockUseDashboardData.mockReset();
    mockUseDashboardData.mockReturnValue(dashboardData());
    mockUseCoach.mockReset();
    mockUseCoach.mockReturnValue({
      data: {
        kind: 'assigned',
        coach: {
          id: 'coach-1',
          full_name: 'Alexandria Catherine Montgomery-Wellington',
          avatar_url: null,
        },
      },
    });
  });

  it('places Weight and Workouts in separate compact AdaptiveGrid item wrappers', () => {
    const renderer = render(<DashboardScreen />);

    const [grid] = renderer.root.findAll(
      (candidate: { type?: unknown; props: { testID?: string; style?: unknown } }) =>
        candidate.type === 'View' && candidate.props.testID === 'home-primary-metrics',
    );
    if (!grid) throw new Error('Home primary metrics grid was not rendered');
    expect(StyleSheet.flatten(grid.props.style)).toMatchObject({ flexDirection: 'column' });

    const wrappers = grid.children;
    expect(wrappers).toHaveLength(2);
    expect(wrappers[0].findByProps({ testID: 'metric-Weight' })).toBeTruthy();
    expect(wrappers[1].findByProps({ testID: 'metric-Workouts' })).toBeTruthy();
  });

  it('keeps a compact coach status in the populated greeting without displacing the primary action', () => {
    const renderer = render(<DashboardScreen />);
    const badge = renderer.root.findByProps({
      accessibilityLabel: 'Your coach: Alexandria Catherine Montgomery-Wellington',
    });
    const avatar = badge.findAllByType(View).find((node: { props: { style?: unknown } }) => {
      const style = StyleSheet.flatten(node.props.style) as
        | { width?: number; height?: number }
        | undefined;
      return style?.width === 28 && style?.height === 28;
    });

    expect(avatar).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'today-action' })).toBeTruthy();
  });

  it('keeps the compact coach status in the empty-data greeting branch', () => {
    mockUseDashboardData.mockReturnValue(
      dashboardData({ checkIns: [], processed: [], weightChartData: [], performanceChartData: [] }),
    );

    const renderer = render(<DashboardScreen />);

    expect(
      renderer.root.findByProps({
        accessibilityLabel: 'Your coach: Alexandria Catherine Montgomery-Wellington',
      }),
    ).toBeTruthy();
    expect(renderer.root.findByProps({ testID: 'today-action' })).toBeTruthy();
  });
});
