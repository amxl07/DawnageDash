// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import PlansScreen from './plans';

const mockMarkSeen = jest.fn();
const mockMealRefetch = jest.fn();
let mockProvenanceReady = false;
let mockMealError = false;
let mockMealLoading = false;
let mockWorkoutPlanLoading = false;

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('lucide-react-native', () => ({ ClipboardList: 'ClipboardList', Utensils: 'Utensils' }));
jest.mock('@/components/coach/CoachBadge', () => ({ CoachBadge: () => null }));
jest.mock('@/components/plans/PlanDayCard', () => ({ PlanDayCard: () => null }));
jest.mock('@/components/ui', () => {
  const native = jest.requireActual('react-native');
  return {
    Card: native.View,
    EmptyState: () => null,
    ErrorState: ({ onRetry }: { onRetry: () => void }) => (
      <native.Pressable accessibilityRole="button" accessibilityLabel="Retry" onPress={onRetry} />
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
    data: {
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
  }),
}));
jest.mock('@/hooks/usePlanProgress', () => ({
  usePlanProgress: () => ({
    statuses: { 1: 'today' },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
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
    const retry = renderer.root.findByProps({ accessibilityLabel: 'Retry' });
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
});
