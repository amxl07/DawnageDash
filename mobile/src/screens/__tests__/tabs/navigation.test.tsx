import { act, create } from 'react-test-renderer';

import { hasCheckInExitGuard, requestCheckInTabExit } from '@/features/checkin/checkInExitGuard';
import TabsLayout from '../../../../app/(app)/(tabs)/_layout';

type ScreenProps = { name: string; options: { title?: string; href?: null } };
let mockLayoutProps: Record<string, unknown> = {};

jest.mock('expo-router/js-tabs', () => {
  const native = jest.requireActual('react-native');
  const Tabs = ({ children, ...props }: { children: React.ReactNode }) => {
    mockLayoutProps = props;
    return <native.View>{children}</native.View>;
  };
  Tabs.Screen = function MockTabScreen({ name, options }: ScreenProps) {
    return <native.View testID={`tab-${name}`} tabName={name} tabOptions={options} />;
  };
  return { Tabs };
});
jest.mock('expo-glass-effect', () => ({
  GlassView: () => null,
  isGlassEffectAPIAvailable: () => false,
  isLiquidGlassAvailable: () => false,
}));
jest.mock('lucide-react-native', () => ({
  CheckCircle2: () => null,
  Dumbbell: () => null,
  LayoutDashboard: () => null,
  UserRound: () => null,
  Utensils: () => null,
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }) }));
jest.mock('@/features/checkin/checkInExitGuard', () => ({
  hasCheckInExitGuard: jest.fn(),
  requestCheckInTabExit: jest.fn(),
}));
jest.mock('@/hooks/useDashboardData', () => ({ useDailyCheckIns: () => ({ data: [], isSuccess: true }) }));
jest.mock('@/hooks/useReducedTransparency', () => ({ useReducedTransparency: () => true }));
jest.mock('@/lib/dates', () => ({ localDateString: () => '2026-09-20' }));
jest.mock('@/theme', () => ({
  fonts: { interMedium: 'Inter' },
  iconSize: { md: 20 },
  radius: { pill: 999 },
  useTheme: () => ({
    colors: {
      background: '#fff', card: '#fff', border: '#ddd', mutedForeground: '#666',
      onPrimary: '#fff', primary: '#f66', primaryFill: '#f66', primarySoft: '#fee',
    },
    isDark: false,
  }),
}));

describe('daily journey tab navigation', () => {
  beforeEach(() => jest.clearAllMocks());
  it('shows only Home, Check In, Training, Nutrition and You', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<TabsLayout />); });
    const screens = renderer.root.findAll((node) => typeof node.type === 'string' && node.props.testID?.startsWith('tab-'));
    const visible = screens.filter((node) => node.props.tabOptions.href !== null);

    expect(visible.map((node) => node.props.tabName)).toEqual(['index', 'check-in', 'plans', 'nutrition', 'more']);
    expect(visible.map((node) => node.props.tabOptions.title)).toEqual(['Home', 'Check In', 'Training', 'Nutrition', 'You']);
    expect(renderer.root.findByProps({ testID: 'tab-logs' }).props.tabOptions.href).toBeNull();
  });

  it.each(['plans', 'nutrition'])('runs the existing check-in exit guard before opening %s', (destination) => {
    jest.mocked(hasCheckInExitGuard).mockReturnValue(true);
    const navigate = jest.fn();
    const preventDefault = jest.fn();
    act(() => { create(<TabsLayout />); });
    const screenListeners = mockLayoutProps.screenListeners as (input: {
      navigation: { navigate: (name: string) => void };
      route: { name: string };
    }) => { tabPress: (event: { preventDefault: () => void }) => void };

    screenListeners({ navigation: { navigate }, route: { name: destination } }).tabPress({ preventDefault });
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(requestCheckInTabExit).toHaveBeenCalledTimes(1);
    const continueNavigation = jest.mocked(requestCheckInTabExit).mock.calls[0][0];
    continueNavigation();
    expect(navigate).toHaveBeenCalledWith(destination);
  });
});
