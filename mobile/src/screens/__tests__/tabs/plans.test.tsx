import { act, create } from 'react-test-renderer';
import { Button } from '@/components/ui';

import PlansScreen from '../../../../app/(app)/(tabs)/plans';

const mockMarkSeen = jest.fn();
const mockPush = jest.fn();
const mockSetParams = jest.fn();
const mockPlanRefetch = jest.fn();
const mockProgressRefetch = jest.fn();
let mockView: string | undefined;
let mockProvenanceReady = false;
let mockWorkoutPlanLoading = false;
let mockWorkoutPlanError = false;
let mockWorkoutPlanMissing = false;
let mockNoAssignment = false;
let mockPlanSource: 'user' | 'template' = 'user';
let mockProgressError = false;
let mockProgressLoading = false;
let mockProfileError = false;
let mockProfileLoading = false;
let mockProfileFetching = false;
let mockPlanFetching = false;
let mockProgressFetching = false;
let mockProfileFetchStatus: 'idle' | 'fetching' | 'paused' = 'idle';
let mockPlanFetchStatus: 'idle' | 'fetching' | 'paused' = 'idle';
let mockProgressFetchStatus: 'idle' | 'fetching' | 'paused' = 'idle';
let mockStatuses: Record<number, 'today' | 'active' | 'complete' | 'upcoming'> = { 1: 'today', 2: 'upcoming' };

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ view: mockView }),
  useRouter: () => ({ push: mockPush, setParams: mockSetParams }),
}));
jest.mock('lucide-react-native', () => ({ ClipboardList: () => null }));
jest.mock('@/components/coach/CoachBadge', () => ({ CoachBadge: () => null }));
jest.mock('@/components/plans/ExercisePrescriptionSheet', () => {
  const native = jest.requireActual('react-native');
  return {
    ExercisePrescriptionSheet: ({ visible, exercise }: {
      visible: boolean;
      exercise: { name: string; restSeconds?: number; videoLink?: string; substitutions: unknown[] } | null;
    }) => visible ? (
      <native.View
        testID="exercise-prescription"
        accessibilityLabel={`${exercise?.name}:${exercise?.restSeconds}:${exercise?.videoLink}:${exercise?.substitutions.length}`}
      />
    ) : null,
  };
});
jest.mock('@/components/plans/PlanDayCard', () => {
  const native = jest.requireActual('react-native');
  return {
    PlanDayCard: ({ day, onShowDetails, onStart, status }: {
      onStart?: () => void;
      day: { day_number: number; exercises: { id: string; name: string }[] };
      status: string;
      onShowDetails: (exercise: { id: string; name: string }) => void;
    }) => (
      <native.View testID={`plan-day-${day.day_number}`}>
        <native.Text>{`Day ${day.day_number} status ${status}`}</native.Text>
        {onStart ? <native.Pressable accessibilityLabel={`Start Day ${day.day_number}`} onPress={onStart} /> : null}
        {day.exercises.map((exercise) => (
          <native.Pressable
            key={exercise.id}
            accessibilityRole="button"
            accessibilityLabel={`Show details for ${exercise.name}`}
            onPress={() => onShowDetails(exercise)}
            style={{ minWidth: 48, minHeight: 48 }}
          />
        ))}
      </native.View>
    ),
  };
});
jest.mock('@/features/training/workout-history', () => {
  const native = jest.requireActual('react-native');
  return { WorkoutHistory: ({ header }: { header?: React.ReactNode }) => <native.View testID="history-list-owner">{header}</native.View> };
});
jest.mock('@/components/ui/DisclosureChevron', () => {
  const native = jest.requireActual('react-native');
  return { DisclosureChevron: ({ expanded }: { expanded: boolean }) => <native.View accessibilityState={{ expanded }} /> };
});
jest.mock('@/components/ui/MotionReveal', () => {
  const native = jest.requireActual('react-native');
  return { MotionReveal: ({ children, ...props }: React.ComponentProps<typeof native.View>) => <native.View {...props}>{children}</native.View> };
});
jest.mock('@/components/ui', () => {
  const native = jest.requireActual('react-native');
  return {
    Button: ({ label, onPress }: { label: string; onPress: () => void }) => (
      <native.Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>
        <native.Text>{label}</native.Text>
      </native.Pressable>
    ),
    Card: native.View,
    EmptyState: () => null,
    ErrorState: ({ onRetry, retryLabel = 'Retry' }: { onRetry: () => void; retryLabel?: string }) => (
      <native.Pressable accessibilityRole="button" accessibilityLabel={retryLabel} onPress={onRetry} />
    ),
    Screen: native.View,
    SegmentedControl: ({ onChange, segments }: {
      onChange: (value: string) => void;
      segments: { value: string; label: string }[];
    }) => (
      <native.View>
        {segments.map((segment) => (
          <native.Pressable
            key={segment.value}
            accessibilityRole="tab"
            accessibilityLabel={segment.label}
            onPress={() => onChange(segment.value)}
          />
        ))}
      </native.View>
    ),
    SkeletonCard: () => null,
    Text: native.Text,
  };
});
jest.mock('@/hooks/usePlans', () => ({
  useUserProfile: () => ({
    data: {
      active_workout_plan: mockNoAssignment ? null : JSON.stringify({
        level: 'beginner', workoutType: 'strength', subCategory: null, daysPerWeek: 2,
      }),
      training_note: null,
      cardio_note: 'Walk after lunch.',
      steps_note: 'Aim for 8000 steps.',
    },
    isLoading: mockProfileLoading,
    isFetching: mockProfileFetching,
    fetchStatus: mockProfileFetchStatus,
    isError: mockProfileError,
    refetch: jest.fn(),
  }),
  useWorkoutPlan: () => ({
    data: mockWorkoutPlanMissing ? undefined : {
      source: mockPlanSource,
      days: [
        {
          id: 'day-1', day_number: 1, focus: 'Full body', notes: 'Keep the tempo controlled.',
          updated_at: '2026-08-29T10:00:00.000Z',
          exercises: [{
            id: 'squat', name: 'Squat', sets: 3, reps: '8', warmupSets: 1,
            restSeconds: 90, notes: 'Leave two reps in reserve.', videoLink: 'https://example.com/squat',
            substitutions: [{ id: 'goblet', name: 'Goblet squat', sets: 3, reps: '10', warmupSets: 0, substitutions: [] }],
          }],
        },
        {
          id: 'day-2', day_number: 2, focus: 'Upper body', notes: null,
          updated_at: '2026-08-29T10:00:00.000Z',
          exercises: [{ id: 'press', name: 'Press', sets: 3, reps: '10', warmupSets: 0, substitutions: [] }],
        },
      ],
    },
    isLoading: mockWorkoutPlanLoading,
    isFetching: mockPlanFetching,
    fetchStatus: mockPlanFetchStatus,
    isError: mockWorkoutPlanError,
    refetch: mockPlanRefetch,
  }),
}));
jest.mock('@/hooks/usePlanProgress', () => ({
  usePlanProgress: () => ({
    statuses: mockStatuses,
    isLoading: mockProgressLoading,
    isFetching: mockProgressFetching,
    fetchStatus: mockProgressFetchStatus,
    isError: mockProgressError,
    refetch: mockProgressRefetch,
  }),
}));
jest.mock('@/hooks/usePlanProvenance', () => ({
  relativeDays: () => 'today',
  usePlanProvenance: () => ({
    hasChanged: false,
    markSeen: (...args: unknown[]) => mockMarkSeen(...args),
    ready: mockProvenanceReady,
    updatedAt: '2026-08-29T10:00:00.000Z',
  }),
}));
jest.mock('@/lib/workout-constants', () => ({ formatTypeLabel: (value: string) => value }));
jest.mock('@/theme', () => ({
  HIT_SLOP_MIN: 48,
  iconSize: { md: 20 },
  radius: { md: 12 },
  spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 24 },
  useTheme: () => ({ colors: { border: '#ddd', primary: '#05f', primarySoft: '#eef' } }),
}));

