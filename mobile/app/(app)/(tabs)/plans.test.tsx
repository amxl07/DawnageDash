// @ts-expect-error react-test-renderer has no bundled declarations in this app.
import { act, create } from 'react-test-renderer';

import PlansScreen from './plans';

const mockMarkSeen = jest.fn();
let mockProvenanceReady = false;

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('lucide-react-native', () => ({ ClipboardList: 'ClipboardList', Utensils: 'Utensils' }));
jest.mock('@/components/coach/CoachBadge', () => ({ CoachBadge: () => null }));
jest.mock('@/components/plans/PlanDayCard', () => ({ PlanDayCard: () => null }));
jest.mock('@/components/ui', () => {
  const native = jest.requireActual('react-native');
  return {
    Card: native.View,
    EmptyState: () => null,
    ErrorState: () => null,
    Screen: native.View,
    SegmentedControl: () => null,
    SkeletonCard: () => null,
    Text: native.Text,
  };
});
jest.mock('@/hooks/usePlans', () => ({
  parseSupplements: () => [],
  useMealPlan: () => ({ data: null, isLoading: false }),
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
          exercises: [],
          notes: null,
          updated_at: '2026-08-29T10:00:00.000Z',
        },
      ],
    },
    isLoading: false,
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
  spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 24 },
  useTheme: () => ({ colors: { border: '#ddd', primary: '#05f' } }),
}));

describe('PlansScreen plan provenance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProvenanceReady = false;
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
});
