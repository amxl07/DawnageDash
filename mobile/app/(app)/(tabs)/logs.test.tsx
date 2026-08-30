import { Text as NativeText } from 'react-native';

// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import { LogCard } from './logs';

jest.mock('@react-native-community/netinfo', () => ({ addEventListener: jest.fn(() => jest.fn()) }));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  useScrollToTop: jest.fn(),
}));
jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn(), useQueryClient: jest.fn() }));
jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('lucide-react-native', () => ({
  CalendarDays: () => null,
  ChevronDown: () => null,
  Dumbbell: () => null,
  Plus: () => null,
}));
jest.mock('react-native-reanimated', () => {
  const native = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View: native.View },
    FadeInDown: { duration: jest.fn() },
    FadeOutUp: { duration: jest.fn() },
    LinearTransition: { duration: jest.fn() },
  };
});
jest.mock('@/components/dashboard/MetricCard', () => ({ MetricCard: () => null }));
jest.mock('@/components/ui', () => {
  const native = jest.requireActual('react-native');
  return {
    AdaptiveGrid: native.View,
    AnimatedFlatList: native.FlatList,
    Button: () => null,
    Card: native.View,
    EmptyState: () => null,
    ErrorState: () => null,
    Screen: native.View,
    SkeletonCard: () => null,
    StatusPill: () => null,
    Text: native.Text,
    useListMotion: () => ({ enabled: false }),
  };
});
jest.mock('@/contexts/AuthContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/lib/outbox', () => ({ flushOutbox: jest.fn(), readOutbox: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: {} }));
jest.mock('@/theme', () => ({
  iconSize: { md: 20 },
  spacing: { xs: 4, sm: 8, md: 12, base: 16 },
  useTheme: () => ({ colors: { border: '#ddd', mutedForeground: '#666' } }),
}));

function expandedText(content: string) {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(
      <LogCard
        log={{ id: 'log-1', date: '2026-08-30', title: 'Mixed session', content }}
        onEdit={jest.fn()}
      />,
    );
  });
  const disclosure = renderer.root.find(
    (node: { props: { accessibilityState?: { expanded?: boolean } } }) =>
      node.props.accessibilityState?.expanded === false,
  );
  act(() => disclosure.props.onPress());
  const lines: { children: unknown; accessibilityLabel?: string }[] = renderer.root.findAllByType(NativeText).map(
    (node: { props: { children?: unknown; accessibilityLabel?: string } }) => ({
      children: Array.isArray(node.props.children)
        ? node.props.children.join('')
        : node.props.children,
      accessibilityLabel: node.props.accessibilityLabel,
    }),
  );
  return lines;
}

describe('LogCard set history', () => {
  it('renders duration sets as time and keeps completed warm-up identity visible and semantic', () => {
    const lines = expandedText(
      JSON.stringify({
        version: 2,
        planDayNumber: 1,
        exercises: [
          {
            name: 'Plank',
            tracking: 'duration',
            sets: [
              { setNumber: 1, duration: '45', kind: 'warmup', completed: true },
              { setNumber: 2, duration: '30', kind: 'work', completed: false },
            ],
          },
        ],
      }),
    );

    expect(lines).toContainEqual(
      expect.objectContaining({
        children: 'Warm-up 1: 45 sec · Completed',
        accessibilityLabel: 'Warm-up 1, 45 seconds, completed',
      }),
    );
    expect(lines).toContainEqual(
      expect.objectContaining({ children: 'Set 2: 30 sec' }),
    );
    expect(lines.map((line) => String(line.children)).join(' ')).not.toContain('kg ×');
  });

  it('keeps warm-up identity on weight and repetition history rows', () => {
    const lines = expandedText(
      JSON.stringify({
        version: 2,
        planDayNumber: 1,
        exercises: [
          {
            name: 'Squat',
            tracking: 'weight-reps',
            sets: [
              {
                setNumber: 1,
                reps: '10',
                weight: '20',
                rpe: '',
                kind: 'warmup',
                completed: true,
              },
            ],
          },
        ],
      }),
    );

    expect(lines).toContainEqual(
      expect.objectContaining({
        children: 'Warm-up 1: 20 kg × 10 · Completed',
        accessibilityLabel: 'Warm-up 1, 20 kilograms by 10 repetitions, completed',
      }),
    );
  });
});
