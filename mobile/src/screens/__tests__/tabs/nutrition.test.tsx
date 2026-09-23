import { act, create } from 'react-test-renderer';

import NutritionScreen from '../../../../app/(app)/(tabs)/nutrition';

const mockMealRefetch = jest.fn();
const mockProfileRefetch = jest.fn();
let mockMealError = false;
let mockMealMissing = false;
let mockProfileError = false;

jest.mock('lucide-react-native', () => ({ Utensils: () => null }));
jest.mock('@/components/ui', () => {
  const native = jest.requireActual('react-native');
  return {
    Card: native.View,
    EmptyState: ({ title }: { title: string }) => <native.Text>{title}</native.Text>,
    ErrorState: ({ title, onRetry, retryLabel }: { title: string; onRetry: () => void; retryLabel: string }) => (
      <native.View>
        <native.Text>{title}</native.Text>
        <native.Pressable accessibilityLabel={retryLabel} onPress={onRetry} />
      </native.View>
    ),
    Screen: native.View,
    SkeletonCard: () => null,
    Text: native.Text,
  };
});
jest.mock('@/hooks/usePlans', () => ({
  parseSupplements: () => [{ id: 'supp-1', name: 'Vitamin D', serving: '1 capsule', timing: 'Morning' }],
  useMealPlan: () => ({
    data: mockMealMissing ? undefined : {
      pointer: { calories: 2200, dietType: 'vegetarian' },
      meals: [{ meal_type: 'Breakfast', description: 'Oats', calories: 500, protein: 25, carbs: 70, fats: 12 }],
    },
    isLoading: false,
    isError: mockMealError,
    refetch: mockMealRefetch,
  }),
  useUserProfile: () => ({
    data: {
      supplements_data: '[]',
      nutrition_note: 'Keep meals consistent.',
      cardio_note: 'Walk after lunch.',
      steps_note: null,
    },
    isLoading: false,
    isError: mockProfileError,
    refetch: mockProfileRefetch,
  }),
}));
jest.mock('@/theme', () => ({
  spacing: { xs: 4, sm: 8, md: 12, lg: 24 },
  useTheme: () => ({ colors: { border: '#ddd' } }),
}));

describe('Nutrition route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMealError = false;
    mockMealMissing = false;
    mockProfileError = false;
  });

  it('keeps meal targets, supplements and coach notes together', () => {
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<NutritionScreen />); });
    const text = renderer.root.findAll((node) => typeof node.type === 'string')
      .map((node) => node.children.filter((child) => typeof child === 'string').join(''))
      .filter(Boolean).join('\n');
    expect(text).toContain('2200 kcal · vegetarian');
    expect(text).toContain('Oats');
    expect(text).toContain('Vitamin D');
    expect(text).toContain('Keep meals consistent.');
    expect(text).toContain('Walk after lunch.');
  });

  it('keeps cached meal content visible and retries only the failed meal query', () => {
    mockMealError = true;
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<NutritionScreen />); });
    expect(renderer.root.findByProps({ children: 'Oats' })).toBeTruthy();
    act(() => renderer.root.findByProps({ accessibilityLabel: 'Retry meal plan' }).props.onPress());
    expect(mockMealRefetch).toHaveBeenCalledTimes(1);
    expect(mockProfileRefetch).not.toHaveBeenCalled();
  });

  it('shows the existing no-plan state when no meal assignment is available', () => {
    mockMealMissing = true;
    let renderer!: ReturnType<typeof create>;
    act(() => { renderer = create(<NutritionScreen />); });
    expect(renderer.root.findByProps({ children: 'No meal plan yet' })).toBeTruthy();
  });
});