describe('Training route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockView = undefined;
    mockProvenanceReady = false;
    mockWorkoutPlanLoading = false;
    mockWorkoutPlanError = false;
    mockWorkoutPlanMissing = false;
    mockNoAssignment = false;
    mockProgressError = false;
    mockProgressLoading = false;
    mockProfileError = false;
    mockProfileLoading = false;
    mockProfileFetching = false;
    mockPlanFetching = false;
    mockProgressFetching = false;
    mockProfileFetchStatus = 'idle';
    mockPlanFetchStatus = 'idle';
    mockProgressFetchStatus = 'idle';
    mockStatuses = { 1: 'today', 2: 'upcoming' };
    mockPlanSource = 'user';
  });

  it('keeps cardio and steps guidance accessible without a plan assignment', () => {
    mockNoAssignment = true;
    mockWorkoutPlanMissing = true;
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<PlansScreen />); });
    expect(renderer.root.findByProps({ children: 'Walk after lunch.' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'Aim for 8000 steps.' })).toBeTruthy();
  });

  it('opens Plan by default and exposes Plan and History as its only views', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<PlansScreen />); });
    expect(renderer.root.findByProps({ children: 'Training' })).toBeTruthy();
    expect(renderer.root.findByProps({ accessibilityLabel: 'Plan' })).toBeTruthy();
    expect(renderer.root.findByProps({ accessibilityLabel: 'History' })).toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: 'history-list-owner' })).toHaveLength(0);
  });

  it('lets explicit route params override a previously selected History view', () => {
    mockView = 'history';
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<PlansScreen />); });
    expect(renderer.root.findByProps({ testID: 'history-list-owner' })).toBeTruthy();
    mockView = 'plan';
    act(() => { renderer.update(<PlansScreen />); });
    expect(renderer.root.findAllByProps({ testID: 'history-list-owner' })).toHaveLength(0);
    expect(renderer.root.findByProps({ children: 'Assigned plan' })).toBeTruthy();
  });

  it('uses the history FlatList owner when History is selected', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<PlansScreen />); });
    act(() => renderer.root.findByProps({ accessibilityLabel: 'History' }).props.onPress());
    expect(renderer.root.findByProps({ testID: 'history-list-owner' })).toBeTruthy();
    expect(mockSetParams).toHaveBeenCalledWith({ view: 'history' });
  });

  it('shows the focused assigned session with prescription and a direct start action', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<PlansScreen />); });
    expect(renderer.root.findByProps({ children: 'Next session' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'Full body' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'Squat · 3 × 8' })).toBeTruthy();
    expect(renderer.root.findAllByProps({ testID: 'plan-day-1' })).toHaveLength(0);
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Start Day 1' }).props.onPress());
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/(app)/logger', params: { day: '1' } });
  });

  it('opens the focused session full prescription and preserves detailed exercise access', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<PlansScreen />); });
    act(() => renderer.root.findByProps({ accessibilityLabel: 'View exercises for Day 1' }).props.onPress());

    expect(renderer.root.findByProps({ children: 'Keep the tempo controlled.' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'Leave two reps in reserve.' })).toBeTruthy();
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Show details for Squat' }).props.onPress());
    expect(renderer.root.findByProps({ testID: 'exercise-prescription' }).props.accessibilityLabel)
      .toBe('Squat:90:https://example.com/squat:1');
  });

  it('uses Continue for an active draft and keeps a single focused action', () => {
    mockStatuses = { 1: 'active', 2: 'upcoming' };
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<PlansScreen />); });

    expect(renderer.root.findByProps({ accessibilityLabel: 'Continue Day 1' })).toBeTruthy();
    expect(renderer.root.findAllByProps({ accessibilityLabel: 'Start Day 1' })).toHaveLength(0);
    expect(renderer.root.findAllByType(Button).filter((button) => button.props.label === 'Continue Day 1')).toHaveLength(1);
  });

  it('does not promote a next session while progress is loading and keeps every day visibly unknown', () => {
    mockProgressLoading = true;
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<PlansScreen />); });

    expect(renderer.root.findAllByProps({ children: 'Next session' })).toHaveLength(0);
    expect(renderer.root.findByProps({ children: 'Day 1 status unknown' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'Day 2 status unknown' })).toBeTruthy();
  });

  it.each([
    ['profile', 'fetching'],
    ['profile', 'paused'],
    ['plan', 'fetching'],
    ['plan', 'paused'],
    ['progress', 'fetching'],
    ['progress', 'paused'],
  ] as const)('keeps cached days unknown while %s is %s', (source, state) => {
    if (source === 'profile') {
      mockProfileFetching = state === 'fetching';
      mockProfileFetchStatus = state;
    } else if (source === 'plan') {
      mockPlanFetching = state === 'fetching';
      mockPlanFetchStatus = state;
    } else {
      mockProgressFetching = state === 'fetching';
      mockProgressFetchStatus = state;
    }

    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<PlansScreen />); });

    expect(renderer.root.findAllByProps({ children: 'Next session' })).toHaveLength(0);
    expect(renderer.root.findByProps({ children: 'Day 1 status unknown' })).toBeTruthy();
    expect(renderer.root.findByProps({ children: 'Day 2 status unknown' })).toBeTruthy();
  });

  it('never gives a template session a logger start action', () => {
    mockPlanSource = 'template';
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<PlansScreen />); });
    expect(renderer.root.findByProps({ children: 'Training template' })).toBeTruthy();
    expect(renderer.root.findAllByProps({ children: 'Next session' })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ accessibilityLabel: 'Start Day 1' })).toHaveLength(0);
  });

  it('waits for last-seen hydration before marking rendered assigned data as seen', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<PlansScreen />); });
    expect(mockMarkSeen).not.toHaveBeenCalled();
    mockProvenanceReady = true;
    act(() => renderer.update(<PlansScreen />));
    expect(mockMarkSeen).toHaveBeenCalledTimes(1);
  });

  it('keeps plan and progress retries distinct', () => {
    mockWorkoutPlanError = true;
    mockProgressError = true;
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<PlansScreen />); });
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Retry training plan' }).props.onPress());
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Retry training history' }).props.onPress());
    expect(mockPlanRefetch).toHaveBeenCalledTimes(1);
    expect(mockProgressRefetch).toHaveBeenCalledTimes(1);
  });
});
