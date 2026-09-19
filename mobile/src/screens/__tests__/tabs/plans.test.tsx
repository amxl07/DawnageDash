import { act, create } from 'react-test-renderer';

import PlansScreen from '../../../../app/(app)/(tabs)/plans';

const mockMarkSeen = jest.fn();
const mockMealRefetch = jest.fn();
let mockProvenanceReady = false;
let mockMealError = false;
let mockMealLoading = false;
let mockWorkoutPlanLoading = false;
let mockWorkoutPlanError = false;
let mockWorkoutPlanMissing = false;
let mockPlanSource = 'user';
let mockProgressError = false;
const mockPlanRefetch = jest.fn();
const mockProgressRefetch = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('lucide-react-native', () => ({ ClipboardList: 'ClipboardList', Utensils: 'Utensils' }));
jest.mock('@/components/coach/CoachBadge', () => ({ CoachBadge: () => null }));
jest.mock('@/components/plans/ExercisePrescriptionSheet', () => {
  const native = jest.requireActual('react-native');
  return {
    ExercisePrescriptionSheet: ({ visible, exercise }: {
      visible: boolean;
      exercise: { name: string } | null;
    }) => visible ? <native.View testID="exercise-prescription" accessibilityLabel={exercise?.name} /> : null,
  };
});
jest.mock('@/components/plans/PlanDayCard', () => {
  const native = jest.requireActual('react-native');
  return {
    PlanDayCard: ({ day, onShowDetails, onStart }: {
      onStart?: () => void;
      day: { exercises: { id: string; name: string }[] };
      onShowDetails: (exercise: { id: string; name: string }) => void;
    }) => (
      <native.View testID="plan-day-card">
        {onStart ? <native.Pressable accessibilityLabel="Start Day 1" onPress={onStart} /> : null}
        {day.exercises.map((exercise) => (
          <native.Pressable
            key={exercise.id}
            accessibilityRole="button"
            accessibilityLabel={`Show details for ${exercise.name}`}
            onPress={() => onShowDetails(exercise)}
            style={{ minWidth: 44, minHeight: 44 }}
          />
        ))}
      </native.View>
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
jest.mock('@/components/ui', () => {
  const native = jest.requireActual('react-native');
  return {
    Card: native.View,
    EmptyState: () => null,
    ErrorState: ({ onRetry, retryLabel = 'Retry' }: { onRetry: () => void; retryLabel?: string }) => (
      <native.Pressable accessibilityRole="button" accessibilityLabel={retryLabel} onPress={onRetry} />
    ),
    Screen: native.View,
    SegmentedControl: ({
      onChange,
      segments,
    }: {
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
  parseSupplements: () => [],
  useMealPlan: () => ({
    data: {
      pointer: { calories: 2200, dietType: 'vegetarian' },
      meals: [],
    },
    isLoading: mockMealLoading,
    isError: mockMealError,
    refetch: mockMealRefetch,
  }),
  useUserProfile: () => ({
    data: {
      active_workout_plan: JSON.stringify({
        level: 'beginner',
        workoutType: 'strength',
        subCategory: null,
        daysPerWeek: 1,
      }),
      training_note: null,
      cardio_note: null,
      steps_note: null,
      nutrition_note: null,
      supplements_data: null,
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
  useWorkoutPlan: () => ({
    data: mockWorkoutPlanMissing ? undefined : {
      source: mockPlanSource,
      days: [
        {
          id: 'day-1',
          day_number: 1,
          focus: 'Full body',
          exercises: [
            {
              id: 'squat',
              name: 'Squat',
              sets: 3,
              reps: '8',
              warmupSets: 0,
              substitutions: [],
            },
          ],
          notes: null,
          updated_at: '2026-08-29T10:00:00.000Z',
        },
      ],
    },
    isLoading: mockWorkoutPlanLoading,
    isError: mockWorkoutPlanError,
    refetch: mockPlanRefetch,
  }),
}));
jest.mock('@/hooks/usePlanProgress', () => ({
  usePlanProgress: () => ({
    statuses: { 1: 'today' },
    isLoading: false,
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
  HIT_SLOP_MIN: 44,
  spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 24 },
  useTheme: () => ({ colors: { border: '#ddd', primary: '#05f' } }),
}));

describe('PlansScreen plan provenance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProvenanceReady = false;
    mockMealError = false;
    mockMealLoading = false;
    mockWorkoutPlanLoading = false;
    mockWorkoutPlanError = false;
    mockWorkoutPlanMissing = false;
    mockProgressError = false;
    mockPlanSource = 'user';
  });

  it('waits for last-seen hydration before marking rendered Training data as seen', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<PlansScreen />);
    });

    expect(mockMarkSeen).not.toHaveBeenCalled();

    mockProvenanceReady = true;
    act(() => renderer.update(<PlansScreen />));

    expect(mockMarkSeen).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });

  it('does not let a Nutrition failure block healthy Training content', () => {
    mockMealError = true;
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<PlansScreen />);
    });

    expect(renderer.root.findByProps({ children: 'Your plan' })).toBeTruthy();
    expect(
      renderer.root.findAll(
        (node: { props: { accessibilityLabel?: string } }) =>
          node.props.accessibilityLabel === 'Retry',
      ),
    ).toHaveLength(0);
  });

  it('gives the Plans Details action a 44 point target in both dimensions', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<PlansScreen />);
    });

    const details = renderer.root.findByProps({ accessibilityLabel: 'Show details for Squat' });
    expect(details.props.style).toMatchObject({ minWidth: 44, minHeight: 44 });
  });

  it('keeps prescription access inside the day card without a duplicate exercise list', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<PlansScreen />);
    });

    expect(renderer.root.findAllByProps({ children: 'Exercise details' })).toHaveLength(0);
    const detailActionHosts = renderer.root.findAll(
      (node) => typeof node.type === 'string'
        && node.props.accessibilityRole === 'button'
        && node.props.accessibilityLabel === 'Show details for Squat',
    );
    expect(detailActionHosts).toHaveLength(1);
    const detailAction = renderer.root.find(
      (node) => typeof node.type !== 'string'
        && node.props.accessibilityLabel === 'Show details for Squat'
        && typeof node.props.onPress === 'function',
    );

    act(() => {
      detailAction.props.onPress();
    });
    expect(renderer.root.findByProps({ testID: 'exercise-prescription' }).props.accessibilityLabel)
      .toBe('Squat');
  });

  it('shows Nutrition errors and wires Retry to the meal query', () => {
    mockMealError = true;
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<PlansScreen />);
    });

    act(() => renderer.root.findByProps({ accessibilityLabel: 'Nutrition' }).props.onPress());
    expect(renderer.root.findByProps({ children: 'Your plan' })).toBeTruthy();
    expect(renderer.root.findByProps({ accessibilityLabel: 'Training' })).toBeTruthy();
    expect(renderer.root.findByProps({ accessibilityLabel: 'Nutrition' })).toBeTruthy();
    const retry = renderer.root.findByProps({ accessibilityLabel: 'Retry meal plan' });
    act(() => retry.props.onPress());

    expect(mockMealRefetch).toHaveBeenCalledTimes(1);

    act(() => renderer.root.findByProps({ accessibilityLabel: 'Training' }).props.onPress());
    expect(renderer.root.findByProps({ children: 'Assigned plan' })).toBeTruthy();
    expect(
      renderer.root.findAll(
        (node: { props: { accessibilityLabel?: string } }) =>
          node.props.accessibilityLabel === 'Retry',
      ),
    ).toHaveLength(0);
  });

  it('does not let Training loading block healthy Nutrition content', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<PlansScreen />);
    });

    mockWorkoutPlanLoading = true;
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Nutrition' }).props.onPress());
    expect(renderer.root.findByProps({ children: 'Daily target' })).toBeTruthy();
  });

  it('keeps the switch and healthy Nutrition available after a progress failure', () => {
    mockProgressError = true;
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<PlansScreen />); });
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Retry training history' }).props.onPress());
    expect(mockProgressRefetch).toHaveBeenCalledTimes(1);
    expect(mockPlanRefetch).not.toHaveBeenCalled();
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Nutrition' }).props.onPress());
    expect(renderer.root.findByProps({ children: 'Daily target' })).toBeTruthy();
  });

  it('reports an initial plan query failure and retries that query', () => {
    mockWorkoutPlanError = true;
    mockWorkoutPlanMissing = true;
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<PlansScreen />); });
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Retry training plan' }).props.onPress());
    expect(mockPlanRefetch).toHaveBeenCalledTimes(1);
    expect(mockProgressRefetch).not.toHaveBeenCalled();
    expect(renderer.root.findByProps({ accessibilityLabel: 'Nutrition' })).toBeTruthy();
  });

  it('keeps cached plan details visible when refresh fails', () => {
    mockWorkoutPlanError = true;
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<PlansScreen />); });
    expect(renderer.root.findByProps({ accessibilityLabel: 'Show details for Squat' })).toBeTruthy();
    expect(renderer.root.findByProps({ accessibilityLabel: 'Retry training plan' })).toBeTruthy();
  });

  it('presents global template exercises as a preview without a logger start', () => {
    mockPlanSource = 'template';
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<PlansScreen />); });
    expect(renderer.root.findByProps({ children: 'Training template' })).toBeTruthy();
    expect(renderer.root.findAllByProps({ children: 'Assigned plan' })).toHaveLength(0);
    expect(renderer.root.findAllByProps({ accessibilityLabel: 'Start Day 1' })).toHaveLength(0);
    expect(renderer.root.findByProps({ accessibilityLabel: 'Show details for Squat' })).toBeTruthy();
  });

});

it('gives simultaneous training failures distinct accessible retry names', () => {
  mockWorkoutPlanError = true;
  mockProgressError = true;
  let renderer!: ReturnType<typeof create>;
  act(() => { renderer = create(<PlansScreen />); });
  act(() => renderer.root.findByProps({ accessibilityLabel: 'Retry training plan' }).props.onPress());
  act(() => renderer.root.findByProps({ accessibilityLabel: 'Retry training history' }).props.onPress());
  expect(mockPlanRefetch).toHaveBeenCalled();
  expect(mockProgressRefetch).toHaveBeenCalled();
});
