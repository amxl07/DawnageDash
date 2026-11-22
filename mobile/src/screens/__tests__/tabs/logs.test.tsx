import NetInfo from '@react-native-community/netinfo';
import { useFocusEffect } from 'expo-router/react-navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { AppState, Text as NativeText } from 'react-native';

import { act, create } from 'react-test-renderer';

import { useAuth } from '@/contexts/AuthContext';
import { flushOutbox, readOutbox } from '@/lib/outbox';
import { LogCard, WorkoutHistory } from '@/features/training/workout-history';

jest.mock('@react-native-community/netinfo', () => ({ addEventListener: jest.fn(() => jest.fn()) }));
jest.mock('expo-router/react-navigation', () => ({
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
jest.mock('@/components/ui/DisclosureChevron', () => {
  const native = jest.requireActual('react-native');
  return {
    DisclosureChevron: ({ expanded }: { expanded: boolean }) => (
      <native.View testID="log-disclosure-chevron" accessibilityState={{ expanded }} />
    ),
  };
});
jest.mock('@/components/ui/MotionReveal', () => {
  const native = jest.requireActual('react-native');
  return {
    MotionReveal: ({ children, ...props }: React.ComponentProps<typeof native.View>) => (
      <native.View {...props}>{children}</native.View>
    ),
  };
});
jest.mock('@/components/dashboard/MetricCard', () => ({ MetricCard: () => null }));
jest.mock('@/components/ui', () => {
  const native = jest.requireActual('react-native');
  return {
    AdaptiveGrid: native.View,
    AnimatedFlatList: native.FlatList,
    Button: ({ label, onPress }: { label: string; onPress: () => void }) => (
      <native.Pressable accessibilityLabel={label} onPress={onPress}>
        <native.Text>{label}</native.Text>
      </native.Pressable>
    ),
    Card: native.View,
    EmptyState: () => null,
    ErrorState: () => null,
    Screen: native.View,
    SkeletonCard: () => null,
    StatusPill: ({ label }: { label: string }) => <native.Text>{label}</native.Text>,
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
  useTheme: () => ({ colors: { border: '#ddd', mutedForeground: '#666', pressed: '#eee' } }),
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

  it('uses exercise tracking instead of a stale blank duration field for strength rows', () => {
    const lines = expandedText(
      JSON.stringify({
        version: 2,
        planDayNumber: 1,
        exercises: [
          {
            name: 'Deadlift',
            tracking: 'weight-reps',
            sets: [
              {
                setNumber: 1,
                reps: '5',
                weight: '100',
                rpe: '',
                duration: '',
                kind: 'work',
                completed: true,
              },
              {
                setNumber: 2,
                reps: '',
                weight: '',
                rpe: '',
                duration: '',
                kind: 'work',
                completed: false,
              },
            ],
          },
        ],
      }),
    );

    expect(lines).toContainEqual(expect.objectContaining({ children: 'Set 2: — kg × —' }));
    expect(lines.map((line) => String(line.children)).join(' ')).not.toContain('— sec');
  });
});

describe('WorkoutHistory outbox ownership', () => {
  const mounted = new Set<ReturnType<typeof create>>();
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAuth).mockReturnValue({ user: { id: 'user-1' } } as never);
    jest.mocked(useRouter).mockReturnValue({ push: jest.fn() } as never);
    jest.mocked(useQueryClient).mockReturnValue({ invalidateQueries: jest.fn() } as never);
    jest.mocked(useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as never);
    jest.mocked(readOutbox).mockResolvedValue([]);
    jest.mocked(flushOutbox).mockResolvedValue(0);
    jest.mocked(useFocusEffect).mockImplementation((callback) => { jest.requireActual<typeof import('react')>('react').useEffect(callback, [callback]); });
    jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
  });

  afterEach(() => { for (const renderer of mounted) act(() => renderer.unmount()); mounted.clear(); jest.restoreAllMocks(); });

  it('reads and flushes pending workouts for only the authenticated user', async () => {
    let connectivityListener: ((state: { isConnected: boolean }) => void) | undefined;
    jest.mocked(NetInfo.addEventListener).mockImplementation((listener) => {
      connectivityListener = listener as (state: { isConnected: boolean }) => void;
      return jest.fn();
    });

    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<WorkoutHistory />); mounted.add(renderer);
      await Promise.resolve();
    });

    expect(readOutbox).toHaveBeenCalledWith('user-1');

    await act(async () => {
      connectivityListener?.({ isConnected: true });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(flushOutbox).toHaveBeenCalledWith('user-1');
    expect(readOutbox).not.toHaveBeenCalledWith('user-2');
    act(() => renderer.unmount());
  });

  it('shows queued and blocked workouts separately and routes each preserved record', async () => {
    const push = jest.fn();
    jest.mocked(useRouter).mockReturnValue({ push } as never);
    jest.mocked(readOutbox).mockResolvedValue([
      {
        id: 'user-1:2026-09-10', user_id: 'user-1', date: '2026-09-10',
        title: 'Queued legs', content: '{}', existingLogId: 'log-7', queuedAt: 1, revision: 3,
        failure: { kind: 'transport', retryable: true, code: 'network-request-failed' },
      },
      {
        id: 'user-1:2026-09-11', user_id: 'user-1', date: '2026-09-11',
        title: 'Blocked push', content: '{}', existingLogId: null, queuedAt: 2, revision: 2,
        failure: { kind: 'validation', retryable: false, code: '22p02' },
      },
    ]);

    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<WorkoutHistory />); mounted.add(renderer);
      await Promise.resolve();
      await Promise.resolve();
    });

    const text = renderer.root.findAllByType(NativeText)
      .map((node: { props: { children?: unknown } }) => String(node.props.children))
      .join(' ');
    expect(text).toContain('Queued legs');
    expect(text).toContain('Waiting to sync');
    expect(text).toContain('Blocked push');
    expect(text).toContain('Needs attention');

    act(() => renderer.root.findByProps({
      accessibilityLabel: 'Open saved workout Queued legs from 2026-09-10',
    }).props.onPress());
    expect(push).toHaveBeenCalledWith({
      pathname: '/(app)/logger',
      params: { date: '2026-09-10', logId: 'log-7', outboxId: 'user-1:2026-09-10' },
    });

    act(() => renderer.root.findByProps({
      accessibilityLabel: 'Review blocked workout Blocked push from 2026-09-11',
    }).props.onPress());
    expect(push).toHaveBeenCalledWith({
      pathname: '/(app)/logger',
      params: { date: '2026-09-11', logId: '', outboxId: 'user-1:2026-09-11' },
    });
  });

  it('shows a recoverable local-record error when outbox storage cannot be read', async () => {
    jest.mocked(readOutbox).mockRejectedValue(new Error('corrupt local queue'));

    let renderer!: ReturnType<typeof create>;
    await act(async () => {
      renderer = create(<WorkoutHistory />); mounted.add(renderer);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(renderer.root.findByProps({ children: "Couldn't read workouts saved on this device." })).toBeTruthy();
    expect(renderer.root.findByProps({ accessibilityLabel: 'Reload saved workouts' })).toBeTruthy();
  });
  it('keeps local records visible while remote history is unavailable', async () => {
    jest.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: jest.fn() } as never);
    jest.mocked(readOutbox).mockResolvedValue([{ id: 'q', user_id: 'user-1', date: '2026-09-10', title: 'Offline workout', content: '{}', existingLogId: null, queuedAt: 1 }]);
    let renderer!: ReturnType<typeof create>;
    await act(async () => { renderer = create(<WorkoutHistory />); mounted.add(renderer); await Promise.resolve(); });
    expect(renderer.root.findByProps({ children: 'Offline workout' })).toBeTruthy();
  });
  it('keeps local read-error recovery visible while remote history also fails', async () => {
    jest.mocked(useQuery).mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: jest.fn() } as never);
    jest.mocked(readOutbox).mockRejectedValue(new Error('unreadable'));
    let renderer!: ReturnType<typeof create>;
    await act(async () => { renderer = create(<WorkoutHistory />); mounted.add(renderer); await Promise.resolve(); });
    expect(renderer.root.findByProps({ accessibilityLabel: 'Reload saved workouts' })).toBeTruthy();
  });
  it('hides previous-account local details while the next account read is pending', async () => {
    jest.mocked(readOutbox).mockResolvedValue([{ id: 'q', user_id: 'user-1', date: '2026-09-10', title: 'Private workout', content: '{}', existingLogId: null, queuedAt: 1 }]);
    let renderer!: ReturnType<typeof create>;
    await act(async () => { renderer = create(<WorkoutHistory />); mounted.add(renderer); await Promise.resolve(); });
    jest.mocked(useAuth).mockReturnValue({ user: { id: 'user-2' } } as never);
    jest.mocked(readOutbox).mockImplementation(() => new Promise(() => {}));
    await act(async () => { renderer.update(<WorkoutHistory />); });
    expect(renderer.root.findAllByProps({ children: 'Private workout' })).toHaveLength(0);
    jest.mocked(useAuth).mockReturnValue({ user: null } as never);
    await act(async () => { renderer.update(<WorkoutHistory />); });
    expect(renderer.root.findAllByProps({ children: 'Private workout' })).toHaveLength(0);
  });

});
